#!/usr/bin/env tsx
/**
 * Publish records to Tom's PDS using standard.site lexicons.
 *
 * Auth via env vars (NEVER commit these):
 *   ATPROTO_HANDLE        e.g. tompscanlan.bsky.social
 *   ATPROTO_APP_PASSWORD  app password from bsky.app/settings/app-passwords
 *
 * Subcommands:
 *   site                       Create/update the site.standard.publication record (rkey=self).
 *   doc <markdown-file>        Create/update a site.standard.document from a .md file with frontmatter.
 *   list                       List all publication + document records currently in the PDS.
 *   delete <collection> <rkey> Delete a record.
 *
 * Document markdown frontmatter (all optional except marked):
 *   ---
 *   title: My Post                          # required
 *   path: /blog/my-post                     # required — also becomes the URL
 *   publishedAt: 2026-06-06T00:00:00.000Z   # optional (defaults to now on first publish)
 *   description: One-line excerpt
 *   tags: [atproto, build-log]
 *   ---
 */
import { AtpAgent } from "@atproto/api";
import matter from "gray-matter";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const DID = "did:plc:cfo32kiwdectu33qzoyvrxex";
const PDS_SERVICE = "https://bsky.social";
const PUBLICATION_NSID = "site.standard.publication";
const DOCUMENT_NSID = "site.standard.document";
const PUBLICATION_RKEY = "self";

const SITE_CONFIG = {
  url: "https://tompscanlan.me",
  name: "Tom Scanlan",
  description:
    "Principal engineer — 25+ years building production systems. Founder of OpenMeet.",
};

function pathToRkey(path: string): string {
  return path.replace(/^\/+/, "").replace(/\/+/g, ".").replace(/[^a-zA-Z0-9_~.:-]/g, "-");
}

function extractPlainText(md: string): string {
  return md
    .replace(/```[\s\S]*?```/g, "")
    .replace(/`[^`]*`/g, "")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[#>*_~]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

async function login(): Promise<AtpAgent> {
  const handle = process.env.ATPROTO_HANDLE;
  const password = process.env.ATPROTO_APP_PASSWORD;
  if (!handle || !password) {
    console.error("ATPROTO_HANDLE and ATPROTO_APP_PASSWORD must be set.");
    process.exit(1);
  }
  const agent = new AtpAgent({ service: PDS_SERVICE });
  await agent.login({ identifier: handle, password });
  if (agent.session?.did !== DID) {
    console.error(`Logged in as ${agent.session?.did}, expected ${DID}. Aborting.`);
    process.exit(1);
  }
  return agent;
}

async function getExistingRkey(
  agent: AtpAgent,
  collection: string,
  predicate: (rec: { value: Record<string, unknown> }) => boolean
): Promise<string | undefined> {
  const res = await agent.com.atproto.repo.listRecords({
    repo: DID,
    collection,
    limit: 100,
  });
  const match = res.data.records.find((r) =>
    predicate(r as unknown as { value: Record<string, unknown> })
  );
  return match?.uri.split("/").pop();
}

async function publishSite(): Promise<void> {
  const agent = await login();
  const record = {
    $type: PUBLICATION_NSID,
    url: SITE_CONFIG.url,
    name: SITE_CONFIG.name,
    description: SITE_CONFIG.description,
  };
  const res = await agent.com.atproto.repo.putRecord({
    repo: DID,
    collection: PUBLICATION_NSID,
    rkey: PUBLICATION_RKEY,
    record,
  });
  console.log(`✓ Publication record at ${res.data.uri}`);
}

async function publishDoc(filePath: string): Promise<void> {
  const abs = resolve(filePath);
  const raw = readFileSync(abs, "utf8");
  const { data: fm, content: markdown } = matter(raw);

  if (!fm.title || typeof fm.title !== "string") {
    throw new Error(`Frontmatter missing 'title' in ${filePath}`);
  }
  if (!fm.path || typeof fm.path !== "string") {
    throw new Error(`Frontmatter missing 'path' (e.g. /blog/my-post) in ${filePath}`);
  }
  const path = fm.path.startsWith("/") ? fm.path : `/${fm.path}`;
  const rkey = pathToRkey(path);

  const agent = await login();

  // If an existing record has this path, keep its rkey so updates are idempotent.
  const existingRkey = await getExistingRkey(
    agent,
    DOCUMENT_NSID,
    (r) => (r.value as { path?: string }).path === path
  );
  const finalRkey = existingRkey ?? rkey;

  const publishedAt =
    typeof fm.publishedAt === "string"
      ? fm.publishedAt
      : fm.publishedAt instanceof Date
        ? fm.publishedAt.toISOString()
        : new Date().toISOString();

  const tags: string[] | undefined = Array.isArray(fm.tags)
    ? fm.tags.map(String)
    : typeof fm.tags === "string"
      ? fm.tags.split(",").map((s) => s.trim()).filter(Boolean)
      : undefined;

  const record: Record<string, unknown> = {
    $type: DOCUMENT_NSID,
    site: `at://${DID}/${PUBLICATION_NSID}/${PUBLICATION_RKEY}`,
    title: fm.title,
    publishedAt,
    path,
    content: {
      $type: "me.tompscanlan.content.markdown",
      markdown: markdown.trim(),
    },
    textContent: extractPlainText(markdown).slice(0, 29000),
  };
  if (fm.description) record.description = String(fm.description);
  if (tags && tags.length > 0) record.tags = tags;
  if (existingRkey) record.updatedAt = new Date().toISOString();

  const res = await agent.com.atproto.repo.putRecord({
    repo: DID,
    collection: DOCUMENT_NSID,
    rkey: finalRkey,
    record,
  });
  console.log(`✓ Document at ${res.data.uri}`);
  console.log(`  path: ${path}`);
  console.log(`  rkey: ${finalRkey} ${existingRkey ? "(updated)" : "(new)"}`);
}

async function listAll(): Promise<void> {
  const agent = new AtpAgent({ service: "https://enoki.us-east.host.bsky.network" });
  for (const collection of [PUBLICATION_NSID, DOCUMENT_NSID]) {
    const res = await agent.com.atproto.repo.listRecords({
      repo: DID,
      collection,
      limit: 100,
    });
    console.log(`\n[${collection}] ${res.data.records.length} record(s):`);
    for (const r of res.data.records) {
      const v = r.value as { title?: string; path?: string; name?: string };
      const rkey = r.uri.split("/").pop();
      console.log(`  ${rkey}\t${v.path ?? v.name ?? ""}\t${v.title ?? ""}`);
    }
  }
}

async function deleteRecord(collection: string, rkey: string): Promise<void> {
  const agent = await login();
  await agent.com.atproto.repo.deleteRecord({
    repo: DID,
    collection,
    rkey,
  });
  console.log(`✓ Deleted at://${DID}/${collection}/${rkey}`);
}

async function main(): Promise<void> {
  const [, , cmd, ...rest] = process.argv;
  switch (cmd) {
    case "site":
      await publishSite();
      break;
    case "doc":
      if (!rest[0]) throw new Error("usage: publish.ts doc <markdown-file>");
      await publishDoc(rest[0]);
      break;
    case "list":
      await listAll();
      break;
    case "delete":
      if (rest.length !== 2) {
        throw new Error("usage: publish.ts delete <collection> <rkey>");
      }
      await deleteRecord(rest[0], rest[1]);
      break;
    default:
      console.error(
        "Usage:\n  publish.ts site\n  publish.ts doc <markdown-file>\n  publish.ts list\n  publish.ts delete <collection> <rkey>"
      );
      process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
