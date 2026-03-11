import { AwsClient } from 'aws4fetch'

function getClient() {
  return new AwsClient({
    accessKeyId:     process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    service:         's3',
    region:          'auto',
  })
}

export async function uploadToR2(key: string, body: Buffer, contentType: string) {
  const url = `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${process.env.R2_BUCKET_NAME}/${key}`

  const res = await getClient().fetch(url, {
    method:  'PUT',
    body:    new Uint8Array(body),
    headers: { 'Content-Type': contentType },
  })

  if (!res.ok) {
    throw new Error(`R2 upload failed: ${res.status} ${res.statusText}`)
  }

  return `${process.env.R2_PUBLIC_URL!}/${key}`
}
