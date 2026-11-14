#!/usr/bin/env tsx
/**
 * Publish records to Tom's PDS using standard.site lexicons.
 *
 * Auth via env vars (NEVER commit these):
 *   ATPROTO_HANDLE        e.g. tompscanlan.bsky.social
 *   ATPROTO_APP_PASSWORD  app password from bsky.app/settings/app-passwords
 *
 * Subcommands:
 *   site                       Create/update the site.standard.publication record (found by url).
 *   doc <markdown-file>        Create/update a site.standard.document from a .md file with frontmatter.
 *   list                       List all publication + document records currently in the PDS.
 *   delete <collection> <rkey> Delete a record.
 *   rekey [--dry-run]          Move this site's publication and documents off non-TID record keys.
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
import { AtpAgent, type ComAtprotoRepoApplyWrites } from "@atproto/api";
import { TID } from "@atproto/common-web";
import matter from "gray-matter";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const DID = "did:plc:cfo32kiwdectu33qzoyvrxex";
const PDS_SERVICE = "https://bsky.social";
const PUBLICATION_NSID = "site.standard.publication";
const DOCUMENT_NSID = "site.standard.document";
const PDS_READ = "https://enoki.us-east.host.bsky.network";

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

type RepoRecord = { rkey: string; value: Record<string, unknown> };

/** Every record in one of this repo's collections, read from the PDS without logging in. */
async function listCollection(collection: string): Promise<RepoRecord[]> {
  const reader = new AtpAgent({ service: PDS_READ });
  const out: RepoRecord[] = [];
  let cursor: string | undefined;
  do {
    const res = await reader.com.atproto.repo.listRecords({ repo: DID, collection, limit: 100, cursor });
    for (const r of res.data.records) {
      out.push({ rkey: r.uri.split("/").pop()!, value: r.value as Record<string, unknown> });
    }
    cursor = res.data.cursor;
  } while (cursor);
  return out;
}

/** This site's publication: the record whose url is the site's (blento.app keeps another one). */
async function findPublication(): Promise<RepoRecord | undefined> {
  return (await listCollection(PUBLICATION_NSID)).find((r) => r.value.url === SITE_CONFIG.url);
}

async function publishSite(): Promise<void> {
  const agent = await login();
  const existing = await findPublication();
  if (existing && !TID_PATTERN.test(existing.rkey)) {
    throw new Error(
      `The publication is stored under record key '${existing.rkey}', which is not a TID. ` +
        `Run 'tsx scripts/publish.ts rekey' first, then publish again.`
    );
  }
  const record = {
    $type: PUBLICATION_NSID,
    url: SITE_CONFIG.url,
    name: SITE_CONFIG.name,
    description: SITE_CONFIG.description,
  };
  const res = await agent.com.atproto.repo.putRecord({
    repo: DID,
    collection: PUBLICATION_NSID,
    rkey: existing?.rkey ?? TID.nextStr(),
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
  const publication = await findPublication();
  if (!publication) {
    throw new Error(`No ${PUBLICATION_NSID} record with url ${SITE_CONFIG.url}; run 'publish.ts site' first.`);
  }

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
    site: `at://${DID}/${PUBLICATION_NSID}/${publication.rkey}`,
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
 * Move this site's records off non-TID record keys: the publication (2026-06 key 'self') and
 * documents published then under slug keys ('resume', 'blog.launching'). The lexicons require
 * TID keys and the PDS refuses writes to the old ones. Everything moves in ONE applyWrites call,
 * so the repo never holds two records for one path, or a document whose publication is gone.
 * Values are copied unchanged, except that documents point at the publication's new AT-URI
 * when it moves. The AT-URIs change; the site rebuild that follows puts the new ones in the
 * well-known file and each page's link tag.
 *
 * New keys take their time from a date, not the moment of the move, so keys sort by publish
 * date: a document's own publishedAt, and for the publication its earliest document's.
 */
async function rekey(dryRun: boolean): Promise<void> {
  const pubs = await listCollection(PUBLICATION_NSID);
  const docs = await listCollection(DOCUMENT_NSID);
  const pub = pubs.find((r) => r.value.url === SITE_CONFIG.url);
  if (!pub) throw new Error(`No ${PUBLICATION_NSID} record with url ${SITE_CONFIG.url}`);
  const oldSite = `at://${DID}/${PUBLICATION_NSID}/${pub.rkey}`;
  const ours = docs.filter((d) => d.value.site === oldSite);

  let newPubRkey = pub.rkey;
  if (!TID_PATTERN.test(pub.rkey)) {
    const earliest = ours.map((d) => String(d.value.publishedAt)).sort()[0] ?? new Date().toISOString();
    // Skip document keys too: the same string in two collections is legal but confusing.
    newPubRkey = tidAt(earliest, new Set([...pubs, ...docs].map((r) => r.rkey)));
  }
  const newSite = `at://${DID}/${PUBLICATION_NSID}/${newPubRkey}`;
  const docTaken = new Set(docs.map((d) => d.rkey));

  const writes: ComAtprotoRepoApplyWrites.InputSchema["writes"] = [];
  const plan: string[] = [];
  if (newSite !== oldSite) {
    writes.push({
      $type: "com.atproto.repo.applyWrites#create",
      collection: PUBLICATION_NSID,
      rkey: newPubRkey,
      value: pub.value,
    });
    plan.push(`publication: ${pub.rkey} → ${newPubRkey}`);
  }
  for (const d of ours) {
    const value = { ...d.value, site: newSite };
    if (!TID_PATTERN.test(d.rkey)) {
      const rkey = tidAt(String(d.value.publishedAt), docTaken);
      writes.push(
        { $type: "com.atproto.repo.applyWrites#create", collection: DOCUMENT_NSID, rkey, value },
        { $type: "com.atproto.repo.applyWrites#delete", collection: DOCUMENT_NSID, rkey: d.rkey }
      );
      plan.push(`${d.value.path}: ${d.rkey} → ${rkey}`);
    } else if (newSite !== oldSite) {
      writes.push({ $type: "com.atproto.repo.applyWrites#update", collection: DOCUMENT_NSID, rkey: d.rkey, value });
      plan.push(`${d.value.path}: ${d.rkey} now points at publication ${newPubRkey}`);
    }
  }
  if (newSite !== oldSite) {
    writes.push({ $type: "com.atproto.repo.applyWrites#delete", collection: PUBLICATION_NSID, rkey: pub.rkey });
  }

  if (writes.length === 0) {
    console.log("Nothing on non-TID record keys.");
    return;
  }
  if (dryRun) {
    for (const line of plan) console.log(`  would move ${line}`);
    console.log(`(--dry-run: ${writes.length} write(s) in one applyWrites, nothing written)`);
    return;
  }
  const agent = await login();
  await agent.com.atproto.repo.applyWrites({ repo: DID, writes });
  for (const line of plan) console.log(`✓ ${line}`);
  triggerDeploy(`Republish: moved records to TID keys (${plan.length} change(s))`);
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
      await rekey(rest.includes("--dry-run"));
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
