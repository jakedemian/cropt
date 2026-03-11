# Post-MVP Backlog

## High Priority

### MCP Integration
Wire up MCP servers for Neon, Cloudflare, and AWS so Claude Code sessions can directly query usage, costs, and data in plain English. Config is already in `~/.claude.json` but tools aren't loading in sessions — needs investigation.

- Neon MCP: `https://mcp.neon.tech/mcp` (global install done)
- Cloudflare MCP: `https://workers-mcp.cloudflare.com/mcp` (project-level)
- AWS Billing MCP: `uvx awslabs.cost-analysis-mcp-server@latest` (project-level)
