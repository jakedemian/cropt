# Cropt — Dev Setup Guide

Step-by-step instructions for getting a local development environment running from scratch.

---

## Prerequisites

Install these before starting:

- **Node.js** v20+ — https://nodejs.org
- **Git**
- **Vercel CLI** — `npm install -g vercel`
- **AWS CLI** — https://aws.amazon.com/cli/ (run `aws configure` after installing)

---

## 1. Clone and Install

```bash
git clone https://github.com/jakedemian/cropt.git
cd cropt
npm install
```

---

## 2. External Services

You need accounts on three services. Each has a free tier sufficient for local dev.

### Neon (Postgres database)

1. Create an account at https://neon.tech
2. Create a new project (AWS us-east-1 recommended, no Neon Auth needed)
3. From the project dashboard, copy the **connection string** (Postgres URL)
4. That becomes your `DATABASE_URL`

### Cloudflare R2 (image storage)

1. Create an account at https://cloudflare.com
2. Go to **R2** in the sidebar — you'll need to enable R2 (requires a payment method on file, but has a generous free tier)
3. Create a bucket named `cropt-uploads`
4. Enable **Public Access** on the bucket and note the public URL (`https://pub-xxx.r2.dev`)
5. Go to **R2 → Manage R2 API Tokens** → Create a token with **Object Read & Write** on `cropt-uploads`
6. Note the **Account ID** (top right of R2 page), **Access Key ID**, and **Secret Access Key**

### AWS Rekognition (content moderation)

1. Create an account at https://aws.amazon.com (free tier: 5,000 images/month)
2. Go to **IAM → Users → Create user** (name it something like `cropt-rekognition`)
3. Attach a custom inline policy with only this permission:
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [{
       "Effect": "Allow",
       "Action": "rekognition:DetectModerationLabels",
       "Resource": "*"
     }]
   }
   ```
4. Create an **Access Key** for the user (CLI access type)
5. Note the **Access Key ID** and **Secret Access Key**
6. Region: `us-east-1`

> **Note:** Do NOT name these env vars with the `AWS_` prefix — Vercel reserves those for its own internal use. Use `REKOGNITION_*` instead.

---

## 3. Environment Variables

```bash
cp .env.local.example .env.local
```

Fill in `.env.local` with the values from the services above:

```
DATABASE_URL=postgresql://...

R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=cropt-uploads
R2_PUBLIC_URL=https://pub-xxx.r2.dev

REKOGNITION_ACCESS_KEY_ID=
REKOGNITION_SECRET_ACCESS_KEY=
REKOGNITION_REGION=us-east-1
```

---

## 4. Database Migration

```bash
npm run db:migrate
```

This creates the `uploads` table in your Neon database. To verify or browse the data:

```bash
npm run db:studio
```

---

## 5. Run the Dev Server

```bash
npm run dev
```

Open http://localhost:3000. The editor is at `/create`, the feed is at `/`.

---

## 6. Vercel CLI Setup (for deployments and logs)

```bash
vercel login
vercel link --scope jakedemians-projects
```

After linking, you can use:

```bash
vercel logs         # Stream recent function logs
vercel env ls       # List production env vars
vercel --prod       # Manual production deploy
```

> **Warning:** Never set Vercel env vars via shell scripts or the CLI with variable interpolation — trailing newlines get baked into the values and silently break request signing. Always use the **Vercel dashboard UI** to set env vars.

---

## 7. AWS CLI Setup (optional, for usage auditing)

```bash
aws configure
```

Enter your `REKOGNITION_ACCESS_KEY_ID`, `REKOGNITION_SECRET_ACCESS_KEY`, and region `us-east-1`. Note the current IAM user is locked to Rekognition only — it cannot query billing. See `POST_MVP.md` for the plan to add a billing-capable profile.

---

## Current Tooling Gaps

See `POST_MVP.md` → **Service Tooling & Visibility** for the full status of which services Claude Code can query directly in chat sessions.
