# Cropt — Claude Code Context

## Project Overview

Cropt is a **mobile-first Progressive Web App (PWA)** for creating and sharing memes. Users create memes in the editor, optionally upload them to Cropt, and share a link. The landing page is a public feed of hosted memes.

**Live URL:** https://cropt.app

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 15 (App Router) |
| Language | JavaScript (JSX) for editor, TypeScript for app/lib |
| Styling | Tailwind CSS v4 (via `@tailwindcss/postcss`) |
| Canvas | Konva.js + react-konva |
| PWA | @ducanh2912/next-pwa |
| Database | Neon (serverless Postgres) + Drizzle ORM |
| Storage | Cloudflare R2 (S3-compatible) |
| Moderation | AWS Rekognition |
| IDs | nanoid |
| Hosting | Vercel |

---

## Routes

| Route | Description |
|-------|-------------|
| `/` | Feed — SSR chronological grid of hosted memes with infinite scroll |
| `/create` | Editor — client-only, dynamic import with `ssr: false` |
| `/m/[id]` | Viewer — SSR, OG tags, copy link, report |
| `/dmca` | DMCA policy + takedown form |
| `/api/upload` | POST — receive image, moderate, store, return share URL |
| `/api/report` | POST — flag an image for review |
| `/api/feed` | GET — paginated feed via cursor (used by infinite scroll) |

---

## Key Features

- **Image import** — Paste from clipboard, drag-and-drop, or file picker; auto-downscales to 2000px max dimension
- **Text nodes** — Place text anywhere, style with bold/italic, color, outline, font size, font family
- **Transform controls** — Drag, resize, rotate any node via Konva Transformer
- **Raster/paint layers** — Named paint layers; draw on them with brush or eraser tool
- **Tool system** — Unified `activeTool` state: Move, Marquee (select), Brush, Eraser, Text
- **Marquee selection** — Draw a rectangular selection; move selected pixels on raster layers; marching-ants animation
- **Trim** — Crop an image node to a rectangular sub-region (rotation must be 0); does not affect canvas size
- **Canvas crop** — Interactively set new canvas bounds (bounded by current selection or selected node); shrinks canvas and clips all nodes on confirm
- **Canvas resize** — Drag edge/corner handles to expand or shrink the canvas bounds
- **Layer panel** — Reorder nodes via drag-and-drop; toggle visibility; select/delete; add new raster layers
- **Desktop sidebar** — Persistent panel (resizable) showing layers + document history on desktop
- **Undo/Redo** — Up to 50 in-session snapshots (Cmd/Ctrl+Z / Shift+Z)
- **Document history** — Auto-saves up to 5 documents to IndexedDB; restore previous work across sessions
- **Export** — Save as PNG (1× or 2×) or copy to clipboard; native share sheet on mobile
- **Upload & Share** — Upload finished meme to Cropt, get a shareable link
- **Session persistence** — Auto-saves current canvas to localStorage (1500ms debounce); restores on reload
- **Leave warning** — Custom dialog on back-button press (Android PWA + browsers); `beforeunload` on desktop
- **PWA** — Installable, standalone display, portrait orientation, install prompt

---

## Domain Language

| Term | Meaning |
|------|---------|
| **Node** | A canvas element — `image`, `text`, or `raster` type |
| **Image node** | A placed photo/image; supports scale, flip, rotate, trim |
| **Text node** | A placed text label; supports bold/italic, color, outline, font, size |
| **Raster node** | A paint layer backed by an offscreen HTMLCanvas; supports brush/eraser drawing |
| **Stage** | The Konva Stage; the zoomable/pannable viewport |
| **Canvas** | The logical document bounds (the white/black/transparent rectangle nodes live on) |
| **Transformer** | Konva's resize/rotate handles shown on the selected node |
| **activeTool** | The currently active editor tool: `'select'` \| `'marquee'` \| `'brush'` \| `'eraser'` \| `'text'` |
| **Move tool** (`select`) | Default tool; allows selecting, dragging, and transforming nodes |
| **Marquee tool** | Draw a rectangular selection on the canvas; can move selected pixels on raster layers |
| **Trim** | Per-image-node crop: crops an image node to a sub-region without changing canvas size (uses `CropOverlay`) |
| **Canvas crop** | Canvas-level crop: interactively shrinks the canvas bounds to a chosen area, clipping all nodes (uses `CanvasCropHandles`) |
| **Crop mode** | Internal state name for Trim mode (`cropMode` / `setCropMode`) |
| **Canvas crop mode** | Internal state name for canvas crop (`canvasCropMode`) |
| **Resize mode** | UI state where canvas edge/corner handles are shown for resizing the canvas |
| **Text place mode** | UI state (`activeTool === 'text'`) where the next canvas tap places a new text node |
| **Text edit mode** | Inline editing a text node via an HTML textarea overlay (`editingNodeId`) |
| **Marquee selection** | The finalized rect from the marquee tool (`marqueeSelection` state in App.jsx); used to bound the canvas crop |
| **Canvas crop bounds** | The maximum allowed area for the canvas crop handles — set from the marquee selection or selected node bounds at entry; handles cannot expand beyond this |
| **Upload** | A hosted meme — row in `uploads` table + file in R2 |
| **Document history** | Up to 5 full canvas states stored in IndexedDB; distinct from undo/redo |
| **Session** | The current canvas state auto-saved to localStorage; restored on next visit |

