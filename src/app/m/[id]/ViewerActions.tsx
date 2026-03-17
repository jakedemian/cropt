'use client'

import { useState } from 'react'
import { Check, Link } from 'lucide-react'

export default function ViewerActions({ id, shareUrl }: { id: string; shareUrl: string }) {
  const [copied, setCopied]   = useState(false)
  const [reported, setReported] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleReport = async () => {
    if (reported) return
    await fetch('/api/report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    setReported(true)
  }

  return (
    <div className="flex items-center justify-between px-4 pb-3 pt-1 md:pb-6 md:pt-2 shrink-0">
      <button
        onClick={handleReport}
        disabled={reported}
        className="text-xs text-white/20 hover:text-white/40 transition-colors disabled:cursor-default"
      >
        {reported ? 'Reported' : 'Report'}
      </button>
      <button
        onClick={handleCopy}
        className="flex items-center gap-1.5 px-3 h-9 rounded text-xs font-medium bg-[#363b44] text-white hover:bg-[#424850] transition-colors"
      >
        {copied ? <><Check size={13} /> Copied!</> : <><Link size={13} /> Copy link</>}
      </button>
    </div>
  )
}
