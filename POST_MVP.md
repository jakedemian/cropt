# Post-MVP Backlog

## High Priority

### Environment Splitting

Currently `.env.local` points directly at all production services. Local development writes real uploads to the production DB and R2 bucket. This needs to be split before doing any significant local dev work.

**What needs a separate dev instance:**
- **Neon** — Create a second project (e.g. `cropt-dev`) and run `npm run db:migrate` against it. Free tier supports multiple projects.
- **Cloudflare R2** — Create a second bucket (e.g. `cropt-uploads-dev`). Enable public access and note the new public URL.
- **AWS Rekognition** — Same IAM user and credentials are fine; Rekognition is stateless and has no per-environment concept.

**How to wire it up:**
- Keep `.env.local` for local dev (pointing at dev Neon + dev R2 bucket)
- Add production env vars only in the Vercel dashboard (already done)
- Update Bitwarden with two entries: `Cropt .env.local (dev)` and `Cropt .env.local (prod)`
- Update `DEV_SETUP.md` to reference the dev Bitwarden entry once this is done

### DMCA Agent Registration
✅ Done (2026-03-12) — Registered at copyright.gov/dmca-directory. Renews every 3 years (~2029). Contact: `dmca@cropt.app`.

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
