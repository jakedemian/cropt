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
Register Cropt as a DMCA agent with the US Copyright Office — one-time, ~$6 at copyright.gov/dmca-directory. Required for full safe harbor protection. Also set up `dmca@cropt.app` email.

### Service Tooling & Visibility

| Service | CLI | MCP | Cost visibility |
|---|---|---|---|
| **Cloudflare R2** | — | ✅ Working | ✅ Yes, via MCP |
| **Vercel** | ✅ Installed (token expires) | ❌ None | ❌ No |
| **Neon** | ❌ None | ⚠️ Installed globally, never loads in sessions | ❌ No |
| **AWS Rekognition** | ✅ Configured (locked-down IAM) | ❌ None | ❌ No — needs separate billing IAM user |

**To fix:**
- **Vercel** — Re-run `vercel login` when token expires. Cost/usage not queryable regardless.
- **Neon MCP** — `https://mcp.neon.tech/mcp` — global install done, not loading in sessions. Needs investigation. Would enable querying upload counts, flagged content, etc. in chat.
- **AWS billing** — Create a second read-only IAM user with Cost Explorer access, configure as second AWS CLI profile. Then `/audit-aws` can pull real cost data.

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
