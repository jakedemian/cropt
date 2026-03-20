import { NextResponse } from 'next/server'
import { notFound } from 'next/navigation'
import { getDb } from '@/lib/db'
import { uploads } from '@/lib/schema'
import { eq, and } from 'drizzle-orm'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params
  const segment = path[0] ?? ''
  // Strip any image extension so /i/abc123.png and /i/abc123 both work
  const id = segment.replace(/\.(png|jpg|jpeg|webp|gif)$/i, '')

  if (!id) notFound()

  const rows = await getDb()
    .select({ r2Key: uploads.r2Key })
    .from(uploads)
    .where(and(eq(uploads.id, id), eq(uploads.flagged, false)))
    .limit(1)

  if (!rows[0]) notFound()

  const imageUrl = `${process.env.R2_PUBLIC_URL}/${rows[0].r2Key}`
  const upstream = await fetch(imageUrl)
  if (!upstream.ok) notFound()

  return new Response(upstream.body, {
    headers: {
      'Content-Type': upstream.headers.get('Content-Type') ?? 'image/png',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  })
}
