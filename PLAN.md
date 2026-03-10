# Cropt — Image Hosting & Feed: Implementation Plan

## Vision

Transform Cropt from a standalone editor tool into a creation + distribution platform.
Users can create memes in the editor, optionally host them on Cropt, and share a link.
The landing page is a chronological public feed of hosted memes — browse, get inspired, create.

---

## Decisions Log

| Question | Decision |
|---|---|
| Accounts | Anonymous uploads for MVP; auth/profiles are v2+ |
| Storage | Cloudflare R2 — $0.015/GB, free egress |
| Permanence | Permanent hosting (no expiry) |
| Moderation | AWS Rekognition (explicit content, high threshold) + DMCA report flow; PhotoDNA when eligible |
| Domain | `cropt.app` (already owned) |
| Architecture | Single Next.js app — editor at `/create`, feed at `/`, viewer at `/m/[id]` |
| Monorepo | Not needed — folder structure within one Next.js deployment |
| Feed scope | MVP: chronological grid, anonymous, no votes/comments/auth |
| Social features | v2+: auth, profiles, votes, comments, tags, search |

---

## Architecture Overview

```
cropt.app/              → Feed (SSR, chronological grid of hosted memes)
cropt.app/create        → Editor (client-only, dynamic import ssr:false)
cropt.app/m/[id]        → Viewer (SSR, OG tags, copy link, report button)
cropt.app/api/upload    → POST — receive image, moderate, store, return URL
cropt.app/api/report    → POST — flag an image for review
cropt.app/dmca          → DMCA policy + takedown request form
```

### Tech Stack (additions to existing)

| New Need | Choice | Reason |
|---|---|---|
| Framework | Next.js 15 (App Router) | SSR for feed/viewer OG tags, API routes, Vercel-native |
| Storage | Cloudflare R2 | Cheapest viable option, free egress, S3-compatible SDK |
| Database | Neon (Postgres) | Serverless Postgres, generous free tier, works with Vercel |
| ORM | Drizzle ORM | Lightweight, type-safe, great with Neon |
| Moderation | AWS Rekognition | Per-image cost ~$0.001, 5k/mo free tier |
| ID generation | nanoid | Short URL-safe IDs (e.g. `V1StGXR8`) for share URLs |
| PWA (Next.js) | @ducanh2912/next-pwa | Drop-in replacement for vite-plugin-pwa in Next.js |

---

## Database Schema

```sql
CREATE TABLE uploads (
  id           TEXT PRIMARY KEY,           -- nanoid, 10 chars, URL-safe
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  r2_key       TEXT NOT NULL,              -- e.g. "uploads/V1StGXR8.png"
  size_bytes   INTEGER,
  width        INTEGER,                    -- stored to prevent feed layout shift
  height       INTEGER,
  mime_type    TEXT DEFAULT 'image/png',
  flagged      BOOLEAN DEFAULT FALSE,      -- set true by moderation or report
  report_count INTEGER DEFAULT 0
);

CREATE INDEX uploads_created_at_idx ON uploads (created_at DESC);
CREATE INDEX uploads_flagged_idx ON uploads (flagged);
```

---

## Project File Structure (post-migration)

```
cropt/
├── src/
│   ├── app/
│   │   ├── page.tsx                  ← Feed (SSR)
│   │   ├── create/
│   │   │   └── page.tsx              ← Editor shell (ssr:false wrapper)
│   │   ├── m/[id]/
│   │   │   └── page.tsx              ← Viewer (SSR + OG tags)
│   │   ├── dmca/
│   │   │   └── page.tsx              ← DMCA policy + takedown form
│   │   └── api/
│   │       ├── upload/
│   │       │   └── route.ts          ← POST /api/upload
│   │       └── report/
│   │           └── route.ts          ← POST /api/report
│   ├── components/
│   │   ├── editor/                   ← All migrated editor components/hooks
│   │   │   ├── App.jsx               ← (was src/App.jsx)
│   │   │   ├── Canvas/
│   │   │   ├── Toolbar/
│   │   │   ├── LayerPanel/
│   │   │   └── hooks/
│   │   ├── feed/
│   │   │   ├── FeedGrid.tsx
│   │   │   └── FeedItem.tsx
│   │   └── viewer/
│   │       └── ViewerPage.tsx
│   ├── lib/
│   │   ├── db.ts                     ← Neon + Drizzle client
│   │   ├── r2.ts                     ← Cloudflare R2 S3 client
│   │   ├── rekognition.ts            ← AWS Rekognition client
│   │   └── schema.ts                 ← Drizzle schema
├── public/
├── next.config.js
└── package.json
```

