# Audit: Full State of the App

Run all four service audits and update `AUDIT.md` with the results.

Use the following tools for each service:

1. **Neon** — use `mcp__neon__run_sql` and `mcp__neon__describe_project` (project ID: `misty-recipe-76350933`)
2. **Cloudflare R2** — use `mcp__cloudflare__execute` for the `cropt-uploads` bucket (account ID: `169edc09711adf69306f7e38b3feb48e`)
3. **AWS Rekognition** — use Bash with `aws ce get-cost-and-usage --profile cropt-billing`
4. **Vercel** — use `mcp__vercel__list_deployments` and `mcp__vercel__get_project` (project ID: `cropt`)

Refer to the individual `/audit-*` commands for the exact queries to run for each service.

After gathering all results, **overwrite `AUDIT.md` entirely** using the following structure — every section gets a fresh timestamp:

```
# Cropt — Service Audit

<!-- This file is automatically overwritten by /audit and the individual /audit-* skills. Do not edit manually. -->

## Service Tooling

[table — always kept current, update any status changes observed during the audit]

---

## Neon (Postgres)

*Last audited: YYYY-MM-DD*

[results]

---

## Cloudflare R2

*Last audited: YYYY-MM-DD*

[results]

---

## AWS Rekognition

*Last audited: YYYY-MM-DD*

[results]

---

## Vercel

*Last audited: YYYY-MM-DD*

[results]

---

## Overall Health

*Last full audit: YYYY-MM-DD*

[brief summary: any services approaching limits, anomalies, estimated total monthly cost, overall status (healthy / warning / attention needed)]
```
