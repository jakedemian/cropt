# Cropt — Service Audit

<!-- This file is automatically overwritten by /audit and the individual /audit-* skills. Do not edit manually. -->

## Service Tooling

| Service | CLI | MCP | Cost visibility |
|---|---|---|---|
| **Cloudflare R2** | — | ✅ Working | ✅ Yes, via MCP |
| **Vercel** | ✅ Installed (token expires) | ✅ Working (re-auth with `/mcp`) | ❌ Not possible (API doesn't expose usage/cost) |
| **Neon** | ⬜ Not set up | ✅ Working (re-auth with `/mcp`) | ✅ Yes, via MCP |
| **AWS Rekognition** | ✅ Configured (locked-down IAM) | ⬜ Not set up | ✅ Yes, via `cropt-billing` CLI profile |

---

## Neon (Postgres)

*Last audited: 2026-03-12*

- Plan: Free tier (quota resets 2026-04-01)
- Project: `cropt-postgres`, Postgres 17, `us-east-1`, 1 branch (`production`)
- Total uploads: 6
- Flagged content: 0 (0%)
- Uploads last 7 days: 6
- Uploads last 30 days: 6
- Total tracked storage: ~1.3 MB (1,362,990 bytes)
- Compute used: 4,274 sec (~1.2 hrs) of ~190 hrs/month free — negligible
- DB storage: ~29.5 MB of 512 MB free — negligible
- Data transfer: ~218 KB of 5 GB free — negligible
- Cost: $0 — well within free tier on all dimensions

Recent uploads:

| ID | Date | Size | Dimensions |
|---|---|---|---|
| QirBoANTRe | 2026-03-11 19:04 | 422 KB | 423×421 |
| 4a10p6aLdm | 2026-03-11 18:54 | 23 KB | 110×100 |
| 9SZbmu787A | 2026-03-11 18:28 | 122 KB | 618×235 |
| lAFj7l7E16 | 2026-03-11 18:27 | 122 KB | 618×235 |
| wInIGXwPnP | 2026-03-11 01:57 | 321 KB | 434×567 |

---

## Cloudflare R2

*Last audited: 2026-03-12*

- Bucket: `cropt-uploads`, Eastern North America (ENAM), Standard storage class
- Created: 2026-03-11
- Objects: 6 (all PNG)
- Total size: ~1.3 MB (1,362,990 bytes)
- Free tier limits: 10 GB storage, 1M Class A ops/month, 10M Class B ops/month
- Status: well within all free tier limits — negligible usage
- Cost: $0

Note: Operation counts (Class A/B) are not exposed via the R2 API — check the Cloudflare dashboard for monthly op metrics if needed.

---

## AWS Rekognition

*Last audited: 2026-03-12*

- Plan: Free tier (5,000 images/month, first 12 months from account creation)
- March 2026 spend (estimated, through 2026-03-12):
  - Amazon Rekognition: $0.019 (~19 calls)
  - Amazon S3: $0.000093 (unrelated to Cropt — personal bucket elsewhere)
  - AWS Secrets Manager: $0.000005 (unrelated)
  - All other services: $0.00
- Free tier status: well within limits (19 of 5,000 free calls used)
- Cost at scale: $0.001/image after free tier expires

---

## Vercel

*Last audited: 2026-03-12*

- Plan: Hobby, Node.js 24.x
- Production: `cropt.app` — READY, 3 serverless functions
- Last deploy: 2026-03-09 — `docs: expand environment splitting section in POST_MVP.md` (git push to main)
- Last 10 deployments: all READY, no errors
- Domains: `cropt.app`, `www.cropt.app`, `cropt.vercel.app`
- Cost/usage (bandwidth, function hours): not queryable via API — check https://vercel.com/dashboard manually against Hobby limits (100GB bandwidth, 6,000 function-hours/month)

---

## Overall Health

*Last full audit: 2026-03-12*

**Status: ✅ Healthy**

| Service | Status | Est. Monthly Cost |
|---|---|---|
| Neon | ✅ Healthy — well within free tier | $0.00 |
| Cloudflare R2 | ✅ Healthy — well within free tier | $0.00 |
| AWS Rekognition | ✅ Healthy — well within free tier | ~$0.02 |
| Vercel | ✅ Healthy — no build errors | $0.00 |
| **Total** | | **~$0.02** |

No anomalies. No services approaching limits. DB and R2 are in sync (6 objects each). Zero flagged content.