---

## Phases

---

### Phase 0 — Repo Reset & Rename

**Goal:** Clean slate under the Cropt name. Ditch meme-canvas git history.

Steps:
1. Rename local folder `meme-canvas` → `cropt`
2. Delete `.git`, run `git init`, create initial commit with current state
3. Create new GitHub repo `cropt`, push
4. Update Vercel project to point at new GitHub repo
5. Archive or delete old `meme-canvas` GitHub repo
6. Verify `cropt.app` still deploys correctly

**Version:** No version bump — this is infrastructure only.

---

### Phase 1 — Next.js Migration (Editor Parity)

**Goal:** All existing editor features working identically at `cropt.app/create`.
No new features. No regressions. PWA still works.

Steps:
1. Scaffold Next.js 15 app (App Router, TypeScript optional) inside the repo
2. Move all existing `src/` editor code into `src/components/editor/`
3. Create `src/app/create/page.tsx` — dynamically imports the editor with `ssr: false`
4. Migrate Vite config → `next.config.js`
5. Migrate `vite-plugin-pwa` → `@ducanh2912/next-pwa`
6. Migrate Tailwind config (already v4, should carry over cleanly)
7. Verify every editor feature manually:
   - Image import (paste, drag-drop, file picker)
   - Text nodes (place, edit, style)
   - Crop, flip, opacity
   - Canvas resize
   - Layer panel
   - Undo/redo
   - Export PNG + copy to clipboard
   - Session persistence
   - Back-button guard
   - PWA install prompt
8. `cropt.app/` → temporary redirect to `/create` until feed is built
9. Update CLAUDE.md with new structure

**Version:** 2.0.0 (framework migration is a major change)

---

### Phase 2 — Infrastructure Setup

**Goal:** All backend services provisioned and verified before writing feature code.

Steps:
1. **Cloudflare R2**
   - Create bucket `cropt-uploads`
   - Enable public access (images are public)
   - Note: public bucket URL will be `pub-{hash}.r2.dev/{key}` or custom domain `cdn.cropt.app`
   - Generate API token with R2 read+write permissions
   - Add env vars: `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_PUBLIC_URL`

2. **Neon Postgres**
   - Create project, get connection string
   - Run schema migration (uploads table + indexes)
   - Add env var: `DATABASE_URL`

