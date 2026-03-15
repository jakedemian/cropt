export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { uploads } from '@/lib/schema'
import { eq, desc, lt, and } from 'drizzle-orm'

const PAGE_SIZE = 20

export async function GET(request: NextRequest) {
  const cursor = request.nextUrl.searchParams.get('cursor')

  const rows = await db
    .select({
      id:        uploads.id,
      r2Key:     uploads.r2Key,
      width:     uploads.width,
      height:    uploads.height,
      createdAt: uploads.createdAt,
    })
    .from(uploads)
    .where(
      cursor
        ? and(eq(uploads.flagged, false), lt(uploads.createdAt, new Date(cursor)))
        : eq(uploads.flagged, false)
    )
    .orderBy(desc(uploads.createdAt))
    .limit(PAGE_SIZE + 1)

  const hasMore    = rows.length > PAGE_SIZE
  const items      = hasMore ? rows.slice(0, PAGE_SIZE) : rows
  const nextCursor = hasMore ? items[items.length - 1].createdAt.toISOString() : null

  const r2PublicUrl = process.env.R2_PUBLIC_URL!

  return NextResponse.json({
    uploads:    items.map((u) => ({ ...u, imageUrl: `${r2PublicUrl}/${u.r2Key}`, createdAt: u.createdAt.toISOString() })),
    nextCursor,
  })
}
