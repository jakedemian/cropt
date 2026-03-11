# Audit: Neon (Postgres Database)

Run the following queries against the Neon database using the DATABASE_URL from `.env.local`. Use a Node.js script with `@neondatabase/serverless` and `dotenv` to execute SQL directly.

Write and run a temporary script at `scripts/audit-neon.mjs` that connects to Neon and queries:

1. Total upload count: `SELECT COUNT(*) FROM uploads`
2. Flagged content count: `SELECT COUNT(*) FROM uploads WHERE flagged = true`
3. Uploads in the last 7 days: `SELECT COUNT(*) FROM uploads WHERE created_at > NOW() - INTERVAL '7 days'`
4. Uploads in the last 30 days: `SELECT COUNT(*) FROM uploads WHERE created_at > NOW() - INTERVAL '30 days'`
5. Total storage tracked: `SELECT SUM(size_bytes) FROM uploads WHERE flagged = false`
6. Most recent 5 uploads: `SELECT id, created_at, size_bytes, width, height, flagged FROM uploads ORDER BY created_at DESC LIMIT 5`

After running, delete the script and present the results as a clean, readable report. Flag any anomalies (e.g. high flagged content ratio, unexpected spikes).