3. **AWS Rekognition**
   - Create IAM user with `rekognition:DetectModerationLabels` permission only
   - Add env vars: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`

4. **Drizzle ORM**
   - Install `drizzle-orm`, `@neondatabase/serverless`, `drizzle-kit`
   - Write `src/lib/schema.ts` and `src/lib/db.ts`
   - Run initial migration

5. **Verify** all clients connect successfully from a local test script

---

### Phase 3 — Upload API

**Goal:** `POST /api/upload` works end-to-end. Returns a share URL.

`src/app/api/upload/route.ts`:
1. Accept `multipart/form-data` with `image` field (PNG blob)
2. Validate: must be image/png or image/jpeg, max 10MB
3. **Moderation check** via AWS Rekognition `DetectModerationLabels`
   - If any label confidence > 90% for explicit/suggestive nudity or violent content → reject with 422
   - All other content passes (dark humor, offensive text, etc. not filtered)
4. Generate `nanoid(10)` as the upload ID
5. Upload to R2 at key `uploads/{id}.png`
6. Extract image dimensions from buffer
7. Insert row into `uploads` table
8. Return `{ id, url: "https://cropt.app/m/{id}" }`

Rate limiting (simple): max 10 uploads per IP per hour, checked against DB.

---

### Phase 4 — Editor "Upload & Share" UI

**Goal:** Users can upload their finished meme and get a shareable link, without disrupting the existing export flow.

New hook: `src/components/editor/hooks/useUpload.js`
- State machine: `idle | uploading | success | error`
- `upload(blob)` → calls `/api/upload`, returns share URL
- Stores last share URL in state for display

Changes to existing UI:
- Add **"Upload & Share"** button to the export flow in `TopBar.jsx`
  - Sits alongside existing Export and Copy buttons
  - On click: captures canvas blob (reusing existing `captureBlob()` from `useExport`)
  - Shows loading spinner during upload
  - On success: shows share URL with one-click copy button + "View page" link
  - On error: shows error message with retry
- Existing Export/Copy behavior: **completely unchanged**

---

### Phase 5 — Viewer Page

**Goal:** `cropt.app/m/[id]` renders the hosted image with correct OG tags so links unfurl on Twitter, Discord, iMessage, Reddit, etc.

`src/app/m/[id]/page.tsx`:
1. Server component — fetches upload metadata from DB by ID
2. 404 if not found or `flagged = true`
3. Renders:
   - The image (served from R2 public URL / CDN)
   - Copy link button (client component)
   - **"Create your own"** CTA → `/create` (prominent, below image)
   - Report button → `POST /api/report`
4. `generateMetadata()` exports full OG tags:
   ```
   og:title        = "Meme on Cropt"
   og:image        = R2 public URL of the image
   og:image:width  = stored width
   og:image:height = stored height
   og:url          = https://cropt.app/m/{id}
   twitter:card    = summary_large_image
   ```

`src/app/api/report/route.ts`:
- Increments `report_count` for the given ID
- If `report_count >= 3`: sets `flagged = true` (auto-hides from feed + 404s viewer)
- Sends email notification to admin (Resend or simple nodemailer)

---

### Phase 6 — Feed (Landing Page)

**Goal:** `cropt.app/` shows a clean chronological grid of recent hosted memes.
Bare bones. No auth, no votes, no comments. Just images + a strong "Create" CTA.

`src/app/page.tsx`:
1. Server component — fetches 20 most recent non-flagged uploads from DB
2. Renders:
   - **Sticky header** with Cropt logo + prominent **"Create a Meme →"** button linking to `/create`
   - Responsive masonry/grid of `FeedItem` components
   - "Load more" button (or infinite scroll) for pagination — cursor-based using `created_at`
3. Each `FeedItem`:
   - Links to `/m/[id]`
   - Image with correct aspect ratio (use stored width/height to prevent layout shift)
   - No title, no username — just the image for now

Feed is server-rendered for SEO and fast initial load.
"Load more" pagination uses a Client Component to fetch additional pages via a `/api/feed` route.

---

### Phase 7 — Legal & Moderation Polish

**Goal:** Minimum viable legal hygiene. DMCA safe harbor.

1. **DMCA policy page** at `/dmca`
   - What Cropt hosts, what you can report
   - Email address for takedown requests: `dmca@cropt.app`
   - Response commitment (e.g. "We respond within 48 hours")
2. **Register DMCA agent** with the US Copyright Office (one-time, ~$6)
3. **Footer** on feed + viewer pages: links to `/dmca` and a report link
4. **Admin takedown**: Document the manual process for deleting from R2 + setting `flagged=true` in DB

---

## What Does NOT Change

- Every existing editor feature is preserved with full parity
- PWA installability (just using a different plugin)
- Session persistence, undo/redo, back-button guard
- Export PNG, copy to clipboard
- Existing share URL structure (there isn't one yet — this is all new)

---

## Open for Later (v2+)

- User accounts + upload ownership
- Votes / reactions
- Comments
- Tags and search
- User profiles / galleries
- Meme templates library
- CDN custom domain (`cdn.cropt.app`) for R2 public URLs
- PhotoDNA integration (CSAM hash matching)
- View counts
- Featured/trending algorithm
- Mobile app wrapper
