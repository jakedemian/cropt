import { AwsClient } from 'aws4fetch'

const BLOCKED_CATEGORIES = [
  'Explicit Nudity',
  'Nudity',
  'Graphic Sexual Activity',
  'Sexual Activity',
  'Illustrated Explicit Nudity',
  'Graphic Violence or Gore',
]

const CONFIDENCE_THRESHOLD = 90

export async function moderateImage(imageBytes: Buffer): Promise<{ blocked: boolean; reason?: string }> {
  const region = process.env.REKOGNITION_REGION!
  const aws = new AwsClient({
    accessKeyId:     process.env.REKOGNITION_ACCESS_KEY_ID!,
    secretAccessKey: process.env.REKOGNITION_SECRET_ACCESS_KEY!,
    region,
    service:         'rekognition',
  })

  const res = await aws.fetch(`https://rekognition.${region}.amazonaws.com/`, {
    method:  'POST',
    headers: {
      'Content-Type':  'application/x-amz-json-1.1',
      'X-Amz-Target': 'RekognitionService.DetectModerationLabels',
    },
    body: JSON.stringify({
      Image:         { Bytes: imageBytes.toString('base64') },
      MinConfidence: CONFIDENCE_THRESHOLD,
    }),
  })

  if (!res.ok) {
    throw new Error(`Rekognition error: ${res.status} ${res.statusText}`)
  }

  const data = await res.json() as { ModerationLabels?: { Name?: string }[] }
  const labels = data.ModerationLabels ?? []
  const blocked = labels.find((l) => BLOCKED_CATEGORIES.includes(l.Name ?? ''))

  if (blocked) {
    return { blocked: true, reason: blocked.Name }
  }

  return { blocked: false }
}
