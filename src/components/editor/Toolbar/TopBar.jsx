import { useState, useRef, useEffect } from 'react'
import { Undo2, Redo2, MoreHorizontal, Check, Download, ClipboardPaste, Upload, FilePlus, Link, Loader2, PanelRight, PanelRightClose, Clock } from 'lucide-react'

export default function TopBar({
  canvasResizeMode, onNew,
  onExport, onCopy, onPaste, onUndo, onRedo, canUndo, canRedo,
  pixelRatio, onTogglePixelRatio, canInstall, onInstall,
  version, onShare, uploadStatus,
  sidebarOpen, onToggleSidebar, onOpenHistory,
}) {
  const inMode = canvasResizeMode
  const [moreOpen, setMoreOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const moreRef   = useRef(null)
  const copyTimer = useRef(null)

  // Close the ⋯ dropdown when clicking outside
  useEffect(() => {
    if (!moreOpen) return
    const handler = (e) => {
      if (!moreRef.current?.contains(e.target)) setMoreOpen(false)
    }
    document.addEventListener('pointerdown', handler)
    return () => document.removeEventListener('pointerdown', handler)
  }, [moreOpen])

  const handleCopy = async () => {
    setMoreOpen(false)
    await onCopy()
    setCopied(true)
    clearTimeout(copyTimer.current)
    copyTimer.current = setTimeout(() => setCopied(false), 2000)
  }

  return (
    <header className="grid grid-cols-[1fr_auto_1fr] items-center px-3 h-14 sm:h-12 bg-[#24272f] text-white shrink-0">

      {/* ── Left: (empty — keeps undo/redo centered) ── */}
      <div />

      {/* ── Center: undo/redo ── */}
      <div className="flex items-center gap-1.5">
        <button
          onClick={onUndo}
          disabled={!canUndo || inMode}
          title="Undo (Cmd+Z)"
          className="w-11 h-11 sm:w-9 sm:h-9 flex items-center justify-center rounded text-base font-medium transition-colors bg-[#363b44] text-white hover:bg-[#424850] disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <Undo2 size={18} />
        </button>
        <button
          onClick={onRedo}
          disabled={!canRedo || inMode}
          title="Redo (Cmd+Shift+Z)"
          className="w-11 h-11 sm:w-9 sm:h-9 flex items-center justify-center rounded text-base font-medium transition-colors bg-[#363b44] text-white hover:bg-[#424850] disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <Redo2 size={18} />
        </button>
      </div>

      {/* ── Right: new · ⋯ more · paste · export ── */}
      <div className="flex items-center gap-1.5 justify-end">
        {/* New — desktop only (in More menu on mobile) */}
        <button
          onClick={onNew}
          title="New document"
          className="hidden sm:flex items-center gap-1.5 px-2.5 h-9 rounded text-xs font-medium bg-[#0fff95] text-[#24272f] hover:bg-[#0de882] transition-colors"
        >
          <FilePlus size={14} /> New
        </button>

        {/* ⋯ More dropdown */}
        <div className="relative" ref={moreRef}>
          <button
            onClick={() => setMoreOpen((o) => !o)}
            title="More options"
            className={`w-11 h-11 sm:w-9 sm:h-9 flex items-center justify-center rounded text-lg font-bold transition-colors ${
              moreOpen ? 'bg-[#424850] text-white' : 'bg-[#363b44] text-white/60 hover:bg-[#424850]'
            }`}
          >
            <MoreHorizontal size={18} />
          </button>

          {moreOpen && (
            <div className="absolute right-0 top-full mt-1.5 w-56 bg-[#2d3139] border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden">

              {/* New document — mobile only */}
              <button
                onClick={() => { setMoreOpen(false); onNew() }}
                className="w-full text-left px-4 py-3 text-sm text-white hover:bg-[#363b44] transition-colors sm:hidden flex items-center gap-2"
              >
                <FilePlus size={14} /> New document
              </button>

              {/* Paste image — mobile only */}
              <button
                onClick={() => { setMoreOpen(false); onPaste() }}
                className="w-full text-left px-4 py-3 text-sm text-white hover:bg-[#363b44] transition-colors sm:hidden flex items-center gap-2"
              >
                <ClipboardPaste size={14} /> Paste image
              </button>

              <div className="h-px bg-white/10 sm:hidden" />

              {/* History — mobile only */}
              <button
                onClick={() => { setMoreOpen(false); onOpenHistory() }}
                className="w-full text-left px-4 py-3 text-sm text-white hover:bg-[#363b44] transition-colors sm:hidden flex items-center gap-2"
              >
                <Clock size={14} /> History
              </button>

              <div className="h-px bg-white/10 sm:hidden" />

              {/* Export resolution toggle */}
              <button
                onClick={onTogglePixelRatio}
                className="w-full text-left px-4 py-3 text-sm text-white hover:bg-[#363b44] transition-colors flex items-center justify-between"
              >
                <span>Export resolution</span>
                <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${
                  pixelRatio === 2 ? 'bg-[#0fff95] text-[#24272f]' : 'bg-[#424850] text-white/60'
                }`}>{pixelRatio}×</span>
              </button>

              <div className="h-px bg-white/10" />

              {/* Copy to clipboard */}
              <button
                onClick={handleCopy}
                className="w-full text-left px-4 py-3 text-sm hover:bg-[#363b44] transition-colors"
              >
                {copied
                  ? <span className="text-[#0fff95] flex items-center gap-1.5"><Check size={14} /> Copied!</span>
                  : <span className="text-white">Copy to clipboard</span>
                }
              </button>

              {/* Install — only on supported browsers */}
              {canInstall && (
                <>
                  <div className="h-px bg-white/10" />
                  <button
                    onClick={() => { setMoreOpen(false); onInstall() }}
                    className="w-full text-left px-4 py-3 text-sm text-[#0fff95] hover:bg-[#363b44] transition-colors"
                  >
                    <span className="flex items-center gap-1.5"><Download size={14} /> Install app</span>
                  </button>
                </>
              )}

              {/* Version — always at the bottom */}
              <div className="h-px bg-white/10" />
              <div className="px-4 py-2 text-xs text-white/20 tabular-nums select-none">
                v{version}
              </div>
            </div>
          )}
        </div>

        {/* Paste — desktop only (in More menu on mobile) */}
        <button
          onClick={onPaste}
          title="Paste image from clipboard"
          className="hidden sm:flex items-center gap-1.5 px-3 h-9 rounded text-xs font-medium bg-[#363b44] text-white/60 hover:bg-[#424850] transition-colors"
        >
          <ClipboardPaste size={14} /> Paste
        </button>

        {/* Sidebar toggle — desktop only */}
        <button
          onClick={onToggleSidebar}
          title={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
          className="hidden sm:flex items-center justify-center w-9 h-9 rounded bg-[#363b44] text-white/60 hover:bg-[#424850] transition-colors"
        >
          {sidebarOpen ? <PanelRightClose size={16} /> : <PanelRight size={16} />}
        </button>
        <button
          onClick={onShare}
          disabled={uploadStatus === 'uploading' || inMode}
          title="Upload & share"
          className="flex items-center gap-1.5 px-3 h-11 sm:h-9 rounded text-xs font-medium bg-[#5865f2] text-white hover:bg-[#4752c4] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {uploadStatus === 'uploading'
            ? <Loader2 size={14} className="animate-spin" />
            : <Link size={14} />
          }
          Share
        </button>
        <button
          onClick={onExport}
          className="flex items-center gap-1.5 px-3 h-11 sm:h-9 rounded text-xs font-medium bg-[#0fff95] text-[#24272f] hover:bg-[#0de882] transition-colors"
        >
          <Upload size={14} /> Export
        </button>
      </div>
    </header>
  )
}
