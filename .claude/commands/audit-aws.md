# Audit: AWS (Rekognition)

Use the AWS CLI via Bash to query usage and cost data. Credentials are configured via `aws configure`.

Run the following commands:

1. Verify IAM identity:
   `aws sts get-caller-identity`

2. Rekognition API call count this month (via CloudWatch metrics):
   `aws cloudwatch get-metric-statistics --namespace AWS/Rekognition --metric-name SuccessfulRequestCount --start-time $(date -u -d '1 month ago' +%Y-%m-%dT%H:%M:%SZ) --end-time $(date -u +%Y-%m-%dT%H:%M:%SZ) --period 2592000 --statistics Sum --region us-east-1`

3. Cost and usage for Rekognition this month:
   `aws ce get-cost-and-usage --time-period Start=$(date -u +%Y-%m-01),End=$(date -u +%Y-%m-%d) --granularity MONTHLY --metrics BlendedCost --filter '{"Dimensions":{"Key":"SERVICE","Values":["Amazon Rekognition"]}}'`

4. Total AWS cost this month across all services:
   `aws ce get-cost-and-usage --time-period Start=$(date -u +%Y-%m-01),End=$(date -u +%Y-%m-%d) --granularity MONTHLY --metrics BlendedCost`

Note: Cost Explorer data may have up to 24h delay. The free tier includes 5,000 Rekognition moderation calls/month — flag if usage is approaching or exceeding this.

Present results as a clean report with estimated costs and free tier status.
