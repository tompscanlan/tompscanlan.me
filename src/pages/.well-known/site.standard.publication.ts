import type { APIRoute } from "astro";
import { fetchPublication } from "../../lib/atproto";

// standard.site publication verification: the domain answers with the AT-URI of
// its publication record, which is how readers (pckt.blog, docs.surf, ...) confirm
// that the record and tompscanlan.me belong together. Built from the record itself
// so a change to the publication's key changes this answer too.
export const GET: APIRoute = async () => {
  const publication = await fetchPublication();
  if (!publication) {
    throw new Error("No site.standard.publication record with url https://tompscanlan.me");
  }
  return new Response(publication.uri, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
};