---

## Project Structure

```
src/
├── app/
│   ├── create/
│   ├── m/[id]/
│   ├── dmca/
│   └── api/
│       ├── upload/
│       ├── report/
│       └── feed/
├── components/
│   ├── editor/
│   │   ├── Canvas/
│   │   ├── Toolbar/
│   │   ├── LayerPanel/
│   │   ├── Sidebar/
│   │   ├── hooks/
│   │   └── utils/
│   ├── feed/
│   └── shared/
└── lib/
```

---

## Development Commands

```bash
npm run dev          # Start Next.js dev server (hot reload)
npm run build        # Production build
npm run start        # Start production server locally
npm run lint         # ESLint
npm run db:generate  # Generate Drizzle migration files
npm run db:migrate   # Run migrations against Neon (loads .env.local)
npm run db:studio    # Open Drizzle Studio (DB browser)
```

---

## Environment Variables

See `.env.local.example` for all required variables. Never commit `.env.local`.

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | Neon Postgres connection string |
| `R2_ACCOUNT_ID` | Cloudflare account ID |
| `R2_ACCESS_KEY_ID` | R2 API token access key |
| `R2_SECRET_ACCESS_KEY` | R2 API token secret |
| `R2_BUCKET_NAME` | `cropt-uploads` (prod) / `cropt-uploads-dev` (dev) |
| `R2_PUBLIC_URL` | Public R2 URL for serving images |
| `REKOGNITION_ACCESS_KEY_ID` | IAM user key for Rekognition |
| `REKOGNITION_SECRET_ACCESS_KEY` | IAM user secret for Rekognition |
| `REKOGNITION_REGION` | `us-east-1` (note: must NOT use `AWS_` prefix — Vercel reserves those names) |

> **Warning:** Always set env vars in the Vercel dashboard UI, never via the CLI or API with shell variable interpolation. Shell interpolation adds trailing newlines to values which silently corrupt signing headers and are very hard to debug.

---

## Deployment

**Automatic:** Pushing to `main` triggers a production deployment via Vercel's GitHub integration.

**Manual:**
```bash
vercel --prod
```

**Production URL:** https://cropt.app

## Environments

| Environment | Services | When used |
|-------------|----------|-----------|
| **Production** | Prod Neon (`cropt`), R2 `cropt-uploads` | Vercel production deployments |
| **Development** | Dev Neon (`cropt-dev`), R2 `cropt-uploads-dev` | Local dev (`.env.local`), `vercel dev` |

`DATABASE_URL`, `R2_BUCKET_NAME`, and `R2_PUBLIC_URL` differ between environments. All other vars (R2 credentials, Rekognition) are shared.

---

## Versioning

The project uses **SemVer** (MAJOR.MINOR.PATCH):
- **PATCH** — Bug fixes
- **MINOR** — New features (backwards compatible)
- **MAJOR** — Breaking changes

Current version is in `package.json` and displayed in the app's overflow menu (`v{version}`).

---

## Bug & Feature Tracking Process

Bugs and improvements/features are logged in the relevant area file (`EDITOR.md`, `FEED.md`, `SOCIAL.md`) under `Known Bugs` or `Improvements & Features` respectively.

**Rules (apply equally to bugs and features):**
- When a bug or enhancement is mentioned in any way, **first check if it's already logged**. If not, **logging it is the very first action** before any investigation or implementation.
- When resolved or shipped, mark it as **Fixed** / **Done** in the appropriate file.
- **Never delete entries.** The user will manually request cleanups.

---

## Known Limitations

