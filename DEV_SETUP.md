# Cropt — Dev Setup

Getting the project running on a new machine. All external services (Neon, R2, Rekognition) are already provisioned.

---

## Prerequisites

- **Node.js** v20+
- **Git**
- **Vercel CLI** — `npm install -g vercel`
- **AWS CLI** — https://aws.amazon.com/cli/

---

## Steps

### 1. Clone and install

```bash
git clone https://github.com/jakedemian/cropt.git
cd cropt
npm install
```

### 2. Environment variables

```bash
cp .env.local.example .env.local
```

Fill in `.env.local` with the real values. Find them at:

| Variable | Where to find it |
|---|---|
| `DATABASE_URL` | Neon dashboard → project → Connection string |
| `R2_ACCOUNT_ID` | Cloudflare dashboard → R2 (top right) |
| `R2_ACCESS_KEY_ID` | Cloudflare → R2 → Manage API Tokens |
| `R2_SECRET_ACCESS_KEY` | Same — only shown at token creation time |
| `R2_BUCKET_NAME` | `cropt-uploads` |
| `R2_PUBLIC_URL` | Cloudflare → R2 → cropt-uploads → Public URL |
| `REKOGNITION_ACCESS_KEY_ID` | AWS → IAM → cropt-rekognition user → Access keys |
| `REKOGNITION_SECRET_ACCESS_KEY` | Same — only shown at key creation time |
| `REKOGNITION_REGION` | `us-east-1` |

### 3. Start the dev server

```bash
npm run dev
```

Open http://localhost:3000.

### 4. Vercel CLI (for logs and deployments)

```bash
vercel login
vercel link --scope jakedemians-projects
```

### 5. AWS CLI (for usage auditing)

```bash
aws configure
```

Use the `REKOGNITION_ACCESS_KEY_ID` / `REKOGNITION_SECRET_ACCESS_KEY` values and region `us-east-1`.

---

## Useful commands

```bash
npm run db:migrate   # Run any pending DB migrations
npm run db:studio    # Browse the database
npm run build        # Production build
vercel logs          # Stream recent function logs
```
