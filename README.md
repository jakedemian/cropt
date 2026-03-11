# Cropt

A mobile-first PWA for creating and sharing memes. Create in the editor, upload, get a shareable link. The landing page is a public feed of hosted memes.

**Live:** https://cropt.app

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router) |
| Styling | Tailwind CSS v4 |
| Canvas | Konva.js + react-konva |
| PWA | @ducanh2912/next-pwa |
| Database | Neon (serverless Postgres) + Drizzle ORM |
| Storage | Cloudflare R2 |
| Moderation | AWS Rekognition |
| Hosting | Vercel |

---

## Routes

| Route | Description |
|---|---|
| `/` | Feed — chronological grid of hosted memes |
| `/create` | Editor — client-only, PWA installable |
| `/m/[id]` | Viewer — SSR with OG tags for social sharing |
| `/dmca` | DMCA policy and takedown instructions |
| `/api/upload` | POST — moderate, store, return share URL |
| `/api/report` | POST — flag content for review |

---

## Development

```bash
npm run dev          # Start dev server
npm run build        # Production build
npm run lint         # ESLint
npm run db:generate  # Generate Drizzle migration files
npm run db:migrate   # Run migrations against Neon
npm run db:studio    # Open Drizzle Studio (DB browser)
```

Copy `.env.local.example` to `.env.local` and fill in all values before running locally.

---

## Deployment

Push to `main` triggers a production deploy via Vercel's GitHub integration.

```bash
vercel --prod   # Manual deploy
```
