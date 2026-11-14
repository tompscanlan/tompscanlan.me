---
title: "Snowglobe in use: a new spaces alpha, tested and live in a few hours"
path: /blog/snowglobe-in-use
description: How I use Snowglobe, a private atproto network, to move an app and a hosted demo to Bluesky's new spaces alpha before real users meet the changes.
tags: [atproto, snowglobe, testing, build-log]
publishedAt: "2026-11-13T20:14:34.037Z"
---

Over the last year or so I built a tool I first called atproto-devnet. It runs a small atproto
network of your own in Docker. Now it's called [Snowglobe](https://snowglobe.at), it's on npm, and I
use it most days.

This post is about what that looks like in practice. I'll use this week as the example.

## What it is

A snowglobe is a private atproto network. It has its own PDS (or several), a PLC directory, a relay,
Jetstream, and a page that shows every service, account and write. One file, `snowglobe.yml`, says
what runs. Nothing in it reaches Bluesky's network.

Every service gets a real https name under `local.snowglobe.at`, with a certificate from a CA the
snowglobe makes for itself. So handles, DID documents and OAuth sign-in work the way they do on the
real network. An app only needs to take the network's addresses, like its PLC directory, as settings.

I built it because I kept wanting to try things that could hurt real users if they went wrong: a
lexicon that is still a draft, a new PDS build, a new sign-in flow.

## This week: a new spaces alpha

On November 12, Bluesky published a new build of the
[permissioned spaces alpha](https://discourse.atmosphere.community/t/atproto-spaces-alpha-updates/1129).
It renamed several methods and changed how a space's records are checked.

Three things of mine depended on the old build:

- A pull request on [atmo.rsvp](https://atmo.rsvp), an events app, that adds
  [private events](https://github.com/flo-bit/atmo-events/pull/105) using spaces.
- A [group host](https://github.com/tompscanlan/atproto-group-host) that runs groups as accounts of
  their own. It isn't official or production code, just my stand-in for whatever the real one turns
  out to be.
- [lighthouse.snowglobe.at](https://lighthouse.snowglobe.at), a hosted snowglobe where a demo of
  atmo and the group host ran on the old alpha.

The new PDS broke things in both atmo and the group host. Fixing all of it and moving lighthouse
took a few hours the next day.

Getting a snowglobe onto the new build was the easy part. Once Bluesky's new PDS image was out, I
changed the `image:` line for each PDS in `snowglobe.yml` and ran `snowglobe up` again. Every fix
below was tried against that.

This is the whole change to atmo's test network, from the pull request
([full file](https://github.com/tompscanlan/atmo-events/blob/e56ede183878bf01fe88378ed6260c332ef58d6b/snowglobe.private-events.yml),
comments trimmed). Two PDSes move to the new alpha, and a stock PDS stays beside them:

```diff
 pds:
   - name: alpha
-    image: ghcr.io/bluesky-social/atproto@sha256:f003adf7ca7cbb8ff60a4d99323fd009dfc1259b208f468f71accf0366ecab1e
+    image: ghcr.io/bluesky-social/atproto@sha256:1b3113b40eac2581b8f928bcec8840c8a0912c3a3d90bf3b965a775f8a97067a
     bare_handles: true
     invites: required
   - name: beta
-    image: ghcr.io/bluesky-social/atproto@sha256:f003adf7ca7cbb8ff60a4d99323fd009dfc1259b208f468f71accf0366ecab1e
+    image: ghcr.io/bluesky-social/atproto@sha256:1b3113b40eac2581b8f928bcec8840c8a0912c3a3d90bf3b965a775f8a97067a
     invites: required
   - name: regular
     image: ghcr.io/bluesky-social/pds:0.4.5037
```

Here is what the rest looked like.

1. Fix atmo. The new build renamed methods atmo calls, replaced the way atmo gets a credential to
   read a space, and changed how records are checked. I worked through the fixes in a local
   snowglobe whose PDSes run the new build: change the code, run the end-to-end test, see what
   broke, and go again. The test signs in through real OAuth and clicks through atmo's pages as
   several people on two PDSes. In the end, all 102 checks passed.
2. Fix the group host. The new PDS image moved the code the host builds on, and renamed several
   methods and fields it used. One break was quiet: members' own writes into a group's space
   stopped showing up on the host, because the new PDS announces a write with `notifyRepoUpdate`
   where the old build used `notifyWrite`. I fixed it the same way, in a snowglobe with the new PDS,
   rerunning the host's checks after each change until they all passed again.
3. Move the data, on a snowglobe first. The new PDS migrates its own databases when it starts, so
   after the move, putting the old image back isn't enough. I made a throwaway snowglobe on the old
   build and created events with the live version of atmo. Then I moved that PDS to the new build in
   place, the same way: a new `image:` line and `snowglobe up`. The PDS migrated the data, and the
   new atmo still read and wrote the old events. For the group host, I took a snapshot of every
   group, space, role and credential answer, upgraded it on the same data, and compared. The
   snapshot matched field by field.
4. Back up, then ship. I wrote a backup that copies every database, plus the account keys and
   blobs, and practiced restoring it on a snowglobe. Then I backed up lighthouse, republished atmo's
   space type lexicon with its new title, and moved the PDS and atmo to the new build together. The
   group host followed. By early afternoon on November 13, lighthouse was running the new release
   end to end, with all 11 of its groups intact and new private events working.

Every one of those breaks showed up on a throwaway network first, not in a user's report.

That's the point for me. An alpha can change anything from one build to the next. With a snowglobe
I can try the change on a network that behaves like the real one, break it, delete it and try again.

## Other ways I use it

- Testing group features for atmo.rsvp against lexicons that are still drafts.
- Running the spaces alpha PDS next to a current PDS, to see where they differ.
- Tests in CI that sign in through a real PDS. The
  [Statusphere example app](https://github.com/OpenMeet-Team/snowglobe/blob/main/docs/examples/statusphere.md)
  runs end to end in a snowglobe on every change to Snowglobe itself.
- Demos. On lighthouse, atmo's group and private events features run with test accounts, away from
  real users.

## Try it

You need Docker, and Node 20 or newer, on Linux or Windows with WSL 2. Someone has also run it on a
Mac with Docker Desktop.

```
npm install -g @openmeet/snowglobe
# the first run builds images, so it takes a while
snowglobe up --default
# so your browser trusts the snowglobe's certificates
snowglobe trust
```

Then open `https://snowglobe.local.snowglobe.at/`. That's the network's own page. alice and bob
already have accounts, and PDSls is there to browse their records.

[snowglobe.at](https://snowglobe.at) says more, and
[Your app in a snowglobe](https://github.com/OpenMeet-Team/snowglobe/blob/main/docs/your-app.md)
shows how to bring your own app.

## Rough edges

- No AppView or feed generator yet.
- `snowglobe trust` hasn't been tried on a Mac.
- So far it's mostly been used on my own projects. I'd like to hear what breaks for you.

## Others working on this

Other people wanted this too. Bluesky's
[dev-env](https://github.com/bluesky-social/atproto/tree/main/packages/dev-env),
[testnet](https://github.com/verdverm/testnet) and
[Atmosphere in a Box](https://tangled.org/kandake.africa/atmosphereinabox) also run atproto services
for testing. Snowglobe's focus is real https names, so OAuth works the way it does on the real
network, and one file you keep with your project.

If you're testing something on atproto, I'd like to help you get it running in a snowglobe. Reply to
me on Bluesky at [@tompscanlan.bsky.social](https://bsky.app/profile/tompscanlan.bsky.social), or
[open an issue](https://github.com/OpenMeet-Team/snowglobe/issues).
