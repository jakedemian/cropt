export const dynamic = 'force-dynamic'

import { notFound } from 'next/navigation'
import { cache } from 'react'
import { getDb } from '@/lib/db'
import { uploads } from '@/lib/schema'
import { eq, and } from 'drizzle-orm'
import ViewerActions from './ViewerActions'
import Footer from '@/components/shared/Footer'
import type { Metadata } from 'next'

const getUpload = cache(async (id: string) => {
  const rows = await getDb()
    .select()
    .from(uploads)
    .where(and(eq(uploads.id, id), eq(uploads.flagged, false)))
    .limit(1)
  return rows[0] ?? null
})

export async function generateMetadata(
  { params }: { params: Promise<{ id: string }> }
): Promise<Metadata> {
  const { id } = await params
  const upload = await getUpload(id)
  if (!upload) return {}

  const imageUrl = `${process.env.R2_PUBLIC_URL}/${upload.r2Key}`

  const description = 'Made with Cropt — create your own memes at cropt.app'

  return {
    title: 'Meme on Cropt',
    description,
    openGraph: {
      title: 'Meme on Cropt',
      description,
      siteName: 'Cropt',
      type: 'website',
      images: [{ url: imageUrl, width: upload.width ?? undefined, height: upload.height ?? undefined }],
      url: `https://cropt.app/m/${upload.id}`,
    },
    twitter: {
      card: 'summary_large_image',
      title: 'Meme on Cropt',
      description,
      images: [imageUrl],
    },
  }
}

export default async function ViewerPage(
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const upload = await getUpload(id)
  if (!upload) notFound()

  const imageUrl = `${process.env.R2_PUBLIC_URL}/${upload.r2Key}`
  const shareUrl = `https://cropt.app/m/${upload.id}`

  return (
    <div className="flex flex-col h-full bg-[#24272f] text-white">

      {/* Header */}
      <header className="flex items-center justify-between px-4 h-12 shrink-0">
        <a href="/create" className="flex items-center gap-1.5">
          <img src="/icons/cropt-logo.png" alt="Cropt" className="w-6 h-6" />
          <span className="font-semibold text-sm tracking-wide">Cropt</span>
        </a>
        <a
          href="/create"
          className="flex items-center gap-1.5 px-3 h-8 rounded text-xs font-medium bg-[#0fff95] text-[#24272f] hover:bg-[#0de882] transition-colors"
        >
          Create your own →
        </a>
      </header>

      {/* Image */}
      <div className="flex-1 flex items-center justify-center py-1 md:p-4 min-h-0">
        <img
          src={`/m/${upload.id}.png`}
          alt="Meme"
          width={upload.width ?? undefined}
          height={upload.height ?? undefined}
          className="max-w-full max-h-full object-contain shadow-2xl"
        />
      </div>

      {/* Copy link + Report */}
      <ViewerActions id={upload.id} shareUrl={shareUrl} />

      <Footer />
    </div>
  )
}
