# Audit: AWS (Rekognition)

Use the AWS CLI via Bash with the `cropt-billing` profile to query cost data.

Run the following:

1. Cost breakdown by service this month:
   `aws ce get-cost-and-usage --profile cropt-billing --time-period Start=YYYY-MM-01,End=YYYY-MM-DD --granularity MONTHLY --metrics BlendedCost --group-by Type=DIMENSION,Key=SERVICE`
   (Substitute the current year/month/day)

2. Rekognition-specific cost:
   `aws ce get-cost-and-usage --profile cropt-billing --time-period Start=YYYY-MM-01,End=YYYY-MM-DD --granularity MONTHLY --metrics BlendedCost --filter '{"Dimensions":{"Key":"SERVICE","Values":["Amazon Rekognition"]}}'`

Note: Cost Explorer data may have up to 24h delay. Free tier includes 5,000 Rekognition moderation calls/month for the first 12 months — flag if approaching this limit.

After gathering results, **overwrite the `## AWS Rekognition` section in `AUDIT.md`** with a timestamped report. Preserve all other sections in the file exactly as they are.
