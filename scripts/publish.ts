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
 *   rekey [--dry-run]          Move this site's documents whose record keys are not TIDs onto TID keys.
 *
 * Flags:
 *   --dry-run     rekey only: list the documents it would move, without logging in or writing.
 *   --no-deploy   After publishing, do NOT git-commit-and-push to trigger CF rebuild.
 *                 By default, successful site/doc/delete operations create an empty commit on main
 *                 and push it, which makes CF Workers Builds rebuild the site against fresh PDS state.
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
import { TID } from "@atproto/common-web";
import matter from "gray-matter";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const DID = "did:plc:cfo32kiwdectu33qzoyvrxex";
const PDS_SERVICE = "https://bsky.social";
const PUBLICATION_NSID = "site.standard.publication";
const DOCUMENT_NSID = "site.standard.document";
const PUBLICATION_RKEY = "self";

// atproto TID syntax (https://atproto.com/specs/tid). TID.is() from common-web only checks the
// length, so a 13-character slug would pass it.
const TID_PATTERN = /^[234567abcdefghij][234567abcdefghijklmnopqrstuvwxyz]{12}$/;

/**
 * A TID whose time is `iso` (TIDs count microseconds since the epoch), stepped forward a
 * microsecond at a time past any key in `taken`, so two documents with the same publishedAt
 * still get distinct keys. The chosen key is added to `taken`.
 */
function tidAt(iso: string, taken: Set<string>): string {
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) throw new Error(`publishedAt '${iso}' is not a date`);
  for (let micros = ms * 1000; ; micros++) {
    const tid = TID.fromTime(micros, 0).toString();
    if (!taken.has(tid)) {
      taken.add(tid);
      return tid;
    }
  }
}

const SITE_CONFIG = {
  url: "https://tompscanlan.me",
  name: "Tom Scanlan",
  description:
    "Principal engineer — 25+ years building production systems. Founder of OpenMeet.",
};

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

async function getExisting(
  agent: AtpAgent,
  collection: string,
  predicate: (rec: { value: Record<string, unknown> }) => boolean
): Promise<{ rkey: string; value: Record<string, unknown> } | undefined> {
  const res = await agent.com.atproto.repo.listRecords({
    repo: DID,
    collection,
    limit: 100,
  });
  const match = res.data.records.find((r) =>
    predicate(r as unknown as { value: Record<string, unknown> })
  );
  if (!match) return undefined;
  return { rkey: match.uri.split("/").pop()!, value: match.value as Record<string, unknown> };
}

/**
 * Trigger a Cloudflare rebuild by creating an empty commit and pushing.
 * CF Workers Builds (Assets-only) doesn't expose deploy hooks, so git push
 * is our trigger. No-op when --no-deploy is passed or when not on main with
 * a clean working tree.
 */
function triggerDeploy(message: string): void {
  if (process.argv.includes("--no-deploy")) {
    console.log("  (--no-deploy: skipping CF rebuild trigger)");
    return;
  }
  const run = (args: string[]) =>
    spawnSync("git", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });

  const branch = run(["rev-parse", "--abbrev-ref", "HEAD"]).stdout.trim();
  if (branch !== "main") {
    console.log(`  (on branch '${branch}', not 'main': skipping CF rebuild)`);
    return;
  }
  const dirty = run(["status", "--porcelain"]).stdout.trim();
  if (dirty) {
    console.log("  (working tree has uncommitted changes: skipping CF rebuild — commit & push manually)");
    return;
  }
  const commit = run(["commit", "--allow-empty", "-m", message]);
  if (commit.status !== 0) {
    console.log(`  (git commit failed: ${commit.stderr.trim()})`);
    return;
  }
  const push = run(["push"]);
  if (push.status !== 0) {
    console.log(`  (git push failed: ${push.stderr.trim()})`);
    return;
  }
  console.log("  → pushed empty commit; CF rebuild starting");
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
  triggerDeploy(`Republish: ${PUBLICATION_NSID} (publication metadata)`);
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
  const agent = await login();

  // If an existing record has this path, keep its rkey so updates are idempotent.
  // A new document gets a TID: site.standard.document's lexicon requires TID record keys.
  const existing = await getExisting(
    agent,
    DOCUMENT_NSID,
    (r) => (r.value as { path?: string }).path === path
  );
  const existingRkey = existing?.rkey;
  if (existingRkey && !TID_PATTERN.test(existingRkey)) {
    throw new Error(
      `${path} is stored under record key '${existingRkey}', which is not a TID; the PDS refuses ` +
        `writes to it. Run 'tsx scripts/publish.ts rekey' first, then publish again.`
    );
  }
  const finalRkey = existingRkey ?? TID.nextStr();

  // Frontmatter wins; otherwise an update keeps the record's own publishedAt, and only a
  // first publish takes "now". (Republishing used to reset the date to now every time.)
  const publishedAt =
    typeof fm.publishedAt === "string"
      ? fm.publishedAt
      : fm.publishedAt instanceof Date
        ? fm.publishedAt.toISOString()
        : typeof existing?.value.publishedAt === "string"
          ? existing.value.publishedAt
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
  triggerDeploy(`Republish: ${path} (${existingRkey ? "updated" : "new"})`);
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
  triggerDeploy(`Republish: deleted ${collection}/${rkey}`);
}

