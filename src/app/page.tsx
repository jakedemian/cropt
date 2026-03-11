import { db } from '@/lib/db'
import { uploads } from '@/lib/schema'
import { eq, desc } from 'drizzle-orm'
import FeedGrid from '@/components/feed/FeedGrid'
import Footer from '@/components/shared/Footer'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Cropt — Make and share memes',
  description: 'Create and share memes instantly. No account needed.',
}

const PAGE_SIZE = 20

export default async function Home() {
  const rows = await db
    .select({
      id:        uploads.id,
      r2Key:     uploads.r2Key,
      width:     uploads.width,
      height:    uploads.height,
      createdAt: uploads.createdAt,
    })
    .from(uploads)
    .where(eq(uploads.flagged, false))
    .orderBy(desc(uploads.createdAt))
    .limit(PAGE_SIZE + 1)

  const hasMore    = rows.length > PAGE_SIZE
  const items      = hasMore ? rows.slice(0, PAGE_SIZE) : rows
  const nextCursor = hasMore ? items[items.length - 1].createdAt.toISOString() : null

  const r2PublicUrl = process.env.R2_PUBLIC_URL!
  const feedItems   = items.map((u) => ({
    ...u,
    imageUrl:  `${r2PublicUrl}/${u.r2Key}`,
    createdAt: u.createdAt.toISOString(),
  }))

  return (
    <div className="min-h-full bg-[#24272f] text-white">

      {/* Sticky header */}
      <header className="sticky top-0 z-10 flex items-center justify-between px-4 h-12 bg-[#24272f] border-b border-white/5">
        <div className="flex items-center gap-1.5">
          <img src="/icons/cropt-logo.png" alt="Cropt" className="w-6 h-6" />
          <span className="font-semibold text-sm tracking-wide">Cropt</span>
        </div>
        <a
          href="/create"
          className="flex items-center gap-1.5 px-3 h-8 rounded text-xs font-medium bg-[#0fff95] text-[#24272f] hover:bg-[#0de882] transition-colors"
        >
          Create a Meme →
        </a>
      </header>

      {/* Feed grid */}
      <FeedGrid initialUploads={feedItems} initialCursor={nextCursor} />

      <Footer />
    </div>
  )
}
