import { Marked } from "marked";

const marked = new Marked({ gfm: true, breaks: false });

export function renderMarkdown(md: string): string {
  return marked.parse(md) as string;
}

export function extractPlainText(md: string): string {
  return md
    .replace(/```[\s\S]*?```/g, "")
    .replace(/`[^`]*`/g, "")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[#>*_~]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
