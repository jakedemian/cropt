# Post-MVP Backlog

## High Priority

### Environment Splitting
Currently `.env.local` points directly at the production Neon database. Split into at least local dev vs prod environments before any serious development traffic hits the DB.



### MCP Integration
Wire up MCP servers for Neon, Cloudflare, and AWS so Claude Code sessions can directly query usage, costs, and data in plain English. Config is already in `~/.claude.json` but tools aren't loading in sessions — needs investigation.

- Neon MCP: `https://mcp.neon.tech/mcp` (global install done)
- Cloudflare MCP: `https://mcp.cloudflare.com/mcp` (project-level)
- AWS Billing MCP: `uvx awslabs.cost-analysis-mcp-server@latest` (project-level)
