import { RotateCcw } from 'lucide-react'

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function formatDate(ts) {
  const d = new Date(ts)
  const month = MONTHS[d.getMonth()]
  const day   = d.getDate()
  const year  = d.getFullYear()
  const hh    = String(d.getHours()).padStart(2, '0')
  const mm    = String(d.getMinutes()).padStart(2, '0')
  return `Last edited ${month} ${day} ${year} ${hh}:${mm}`
}

export default function HistoryPanel({ entries, onRestore }) {
  return (
    <div className="flex flex-col min-h-0">
      {/* Entry list */}
      <div className="overflow-y-auto flex flex-col gap-1 p-2">
        {entries.length === 0 && (
          <p className="text-xs text-white/30 text-center py-4 px-2">
            No history yet — start a new document to save the current one here.
          </p>
        )}

        {entries.map((entry) => (
          <div
            key={entry.id}
            className="flex items-center gap-2 p-2 rounded-lg bg-[#2d3139] hover:bg-[#363b44] transition-colors group"
          >
            {/* Thumbnail or placeholder */}
            <div className="w-12 h-9 rounded bg-[#1e2127] shrink-0 overflow-hidden flex items-center justify-center">
              {entry.thumbnail
                ? <img src={entry.thumbnail} alt="" className="w-full h-full object-contain" />
                : <span className="text-white/20 text-[9px] text-center leading-tight px-1">
                    {entry.canvasSize?.width}×{entry.canvasSize?.height}
                  </span>
              }
            </div>

            {/* Meta */}
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-xs text-white/70 truncate">{formatDate(entry.savedAt)}</span>
              <span className="text-[10px] text-white/30">
                {entry.nodeCount} layer{entry.nodeCount !== 1 ? 's' : ''} · {entry.canvasSize?.width}×{entry.canvasSize?.height}
              </span>
            </div>

            {/* Restore button */}
            <button
              onClick={() => onRestore(entry.id)}
              title="Restore this document"
              className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded bg-[#424850] hover:bg-[#0fff95] hover:text-[#24272f] text-white"
            >
              <RotateCcw size={12} />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
