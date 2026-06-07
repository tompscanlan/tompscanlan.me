---
title: Launching tompscanlan.me on AT Protocol
path: /blog/launching
publishedAt: 2026-06-06T00:00:00.000Z
description: A personal site where every page is an atproto record. Built with Astro, standard.site lexicons, and Cloudflare Pages.
tags: [atproto, build-log, standard.site]
---

This is the first post on a site that doesn't store its content in a repo.

Every page you read here — the resume, this blog post, the site config itself —
is a record in [my AT Protocol PDS](https://enoki.us-east.host.bsky.network),
fetched at build time and rendered to static HTML.

## Why

I've been building [OpenMeet](https://openmeet.net) on AT Protocol for two years.
When I sat down to put up a personal site, the markdown-files-in-a-repo pattern felt
wrong — I should be dogfooding the stack I'm building on.

So content lives in two collections:

- `site.standard.publication` — site metadata (one record)
- `site.standard.document` — every page, including this one

Both are [standard.site](https://standard.site) lexicons, used in production by
Leaflet.pub and others. The bet is that "long-form content as an atproto record"
becomes a primitive that survives any one site or reader app.

## How

The site is Astro. The interesting part is one file — `src/lib/atproto.ts` —
which calls `com.atproto.repo.listRecords` against my PDS at build time and
returns typed records. The pages are dumb: they ask for a document by path, get
back a record, and render its `content.markdown` field.

Publishing is a tiny CLI:

```
npm run publish:doc content/blog/new-post.md
```

The script reads frontmatter for metadata, takes the markdown body, and calls
`putRecord` with an `me.tompscanlan.content.markdown` content union. Idempotent
on path — re-publishing updates the same record.

## Next

The natural next step is killing the build step. A Cloudflare Worker subscribed
to the [atproto jetstream](https://github.com/bluesky-social/jetstream),
filtered to my DID, that fires the Pages deploy hook on every relevant record
change. Publish from anywhere, site updates within seconds, no git commit.
