import { useState, useRef, useEffect } from 'react'
import { Undo2, Redo2, MoreHorizontal, Check, Download, ClipboardPaste, Upload, FilePlus, ImagePlus, Loader2, PanelRight, PanelRightClose, Clock } from 'lucide-react'

export default function TopBar({
  canvasResizeMode, cropMode, canvasCropMode, onNew,
  onExport, onCopy, onPaste, onUndo, onRedo, canUndo, canRedo,
  onAddImage,
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
    <header className="flex flex-col bg-[#24272f] text-white shrink-0">

      {/* ── Main row ── */}
      <div className="flex items-center px-3 h-14 sm:grid sm:grid-cols-[1fr_auto_1fr] sm:h-12">

        {/* Left: import + new (desktop) */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={onNew}
            title="New document"
            className="flex items-center gap-1.5 px-2.5 h-11 sm:h-9 rounded text-xs font-medium bg-[#0fff95] text-[#24272f] hover:bg-[#0de882] transition-colors"
          >
            <FilePlus size={14} /> New
          </button>
          <button
            onClick={onAddImage}
            disabled={inMode || cropMode || canvasCropMode}
            title="Import image"
            className="flex items-center gap-1.5 px-3 h-11 sm:h-9 rounded text-xs font-medium bg-[#363b44] text-white/60 hover:bg-[#424850] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ImagePlus size={14} /> Import
          </button>
        </div>

        {/* Center: undo/redo — desktop only */}
        <div className="hidden sm:flex items-center gap-1.5">
          <button
            onClick={onUndo}
            disabled={!canUndo || inMode}
            title="Undo (Cmd+Z)"
            className="w-9 h-9 flex items-center justify-center rounded text-base font-medium transition-colors bg-[#363b44] text-white hover:bg-[#424850] disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <Undo2 size={18} />
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo || inMode}
            title="Redo (Cmd+Shift+Z)"
            className="w-9 h-9 flex items-center justify-center rounded text-base font-medium transition-colors bg-[#363b44] text-white hover:bg-[#424850] disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <Redo2 size={18} />
          </button>
        </div>

      {/* ── Right: ⋯ more · sidebar · share ── */}
      <div className="flex items-center gap-1.5 justify-end ml-auto sm:ml-0">

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

              {/* Export */}
              <button
                onClick={() => { setMoreOpen(false); onExport() }}
                className="w-full text-left px-4 py-3 text-sm text-white hover:bg-[#363b44] transition-colors flex items-center gap-2"
              >
                <Download size={14} /> Export
              </button>

              {/* Paste image */}
              <button
                onClick={() => { setMoreOpen(false); onPaste() }}
                className="w-full text-left px-4 py-3 text-sm text-white hover:bg-[#363b44] transition-colors flex items-center gap-2"
              >
                <ClipboardPaste size={14} /> Paste image
              </button>

              {/* History — mobile only */}
              <button
                onClick={() => { setMoreOpen(false); onOpenHistory() }}
                className="w-full text-left px-4 py-3 text-sm text-white hover:bg-[#363b44] transition-colors sm:hidden flex items-center gap-2"
              >
                <Clock size={14} /> History
              </button>

              <div className="h-px bg-white/10" />

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

        {/* Sidebar toggle — desktop only */}
        <button
          onClick={onToggleSidebar}
          title={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
          className="hidden sm:flex items-center justify-center w-9 h-9 rounded bg-[#363b44] text-white/60 hover:bg-[#424850] transition-colors"
        >
          {sidebarOpen ? <PanelRightClose size={16} /> : <PanelRight size={16} />}
        </button>

        {/* Share */}
        <button
          onClick={onShare}
          disabled={uploadStatus === 'uploading' || inMode}
          title="Upload & share"
          className="flex items-center gap-1.5 px-3 h-11 sm:h-9 rounded text-xs font-medium bg-[#0fff95] text-[#24272f] hover:bg-[#0de882] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {uploadStatus === 'uploading'
            ? <Loader2 size={14} className="animate-spin" />
            : <Upload size={14} />
          }
          Share
        </button>
      </div>

      </div>{/* end main row */}

    </header>
  )
}
