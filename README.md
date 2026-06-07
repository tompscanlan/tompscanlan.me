# tompscanlan.me

Personal site backed by AT Protocol. Every page on the site is a record in my PDS — there is no markdown in this repo that you read on the site. The content directory is staging input for the publish script, not the source of truth.

## Architecture

- **Content lives in PDS.** DID `did:plc:cfo32kiwdectu33qzoyvrxex` at `enoki.us-east.host.bsky.network`. Two collections:
  - `site.standard.publication` — site metadata (one record, rkey `self`)
  - `site.standard.document` — every page, with `path`, `title`, `publishedAt`, and a `content` union holding markdown
- **Lexicons:** [standard.site](https://standard.site). Same lexicons used by Leaflet.pub, Pckt.blog, Offprint.
- **Site:** [Astro](https://astro.build) static. `src/lib/atproto.ts` calls `com.atproto.repo.listRecords` at build time; pages render the records.
- **Markdown content:** stored in the `content` union as `{ $type: "me.tompscanlan.content.markdown", markdown: "..." }`. `textContent` carries a plaintext fallback for readers that don't know the custom $type.
- **Publish:** `scripts/publish.ts` — frontmatter + body in, `putRecord` out. Idempotent by `path`.
- **Hosting:** Cloudflare Pages, custom domain `tompscanlan.me`, CNAME from Route53.

## Layout

```
src/
  lib/
    atproto.ts          # PDS reader (build-time)
    markdown.ts         # marked wrapper + plaintext extraction
  layouts/
    Base.astro          # shared HTML shell
  pages/
    index.astro         # landing
    resume.astro        # renders /resume document
    blog/
      index.astro       # post list
      [...slug].astro   # per-post page
  styles/
    global.css
scripts/
  publish.ts            # CLI to publish records to PDS
content/                # staging dir for markdown to publish (NOT served)
  resume.md
  blog/
    hello.md
```

## Commands

```sh
npm install
npm run dev               # localhost:4321
npm run build             # static build to dist/
npm run preview           # serve dist/

# publishing (needs ATPROTO_HANDLE + ATPROTO_APP_PASSWORD env vars)
npm run publish:site                              # create/update publication record
npm run publish:doc content/resume.md             # publish/update a document
npm run publish:doc content/blog/hello.md
npm run publish:list                              # list current records
```

## First-time bootstrap

```sh
cp .env.example .env
# edit .env with your app password from https://bsky.app/settings/app-passwords

# load env (PowerShell)
Get-Content .env | ForEach-Object { if ($_ -match '^([^#=]+)=(.*)$') { $env:($matches[1]) = $matches[2] } }

npm run publish:site                          # creates publication
npm run publish:doc content/resume.md         # creates /resume document
npm run publish:doc content/blog/hello.md     # creates first blog post
npm run build                                 # site now builds
```

## Publishing flow

1. Write a new markdown file in `content/blog/<slug>.md` with frontmatter
2. `npm run publish:doc content/blog/<slug>.md`
3. Push to GitHub — Cloudflare Pages rebuilds and serves the new post

The publish script is path-idempotent: re-publishing a file updates the same record (and sets `updatedAt`). Records you delete locally are not removed from PDS — use `npm run publish:list` then `tsx scripts/publish.ts delete site.standard.document <rkey>`.

## Why not just put markdown in the repo?

Because then the repo is the source of truth and switching readers means migrating files. With the records in PDS, the same data can power this site, a Leaflet reader, a future Pckt mirror, or any standard.site-aware app — without touching the repo.
