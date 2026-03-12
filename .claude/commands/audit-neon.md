# Audit: Neon (Postgres Database)

Use the Neon MCP tools to query the database. The project ID is `misty-recipe-76350933`.

Run the following SQL queries via `mcp__neon__run_sql`:

1. Total upload count: `SELECT COUNT(*) FROM uploads`
2. Flagged content count: `SELECT COUNT(*) FROM uploads WHERE flagged = true`
3. Uploads in the last 7 days: `SELECT COUNT(*) FROM uploads WHERE created_at > NOW() - INTERVAL '7 days'`
4. Uploads in the last 30 days: `SELECT COUNT(*) FROM uploads WHERE created_at > NOW() - INTERVAL '30 days'`
5. Total storage tracked: `SELECT SUM(size_bytes) FROM uploads WHERE flagged = false`
6. Most recent 5 uploads: `SELECT id, created_at, size_bytes, width, height FROM uploads ORDER BY created_at DESC LIMIT 5`

Also call `mcp__neon__describe_project` for compute, storage, and data transfer usage against free tier limits.

After gathering results, **overwrite the `## Neon (Postgres)` section in `AUDIT.md`** with a timestamped report. Preserve all other sections in the file exactly as they are.

Flag any anomalies (e.g. high flagged content ratio, unexpected upload spikes, approaching free tier limits).

Free tier limits for reference: ~190 compute-hours/month, 512 MB storage, 5 GB data transfer.
