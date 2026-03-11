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
| `/` | Feed — SSR chronological grid of hosted memes |
| `/create` | Editor — client-only, dynamic import with `ssr: false` |
| `/m/[id]` | Viewer — SSR, OG tags, copy link, report |
| `/dmca` | DMCA policy + takedown form |
| `/api/upload` | POST — receive image, moderate, store, return URL |
| `/api/report` | POST — flag an image for review |

---

## Key Features

- **Image import** — Paste from clipboard, drag-and-drop, or file picker
- **Text nodes** — Place text anywhere, style with bold/italic, color, outline, font size
- **Transform controls** — Drag, resize, rotate any node via Konva Transformer
- **Crop tool** — Crop images to a rectangular region (rotation must be 0)
- **Canvas resize** — Drag edge/corner handles to resize the canvas bounds
- **Layer panel** — Reorder nodes via drag-and-drop; select/delete from panel
- **Undo/Redo** — Up to 50 steps of history
- **Export** — Save as PNG or copy to clipboard
- **Upload & Share** — Upload finished meme to Cropt, get a shareable link
- **Session persistence** — Auto-saves to localStorage; restores on reload
- **Leave warning** — Prompts before losing unsaved work (back button, browser close)
- **PWA** — Installable, standalone display, portrait orientation

---

## Domain Language

| Term | Meaning |
|------|---------|
| **Node** | A canvas element — either `image` or `text` type |
| **Stage** | The Konva Stage; the zoomable/pannable viewport |
| **Canvas** | The logical document bounds (white/black/transparent background) |
| **Transformer** | Konva's resize/rotate handles shown on selected node |
| **Crop mode** | UI state where user drags a rectangle to crop an image |
| **Resize mode** | UI state where canvas edge handles are shown |
| **Text place mode** | UI state where next tap places a new text node |
| **Text edit mode** | Inline editing a text node via HTML textarea overlay |
| **Upload** | A hosted meme — row in `uploads` table + file in R2 |

---

## Project Structure

```
src/
├── app/
│   ├── globals.css              # Tailwind imports + global styles
│   ├── layout.tsx               # Root layout — fonts, PWA meta, head tags
│   ├── page.tsx                 # Redirects / → /create (until feed is built)
│   ├── create/
│   │   └── page.tsx             # Editor shell — dynamic import ssr:false
│   ├── m/[id]/
│   │   └── page.tsx             # Viewer — SSR + OG tags
│   ├── dmca/
│   │   └── page.tsx             # DMCA policy
│   └── api/
│       ├── upload/route.ts      # POST /api/upload
│       └── report/route.ts      # POST /api/report
├── components/
│   ├── editor/                  # All editor code (client-only)
│   │   ├── App.jsx              # Main editor component
│   │   ├── Canvas/
│   │   │   ├── CanvasStage.jsx
│   │   │   ├── ImageNode.jsx
│   │   │   ├── TextNode.jsx
│   │   │   ├── TransformWrapper.jsx
│   │   │   ├── CropOverlay.jsx
│   │   │   ├── CanvasResizeHandles.jsx
│   │   │   └── TextEditOverlay.jsx
│   │   ├── Toolbar/
│   │   │   ├── TopBar.jsx
│   │   │   └── BottomToolbar.jsx
│   │   ├── LayerPanel/
│   │   │   ├── LayerPanel.jsx
│   │   │   └── LayerItem.jsx
│   │   ├── hooks/
│   │   │   ├── useCanvasState.js
│   │   │   ├── useImageImport.js
│   │   │   ├── useExport.js
│   │   │   ├── useInstallPrompt.js
│   │   │   ├── useSessionPersistence.js
│   │   │   └── useBackGuard.js
│   │   └── utils/
│   │       └── canvasUtils.js
│   ├── feed/                    # Feed components (Phase 6)
│   └── viewer/                  # Viewer components (Phase 5)
└── lib/
    ├── schema.ts                # Drizzle schema — uploads table
    ├── db.ts                    # Neon + Drizzle client
    ├── r2.ts                    # Cloudflare R2 S3 client
    └── rekognition.ts           # AWS Rekognition moderation client
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
| `R2_BUCKET_NAME` | `cropt-uploads` |
| `R2_PUBLIC_URL` | Public R2 URL for serving images |
| `AWS_ACCESS_KEY_ID` | IAM user key for Rekognition |
| `AWS_SECRET_ACCESS_KEY` | IAM user secret for Rekognition |
| `AWS_REGION` | `us-east-1` |

---

## Deployment

**Automatic:** Merging a PR to `main` triggers a production deployment via Vercel's GitHub integration.

**Manual:**
```bash
vercel --prod
```

**Production URL:** https://cropt.app

---

## Versioning

The project uses **SemVer** (MAJOR.MINOR.PATCH):
- **PATCH** — Bug fixes
- **MINOR** — New features (backwards compatible)
- **MAJOR** — Breaking changes

Current version is in `package.json` and displayed in the app's overflow menu (`v{version}`).

---

## Known Limitations

1. **Export canvas blink** — Brief flash when exporting due to transform reset; proper fix requires offscreen canvas rendering.
2. **Desktop PWA Cmd+Q** — macOS force-quit bypasses `beforeunload`. OS-level limitation.
3. **iOS PWA swipe-close** — Cannot intercept swipe-to-close gesture. OS-level limitation.
4. **Crop requires rotation=0** — Cropping a rotated image is disabled; user must flatten rotation first.

---

## Architecture Notes

### Editor (Client-Only)
All editor code lives in `src/components/editor/` and is loaded via `dynamic(..., { ssr: false })` at `/create`. Konva never runs on the server.

### State Management
All canvas state lives in `useCanvasState` hook — nodes array, canvas size, background, selection, history stacks. No external state library.

### History
Undo/redo uses snapshot-based history stored in refs. `pushHistory()` captures state before mutations; `pushSnapshot()` accepts explicit snapshots.

### Coordinate System
- **Stage coordinates** — Pan/zoom transformed; what the user sees
- **Canvas coordinates** — Logical 1:1 coordinates; where nodes actually live
- Conversion: `stageToCanvas(point, stageViewport)`

### Upload Flow
`POST /api/upload` → validate → Rekognition moderation → nanoid → R2 upload → DB insert → return share URL.

### Session Persistence
`useSessionPersistence` debounces saves (1500ms) to localStorage. Blob URLs are converted to data URLs before storage.

---

## Testing Notes

- No automated test suite yet
- Manual testing on: Chrome (desktop), Safari (iOS PWA), Chrome (Android PWA)
- Konva canvas interactions cannot be automated via typical DOM testing
