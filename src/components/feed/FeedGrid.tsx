'use client'

import { useState } from 'react'
import FeedItem from './FeedItem'

type Upload = {
  id: string
  imageUrl: string
  width: number | null
  height: number | null
  createdAt: string
}

type Props = {
  initialUploads: Upload[]
  initialCursor: string | null
}

export default function FeedGrid({ initialUploads, initialCursor }: Props) {
  const [uploads, setUploads] = useState(initialUploads)
  const [cursor, setCursor]   = useState(initialCursor)
  const [loading, setLoading] = useState(false)

  const loadMore = async () => {
    if (!cursor || loading) return
    setLoading(true)
    const res  = await fetch(`/api/feed?cursor=${encodeURIComponent(cursor)}`)
    const data = await res.json()
    setUploads((prev) => [...prev, ...data.uploads])
    setCursor(data.nextCursor)
    setLoading(false)
  }

  if (uploads.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-white/30">
        <p className="text-lg mb-4">No memes yet.</p>
        <a
          href="/create"
          className="px-4 py-2 rounded-lg text-sm font-medium bg-[#0fff95] text-[#24272f] hover:bg-[#0de882] transition-colors"
        >
          Be the first →
        </a>
      </div>
    )
  }

  return (
    <>
      <div className="columns-2 md:columns-3 lg:columns-4 gap-2 p-2">
        {uploads.map((u) => (
          <FeedItem key={u.id} id={u.id} imageUrl={u.imageUrl} width={u.width} height={u.height} />
        ))}
      </div>

      {cursor && (
        <div className="flex justify-center py-8">
          <button
            onClick={loadMore}
            disabled={loading}
            className="px-6 py-2.5 rounded-lg text-sm font-medium bg-[#363b44] text-white hover:bg-[#424850] transition-colors disabled:opacity-50"
          >
            {loading ? 'Loading…' : 'Load more'}
          </button>
        </div>
      )}
    </>
  )
}