1. **Export canvas blink** — Brief flash when exporting due to transform reset; proper fix requires offscreen canvas rendering.
2. **Desktop PWA Cmd+Q** — macOS force-quit bypasses `beforeunload`. OS-level limitation.
3. **iOS PWA swipe-close** — Cannot intercept swipe-to-close gesture. OS-level limitation.
4. **Trim requires rotation=0** — Trimming a rotated image is disabled; user must flatten rotation first.
5. **Raster node position** — Raster nodes default to canvas origin (0,0) and full canvas size; they are not freely repositionable like image nodes.

---

## Architecture Notes

### Editor (Client-Only)
All editor code lives in `src/components/editor/` and is loaded via `dynamic(..., { ssr: false })` at `/create`. Konva never runs on the server.

### State Management
All canvas state lives in `useCanvasState` — nodes array, canvas size, background, selection, undo/redo stacks. No external state library. `App.jsx` owns all other editor state (active tool, crop mode, text edit mode, etc.) and passes everything down via props.

### Tool System
A single `activeTool` string (`'select' | 'marquee' | 'brush' | 'eraser' | 'text'`) replaces what would otherwise be several overlapping boolean mode flags. `CanvasStage` still receives derived props (`drawMode`, `drawTool`, `textPlaceMode`) so it doesn't need to know about `activeTool` directly.

### Two Distinct History Systems
| System | Scope | Storage | Limit | Hook |
|--------|-------|---------|-------|------|
| Undo/Redo | In-session snapshots of nodes + canvas size + background | In-memory refs | 50 steps | `useCanvasState` |
| Document History | Full canvas states saved across sessions | IndexedDB (gzip-compressed) | 5 documents | `useDocumentHistory` |

`pushHistory()` captures state **before** a mutation. `pushSnapshot()` accepts an explicit snapshot — used when the caller already has the pre-mutation state (e.g. resize confirm needs the original canvas size, not the one already changed by dragging handles).

### Raster Layer System
Raster nodes are paint layers backed by offscreen `HTMLCanvasElement`s managed directly in `CanvasStage`, not by Konva. This is necessary because Konva's image update cycle isn't fast enough for real-time brush drawing.

- `rasterCanvases` (React state) — `{ [nodeId]: HTMLCanvasElement }` — used during render so RasterNode receives the correct canvas element
- `rasterCanvasRef` — mirrors `rasterCanvases` synchronously for use inside pointer event handlers (avoids stale closure issues)
- `rasterDataUrlCache` — tracks the last synced `dataUrl` per node; when a node's `dataUrl` changes externally (undo/redo), the cache miss triggers a pixel reload from the data URL
- On draw end, the canvas is serialized to a data URL and stored on the node via `updateNode` — this is what gets saved to localStorage/IndexedDB

### Trim vs Canvas Crop
These are two distinct operations that are easy to confuse:

- **Trim** (`cropMode`) — operates on a single selected **image node**. Crops the image's pixels to a sub-rectangle without touching the canvas size. The `CropOverlay` component bounds the handles to the node's rendered area.
- **Canvas Crop** (`canvasCropMode`) — operates on the **entire canvas**. Shrinks the canvas bounds to a chosen rectangle, shifting all nodes and clipping image/raster content. The `CanvasCropHandles` component bounds the handles to the initial selection (marquee or selected node bounding box); handles can only shrink, never expand beyond that initial bound.

### Coordinate System
- **Screen coordinates** — raw `clientX/clientY` from pointer events
- **Stage coordinates** — screen coords minus the stage container's `getBoundingClientRect()` offset
- **Canvas coordinates** — stage coords transformed by `stageViewport`: `canvasX = (stageX - vp.x) / vp.scale`
- **Node-local coordinates** — canvas coords relative to a node's origin and scale (used for brush drawing)

### Image Import
Images are imported as object URLs, immediately downscaled to 2000px max dimension if needed, and added as `image` nodes. Object URLs are converted to data URLs before being saved to localStorage (object URLs don't survive page reload).

### Upload Flow
`POST /api/upload` → validate size/type → Rekognition content moderation → nanoid ID → R2 upload → Postgres insert → return `/m/{id}` share URL.

### Feed
The feed (`/`) is SSR with the first 20 items. Infinite scroll is handled client-side by `FeedGrid`, which fetches `/api/feed?cursor=...` (timestamp-based cursor) as the user approaches the bottom.

### Session Persistence
`useSessionPersistence` debounces saves to localStorage (1500ms). Auto-save is skipped during canvas resize mode (size is mid-drag and not a committed value). Blob/object URLs in node `src` fields are converted to data URLs before saving.

---

## Testing Notes

- No automated test suite yet
- Manual testing on: Chrome (desktop), Safari (iOS PWA), Chrome (Android PWA)
- Konva canvas interactions cannot be automated via typical DOM testing
