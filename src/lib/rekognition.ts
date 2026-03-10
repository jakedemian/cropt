import { RekognitionClient, DetectModerationLabelsCommand } from '@aws-sdk/client-rekognition'

const client = new RekognitionClient({
  region:      process.env.AWS_REGION!,
  credentials: {
    accessKeyId:     process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
})

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
