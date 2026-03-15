# Cropt — Service Audit

<!-- This file is automatically overwritten by /audit and the individual /audit-* skills. Do not edit manually. -->

## Service Tooling

| Service | CLI | MCP | Cost visibility |
|---|---|---|---|
| **Cloudflare R2** | — | ✅ Working | ✅ Yes, via MCP |
| **Vercel** | ✅ Installed (token expires) | ✅ Working (re-auth with `/mcp`) | ❌ Not possible (API doesn't expose usage/cost) |
| **Neon** | ⬜ Not set up | ✅ Working (re-auth with `/mcp`) | ✅ Yes, via MCP |
| **AWS Rekognition** | ✅ Configured (`cropt-billing` CLI profile) | ⬜ Not set up | ✅ Yes, via `aws ce` CLI |

---

## Neon (Postgres)

*Last audited: 2026-03-15*

- **Plan:** Free tier (quota resets 2026-04-01)
- **Project:** `cropt-postgres`, 1 branch (`production`) — state: ready
- **DB size:** ~7.3 MB (pg_database_size), ~29.5 MB logical branch size
- **Tables:** `uploads` (32 kB, 10 columns)
- **Total uploads:** 12 — oldest 2026-03-11, newest 2026-03-15
- **Compute used:** 15,274 sec (~4.2 hrs) of ~191 hrs/month free
- **Written data:** ~31.3 MB; **data transfer:** ~886 KB of 5 GB free
- **Cost:** $0 — well within free tier on all dimensions

---

## Cloudflare R2

*Last audited: 2026-03-15*

- **Buckets:** 2
  - `cropt-uploads` (prod) — created 2026-03-11, region ENAM
  - `cropt-uploads-dev` (dev) — created 2026-03-15
- **Objects in `cropt-uploads`:** 12 files (all PNG)
- **Total storage:** ~3.59 MB
- **Largest file:** `DSIOglhF9E.png` — 917 KB
- **Latest upload:** 2026-03-15
- **Free tier limits:** 10 GB storage, 1M Class A ops/month, 10M Class B ops/month
- **Cost:** $0 — well within free tier

Note: Operation counts (Class A/B) not exposed via R2 API — check Cloudflare dashboard if needed.

---

## AWS Rekognition

*Last audited: 2026-03-15*

- **Plan:** Free tier (5,000 images/month, first 12 months from account creation)
- **Feb 2026:** $0.00 (0 calls)
- **Mar 1–15, 2026 (estimated):** $0.024 — 24 image moderation calls
- **Rate:** $0.001/image — consistent with Rekognition Image Moderation pricing
- **Free tier status:** 24 of 5,000 free calls used this month
- **Cost at scale:** $0.001/image after free tier expires

---

## Vercel

*Last audited: 2026-03-15*

- **Plan:** Hobby, Node.js 24.x
- **Project:** `cropt` (`prj_AuVxeDaOVBMMQp52oga5uBMMrIsm`)
- **Production:** `cropt.app` — READY, 3 serverless functions
- **Latest deploy:** `docs: migrate bug/feature tracking to GitHub Issues` (086f422, 2026-03-15)
- **Domains:** `cropt.app`, `www.cropt.app`, `cropt.vercel.app`
- **Recent deployments:** Mix of READY and CANCELED (cancelations normal — superseded by rapid pushes)
- **Cost/usage (bandwidth, function hours):** not queryable via API — check Vercel dashboard manually against Hobby limits (100 GB bandwidth, 6,000 function-hours/month)

---

## Overall Health

*Last full audit: 2026-03-15*

**Status: ✅ Healthy**

| Service | Status | Est. Monthly Cost |
|---|---|---|
| Neon | ✅ Healthy — well within free tier | $0.00 |
| Cloudflare R2 | ✅ Healthy — well within free tier | $0.00 |
| AWS Rekognition | ✅ Healthy — well within free tier | ~$0.05 |
| Vercel | ✅ Healthy — production live, no build errors | $0.00 |
| **Total** | | **~$0.05** |

No anomalies. No services approaching limits. DB and R2 are in sync (12 objects each). Zero flagged content.
