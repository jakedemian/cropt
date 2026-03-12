# Audit: Cloudflare R2 (Object Storage)

Use the Cloudflare MCP `mcp__cloudflare__execute` tool to query the `cropt-uploads` bucket.

Run the following code:

```js
async () => {
  const bucket = await cloudflare.request({ method: "GET", path: `/accounts/${accountId}/r2/buckets/cropt-uploads` });
  const objects = await cloudflare.request({ method: "GET", path: `/accounts/${accountId}/r2/buckets/cropt-uploads/objects`, query: { per_page: 1000 } });
  return { bucket: bucket.result, objects: objects.result, object_count: objects.result_info };
}
```

Report:
1. Total number of objects
2. Total storage used (sum of object sizes)
3. Bucket location and storage class
4. Any anomalies (e.g. objects in R2 with no corresponding DB record)

Note: Class A/B operation counts are not exposed via the R2 API — omit or note as unavailable.

After gathering results, **overwrite the `## Cloudflare R2` section in `AUDIT.md`** with a timestamped report. Preserve all other sections in the file exactly as they are.

Free tier limits: 10 GB storage, 1M Class A ops/month, 10M Class B ops/month.
