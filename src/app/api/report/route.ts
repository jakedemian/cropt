export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { uploads } from '@/lib/schema'
import { eq, sql } from 'drizzle-orm'

const AUTO_FLAG_THRESHOLD = 3

export async function POST(request: NextRequest) {
  let id: string
  try {
    const body = await request.json()
    id = body.id
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  if (!id || typeof id !== 'string') {
    return NextResponse.json({ error: 'Missing upload ID' }, { status: 400 })
  }

  // Increment report count and auto-flag if threshold reached
  const [updated] = await db
    .update(uploads)
    .set({
      reportCount: sql`${uploads.reportCount} + 1`,
      flagged: sql`CASE WHEN ${uploads.reportCount} + 1 >= ${AUTO_FLAG_THRESHOLD} THEN true ELSE ${uploads.flagged} END`,
    })
    .where(eq(uploads.id, id))
    .returning({ reportCount: uploads.reportCount, flagged: uploads.flagged })

  if (!updated) {
    return NextResponse.json({ error: 'Upload not found' }, { status: 404 })
  }

  return NextResponse.json({ success: true })
}
