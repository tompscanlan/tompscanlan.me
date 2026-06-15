import rss from "@astrojs/rss";
import type { APIContext } from "astro";
import { fetchDocuments } from "../lib/atproto";

export async function GET(context: APIContext) {
  const docs = await fetchDocuments();
  const posts = docs.filter((d) => d.record.path?.startsWith("/blog/"));
  return rss({
    title: "Tom Scanlan — Blog",
    description: "Writing on engineering, AT Protocol, and building OpenMeet.",
    site: context.site ?? "https://tompscanlan.me",
    items: posts.map((d) => ({
      title: d.record.title,
      description: d.record.description,
      pubDate: new Date(d.record.publishedAt),
      link: d.record.path,
      categories: d.record.tags,
    })),
    customData: "<language>en-us</language>",
  });
}
