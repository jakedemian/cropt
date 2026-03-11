# Audit: Vercel (Hosting)

Use the Vercel CLI via Bash to query deployment and usage data.

Run the following:

1. List recent deployments for the cropt project:
   `vercel ls cropt --token $VERCEL_TOKEN` or just `vercel ls` if already authenticated

2. Inspect the current production deployment:
   `vercel inspect --prod`

3. Check project info:
   `vercel project ls`

If the Vercel CLI is not authenticated, note that and instruct the user to run `vercel login` in their terminal.

Report:
- Current production deployment URL and status
- Time of last deploy and what triggered it (git push, manual, etc.)
- Any failed or errored deployments in the last 10
- Current plan (Hobby/Pro) and any usage limit warnings

Note: Vercel's Hobby plan includes 100GB bandwidth and 6,000 serverless function execution hours/month for free. Flag if approaching limits.
