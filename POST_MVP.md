# Post-MVP Backlog

## High Priority

### Environment Splitting

✅ Done (2026-03-15) — Dev and prod data are now fully isolated.

**Setup:**
- **Neon** — `cropt-dev` project (ID: `summer-mode-29296492`), schema migrated. Local `.env.local` points here.
- **Cloudflare R2** — `cropt-uploads-dev` bucket with public access enabled. Local `.env.local` points here.
- **AWS Rekognition** — Shared credentials across all environments (stateless, no per-environment concept).
- **Vercel** — Production env vars → prod services. Development env vars → dev services. See `CLAUDE.md` for details.

### DMCA Agent Registration
✅ Done (2026-03-12) — Registered at copyright.gov/dmca-directory. Renews every 3 years (~2029). Contact: `dmca@cropt.app`.

### Security & Contact Emails
Set up `security@cropt.app` and `dmca@cropt.app` via Cloudflare Email Routing, then update `CONTRIBUTING.md` to replace `jakedemian@proton.me` with `security@cropt.app`.

### Service Tooling & Visibility

See `AUDIT.md` for the service tooling table and latest audit results. Run `/audit` to refresh all services or `/audit-neon`, `/audit-r2`, `/audit-aws`, `/audit-vercel` individually.

---

## Known Bugs

- **Export/Copy canvas blink** — Brief flash when exporting. Root cause: resetting the Konva stage transform triggers a layer redraw the browser paints before the restore runs. Proper fix: capture via an offscreen canvas bypassing the stage transform entirely.

- **Desktop PWA Cmd+Q doesn't trigger leave warning** — macOS Cmd+Q force-quits before `beforeunload` fires. OS-level limitation; no clean fix.

- **iOS PWA swipe-close** — Cannot intercept the swipe-to-close gesture. OS-level limitation.

- **Crop requires rotation = 0** — Cropping a rotated image is disabled. User must flatten rotation first.

---

## v2+ Ideas

### Editor
- Multi-document tabs
- Drawing / brush tools
- Filters and color adjustments
- Undo history beyond 50 steps

### Feed & Social
- User accounts + upload ownership
- Votes / reactions
- Comments
- Tags and search
- User profiles / galleries
- Meme templates library
- Featured / trending algorithm
- View counts

### Infrastructure
- CDN custom domain (`cdn.cropt.app`) for R2 public URLs
- PhotoDNA integration (CSAM hash matching)
- Android / iOS native app wrapper

---

## Long-Term Vision

### Feed-Based Social Platform + Open Source Angle

The core idea: build a feed-based social community platform with a built-in meme editor, targeting users who are dissatisfied with existing feed-based social sites and apps. Differentiate on **transparency** — fully open source codebase, so users can verify for themselves that no shady data collection is happening.

**The pitch:** "We show you our source code. You know exactly what we collect, because you can read it."

This is a credible claim that most mainstream social platforms can never make. Pairs naturally with the existing DMCA policy and general "we do things right" ethos.

**Key features to think about:**
- Community-based feeds with UX improvements over existing feed-based social sites and apps (TBD — specific pain points to address)
- Built-in meme editor as a first-class feature, not an afterthought
- Open source repo with clean, auditable code — no obfuscated analytics, no hidden third-party tracking SDKs
- Privacy as a core value, not a marketing afterthought

**Why this could work:**
- Many users are dissatisfied with the direction of existing feed-based social platforms
- Open source as a trust signal is underused in consumer social apps
- The meme editor gives Cropt a unique hook that a plain social clone wouldn't have
- Open source contributors could accelerate v2+ feature development

### User Acquisition & Cold Start Strategy

The core advantage: the editor is useful before any community exists. Unlike pure social networks, Cropt has a standalone tool that works on day one with zero other users. That's the wedge.

**Phase 1 — Tool first, community second**
Don't launch a social network. Launch the best meme editor on the web. Make it so good people use it just to create, even if they never post publicly. Every share to an external platform is a free impression. The feed is a bonus, not the product.

**Phase 2 — Seed the feed yourself**
The feed can't look dead in the early days. Actively create and post quality content. Five genuinely funny memes is better than fifty mediocre ones. Rope in trusted friends to help seed.

**Phase 3 — Find the first real community**
Don't chase a million users — find a few hundred passionate early adopters. The open source / privacy angle is the best acquisition channel here: Hacker News, dev communities, privacy-focused forums. These people care about "we show you the code," give honest feedback, and are talkers — they'll bring others.

**Phase 4 — Viral loops**
Every meme shared externally should make it obvious where it came from. Subtle watermark or branding, clean OG preview, a "make your own at cropt.app" call to action on the viewer page. Each share is an ad.

**Editor as the long-term hook**
A genuinely superior editor is the highest-leverage investment. If Cropt is the most fun and capable meme creation tool available — especially on mobile — people come for the tool and stay for the community. Think about what meme creation is currently missing: templates, text effects, AI-assisted captions, reaction image search, etc.

### Governance Model

Follows the Linux kernel governance model:

- **Top-level maintainer (Jake)** — sets direction, resolves disputes, has final say
- **Area maintainers** — trusted contributors who earn merge rights over a specific area (editor, API, feed, etc.) through consistent, high-quality contributions
- **Contributors** — anyone can submit a PR; it routes to the relevant area maintainer first

Maintainer status is earned by track record, not appointed. The criteria are documented in `CONTRIBUTING.md` so the path is transparent and merit-based. This prevents the "one person controls everything" concern while keeping quality high.

The goal over time is a squad of trusted maintainers who run day-to-day merges independently, with Jake operating at the top level only.
