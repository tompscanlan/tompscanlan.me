const DID = "did:plc:cfo32kiwdectu33qzoyvrxex";
const PDS = "https://enoki.us-east.host.bsky.network";

const PUBLICATION_NSID = "site.standard.publication";
const DOCUMENT_NSID = "site.standard.document";

// Canonical URL for this site's publication record. The same DID can host
// multiple site.standard.publication records (e.g. one auto-created by blento.app);
// we filter by URL so the site picks its own.
const CANONICAL_URL = "https://tompscanlan.me";

export type MarkdownContent = {
  $type: "me.tompscanlan.content.markdown";
  markdown: string;
};

export type DocumentContent = MarkdownContent | { $type: string; [k: string]: unknown };

export type PublicationRecord = {
  $type: typeof PUBLICATION_NSID;
  url: string;
  name: string;
  description?: string;
  icon?: unknown;
  basicTheme?: unknown;
};

export type DocumentRecord = {
  $type: typeof DOCUMENT_NSID;
  site: string;
  title: string;
  publishedAt: string;
  path?: string;
  description?: string;
  coverImage?: unknown;
  content?: DocumentContent;
  textContent?: string;
  tags?: string[];
  updatedAt?: string;
};

export type Document = {
  rkey: string;
  uri: string;
  cid: string;
  record: DocumentRecord;
};

type ListRecordsResponse<T> = {
  cursor?: string;
  records: Array<{ uri: string; cid: string; value: T }>;
};

async function listRecords<T>(collection: string): Promise<Array<{ uri: string; cid: string; value: T }>> {
  const all: Array<{ uri: string; cid: string; value: T }> = [];
  let cursor: string | undefined;
  do {
    const url = new URL(`${PDS}/xrpc/com.atproto.repo.listRecords`);
    url.searchParams.set("repo", DID);
    url.searchParams.set("collection", collection);
    url.searchParams.set("limit", "100");
    if (cursor) url.searchParams.set("cursor", cursor);
    const res = await fetch(url, { headers: { accept: "application/json" } });
    if (!res.ok) throw new Error(`listRecords ${collection} failed: ${res.status} ${await res.text()}`);
    const body = (await res.json()) as ListRecordsResponse<T>;
    all.push(...body.records);
    cursor = body.cursor;
  } while (cursor);
  return all;
}

const USE_LOCAL = process.env.LOCAL_CONTENT === "1";

export async function fetchPublication(): Promise<{ rkey: string; uri: string; record: PublicationRecord } | null> {
  if (USE_LOCAL) {
    const { readLocalPublication } = await import("./local");
    return readLocalPublication();
  }
  const records = await listRecords<PublicationRecord>(PUBLICATION_NSID);
  const match = records.find((r) => r.value.url === CANONICAL_URL);
  if (!match) return null;
  return { rkey: match.uri.split("/").pop()!, uri: match.uri, record: match.value };
}

export async function fetchDocuments(): Promise<Document[]> {
  if (USE_LOCAL) {
    const { readLocalDocuments } = await import("./local");
    return readLocalDocuments();
  }
  const records = await listRecords<DocumentRecord>(DOCUMENT_NSID);
  const ourSiteUri = `at://${DID}/${PUBLICATION_NSID}/`;
  return records
    .filter((r) => {
      const site = r.value.site;
      if (!site) return false;
      return site === CANONICAL_URL || site.startsWith(ourSiteUri);
    })
    .map((r) => ({ rkey: r.uri.split("/").pop()!, uri: r.uri, cid: r.cid, record: r.value }))
    .sort((a, b) => (a.record.publishedAt < b.record.publishedAt ? 1 : -1));
}

export function findByPath(docs: Document[], path: string): Document | undefined {
  return docs.find((d) => d.record.path === path);
}

export function extractMarkdown(doc: Document): string {
  const content = doc.record.content;
  if (content && content.$type === "me.tompscanlan.content.markdown") {
    return (content as MarkdownContent).markdown;
  }
  return doc.record.textContent ?? "";
}
