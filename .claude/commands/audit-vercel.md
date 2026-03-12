# Audit: Vercel (Hosting)

Use the Vercel MCP tools to query deployment data. If the MCP is not authenticated, instruct the user to run `/mcp` to trigger the OAuth flow.

Run the following:

1. List recent deployments: `mcp__vercel__list_deployments` with projectId `cropt`, limit 10
2. Get project info: `mcp__vercel__get_project` with projectId `cropt`

Report:
- Current production deployment URL and status
- Time of last deploy and what triggered it (git push, manual, etc.)
- Any failed or errored deployments in the last 10
- Current plan and node version

Note: Cost/usage data (bandwidth, function hours) is not queryable via the Vercel API. Direct the user to check https://vercel.com/dashboard manually for Hobby plan limits (100GB bandwidth, 6,000 function-hours/month).

After gathering results, **overwrite the `## Vercel` section in `AUDIT.md`** with a timestamped report. Preserve all other sections in the file exactly as they are.
