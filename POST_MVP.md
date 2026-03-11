# Post-MVP Backlog

## High Priority

### Environment Splitting
Currently `.env.local` points directly at the production Neon database. Split into at least local dev vs prod environments before any serious development traffic hits the DB.



### MCP Integration
Wire up MCP servers for Neon and AWS so Claude Code sessions can directly query usage, costs, and data in plain English. Cloudflare MCP is working. AWS CLI is configured and usable as a fallback for now.

- Neon MCP: `https://mcp.neon.tech/mcp` (global install done, not loading in sessions — needs investigation)
- Cloudflare MCP: `https://mcp.cloudflare.com/mcp` ✅ working
- AWS: CLI configured and working; Billing MCP (`uvx awslabs.cost-analysis-mcp-server@latest`) not yet loading — needs `uv` installed
