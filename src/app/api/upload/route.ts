export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'
import { nanoid } from 'nanoid'
import { imageSize } from 'image-size'
import { getDb } from '@/lib/db'
import { uploads } from '@/lib/schema'
import { uploadToR2 } from '@/lib/r2'
import { moderateImage } from '@/lib/rekognition'
import { count, and, gte, eq } from 'drizzle-orm'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_TYPES = ['image/png', 'image/jpeg']
const RATE_LIMIT = 10 // uploads per IP per hour

export async function POST(request: NextRequest) {
  // 1. Parse
  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 })
  }

  const file = formData.get('image') as File | null
  if (!file) {
    return NextResponse.json({ error: 'No image provided' }, { status: 400 })
  }

  // 2. Validate type and size
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: 'Only PNG and JPEG images are supported' }, { status: 400 })
  }
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: 'Image must be under 10MB' }, { status: 400 })
  }

  // 3. Rate limit — max 10 uploads per IP per hour
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const ipHash = createHash('sha256').update(ip).digest('hex')
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)

  const [{ value: recentCount }] = await getDb()
    .select({ value: count() })
    .from(uploads)
    .where(and(eq(uploads.ipHash, ipHash), gte(uploads.createdAt, oneHourAgo)))

  if (recentCount >= RATE_LIMIT) {
    return NextResponse.json({ error: 'Rate limit exceeded. Try again later.' }, { status: 429 })
  }

  // 4. Buffer
  const buffer = Buffer.from(await file.arrayBuffer())

  // 5. Moderation
  const moderation = await moderateImage(buffer)
  if (moderation.blocked) {
    return NextResponse.json({ error: 'Image was rejected by content moderation' }, { status: 422 })
  }

  // 6. Dimensions
  const { width, height } = imageSize(buffer)

  // 7. Upload to R2
  const id = nanoid(10)
  const ext = file.type === 'image/jpeg' ? 'jpg' : 'png'
  const key = `uploads/${id}.${ext}`
  await uploadToR2(key, buffer, file.type)

  // 8. Insert into DB
  await getDb().insert(uploads).values({
    id,
    r2Key:     key,
    sizeBytes: file.size,
    width:     width ?? null,
    height:    height ?? null,
    mimeType:  file.type,
    ipHash,
  })

  // 9. Return share URL
  return NextResponse.json({
    id,
    url: `https://cropt.app/m/${id}`,
  })
}