/**
 * Move this site's documents off non-TID record keys (the 2026-06 slug keys such as
 * 'resume' and 'blog.launching'). site.standard.document's lexicon requires TID keys and
 * the PDS now refuses writes to the old ones. Each move is a single applyWrites call that
 * creates the unchanged record under a new TID and deletes the old key, so the repo never
 * holds two records for one path. The documents' AT-URIs change; the site rebuild that
 * follows puts the new ones in each page's site.standard.document link tag.
 *
 * The new key's time is the document's publishedAt, not the moment of the move, so record
 * keys keep sorting by publish date.
 */
async function rekeyDocs(dryRun: boolean): Promise<void> {
  const reader = new AtpAgent({ service: "https://enoki.us-east.host.bsky.network" });
  const ourSite = `at://${DID}/${PUBLICATION_NSID}/`;
  const toMove: Array<{ rkey: string; value: Record<string, unknown> }> = [];
  const taken = new Set<string>();
  let cursor: string | undefined;
  do {
    const res = await reader.com.atproto.repo.listRecords({
      repo: DID,
      collection: DOCUMENT_NSID,
      limit: 100,
      cursor,
    });
    for (const r of res.data.records) {
      const rkey = r.uri.split("/").pop()!;
      taken.add(rkey);
      const value = r.value as Record<string, unknown>;
      const site = typeof value.site === "string" ? value.site : "";
      if (site.startsWith(ourSite) && !TID_PATTERN.test(rkey)) toMove.push({ rkey, value });
    }
    cursor = res.data.cursor;
  } while (cursor);

  if (toMove.length === 0) {
    console.log("No documents on non-TID record keys.");
    return;
  }
  const moves = toMove.map(({ rkey, value }) => ({
    rkey,
    value,
    newRkey: tidAt(String(value.publishedAt), taken),
  }));
  if (dryRun) {
    for (const { rkey, newRkey, value } of moves) {
      console.log(`  would move ${rkey} → ${newRkey}\t${value.path ?? ""}\t(publishedAt ${value.publishedAt})`);
    }
    console.log(`(--dry-run: ${moves.length} document(s), nothing written)`);
    return;
  }

  const agent = await login();
  for (const { rkey, newRkey, value } of moves) {
    await agent.com.atproto.repo.applyWrites({
      repo: DID,
      writes: [
        {
          $type: "com.atproto.repo.applyWrites#create",
          collection: DOCUMENT_NSID,
          rkey: newRkey,
          value,
        },
        {
          $type: "com.atproto.repo.applyWrites#delete",
          collection: DOCUMENT_NSID,
          rkey,
        },
      ],
    });
    console.log(`✓ ${value.path ?? ""}: ${rkey} → ${newRkey}`);
  }
  triggerDeploy(`Republish: moved ${toMove.length} document(s) to TID record keys`);
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
    case "rekey":
      await rekeyDocs(rest.includes("--dry-run"));
      break;
    default:
      console.error(
        "Usage:\n  publish.ts site\n  publish.ts doc <markdown-file>\n  publish.ts list\n  publish.ts delete <collection> <rkey>\n  publish.ts rekey [--dry-run]"
      );
      process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
