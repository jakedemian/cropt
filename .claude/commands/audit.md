# Audit: Full State of the App

Run all four service audits in sequence and present a combined report. Use the individual audit commands as your guide for what to check in each service.

Order:
1. **Neon** — database stats (uploads, flagged content, recent activity)
2. **Cloudflare R2** — storage usage, object count, operations
3. **AWS Rekognition** — API call count, cost, free tier status
4. **Vercel** — deployment status, recent deploys, plan usage

After all four, give a brief **Overall Health Summary** with:
- Any services approaching free tier limits
- Any anomalies or things that need attention
- Estimated total monthly cost across all services

Keep the report concise — use a consistent format for each section with a status indicator (healthy / warning / attention needed).
