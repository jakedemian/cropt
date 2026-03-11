# Post-MVP Backlog

## High Priority

### Environment Splitting
Currently `.env.local` points directly at the production Neon database. Split into at least local dev vs prod environments before any serious development traffic hits the DB.

### DMCA Agent Registration
Register Cropt as a DMCA agent with the US Copyright Office — one-time, ~$6 at copyright.gov/dmca-directory. Required for full safe harbor protection. Also set up `dmca@cropt.app` email.

### MCP Integration
Wire up MCP servers for Neon and AWS so Claude Code sessions can directly query usage, costs, and data in plain English. Cloudflare MCP is working. AWS CLI is configured and usable as a fallback for now.

- Neon MCP: `https://mcp.neon.tech/mcp` (global install done, not loading in sessions — needs investigation)
- Cloudflare MCP: `https://mcp.cloudflare.com/mcp` ✅ working
- AWS: CLI configured and working; Billing MCP (`uvx awslabs.cost-analysis-mcp-server@latest`) not yet set up — needs `uv` installed

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
