/**
 * Local fallback: read content/ markdown files instead of fetching PDS.
 * Activated by setting LOCAL_CONTENT=1 in the environment.
 *
 * Used for fast iteration on layout and content without round-tripping
 * through the PDS. Frontmatter shape matches scripts/publish.ts.
 */
import matter from "gray-matter";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import type { Document, DocumentRecord, PublicationRecord } from "./atproto";

const DID = "did:plc:cfo32kiwdectu33qzoyvrxex";
const PUBLICATION_NSID = "site.standard.publication";
const DOCUMENT_NSID = "site.standard.document";

const SITE = {
  url: "https://tompscanlan.me",
  name: "Tom Scanlan",
  description: "Principal engineer — 25+ years building production systems. Founder of OpenMeet.",
};

const CONTENT_DIR = join(process.cwd(), "content");

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (p.endsWith(".md")) out.push(p);
  }
  return out;
}

function pathToRkey(path: string): string {
  return path.replace(/^\/+/, "").replace(/\/+/g, ".").replace(/[^a-zA-Z0-9_~.:-]/g, "-");
}

export function readLocalPublication(): { rkey: string; uri: string; record: PublicationRecord } {
  return {
    rkey: "self",
    uri: `at://${DID}/${PUBLICATION_NSID}/self`,
    record: {
      $type: PUBLICATION_NSID,
      ...SITE,
    },
  };
}

export function readLocalDocuments(): Document[] {
  const files = walk(CONTENT_DIR);
  const docs: Document[] = [];
  for (const file of files) {
    const raw = readFileSync(file, "utf8");
    const { data: fm, content: markdown } = matter(raw);
    if (!fm.title || !fm.path) continue;
    const path = fm.path.startsWith("/") ? fm.path : `/${fm.path}`;
    const rkey = pathToRkey(path);
    const record: DocumentRecord = {
      $type: DOCUMENT_NSID,
      site: `at://${DID}/${PUBLICATION_NSID}/self`,
      title: String(fm.title),
      publishedAt:
        typeof fm.publishedAt === "string"
          ? fm.publishedAt
          : fm.publishedAt instanceof Date
            ? fm.publishedAt.toISOString()
            : new Date(0).toISOString(),
      path,
      description: fm.description ? String(fm.description) : undefined,
      tags: Array.isArray(fm.tags) ? fm.tags.map(String) : undefined,
      content: {
        $type: "me.tompscanlan.content.markdown",
        markdown: markdown.trim(),
      },
    };
    docs.push({
      rkey,
      uri: `at://${DID}/${DOCUMENT_NSID}/${rkey}`,
      cid: "local",
      record,
    });
  }
  return docs.sort((a, b) => (a.record.publishedAt < b.record.publishedAt ? 1 : -1));
}
