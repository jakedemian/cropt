import { RekognitionClient, DetectModerationLabelsCommand } from '@aws-sdk/client-rekognition'

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
  const region = process.env.REKOGNITION_REGION?.trim()
  const accessKeyId = process.env.REKOGNITION_ACCESS_KEY_ID?.trim()
  const secretAccessKey = process.env.REKOGNITION_SECRET_ACCESS_KEY?.trim()

  const client = new RekognitionClient({
    region,
    credentials: { accessKeyId: accessKeyId!, secretAccessKey: secretAccessKey! },
  })

  const response = await client.send(new DetectModerationLabelsCommand({
    Image:         { Bytes: imageBytes },
    MinConfidence: CONFIDENCE_THRESHOLD,
  }))

  const labels = response.ModerationLabels ?? []
  const blocked = labels.find((l) => BLOCKED_CATEGORIES.includes(l.Name ?? ''))

  if (blocked) {
    return { blocked: true, reason: blocked.Name }
  }

  return { blocked: false }
}
