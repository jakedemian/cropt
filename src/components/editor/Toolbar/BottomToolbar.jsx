const FONTS = [
  { label: 'Anton',            value: 'Anton' },
  { label: 'Bangers',          value: 'Bangers' },
  { label: 'Roboto',           value: 'Roboto' },
  { label: 'Open Sans',        value: 'Open Sans' },
  { label: 'Oswald',           value: 'Oswald' },
  { label: 'Lora',             value: 'Lora' },
  { label: 'Playfair Display', value: 'Playfair Display' },
  { label: 'Comic Neue',       value: 'Comic Neue' },
  { label: 'Roboto Mono',      value: 'Roboto Mono' },
  { label: 'Permanent Marker', value: 'Permanent Marker' },
]

import { useState, useRef, useEffect, useCallback } from 'react'
import { X, Check, Layers, Maximize, Crop, Scissors, FlipHorizontal2, Pencil, Palette, Paintbrush, Eraser, MousePointer2, Type, BoxSelect, Wrench, ChevronLeft, ChevronRight, Circle, MoveHorizontal, Minus } from 'lucide-react'

const TOOLS = [
  { id: 'select',  title: 'Move',   Icon: MousePointer2 },
  { id: 'marquee', title: 'Select', Icon: BoxSelect },
  { id: 'brush',   title: 'Brush',  Icon: Paintbrush },
  { id: 'eraser',  title: 'Eraser', Icon: Eraser },
  { id: 'text',    title: 'Text',   Icon: Type },
]

const BG_OPTIONS = [
  { value: '#ffffff', title: 'White',       style: { background: '#fff', border: '1.5px solid rgba(255,255,255,0.2)' } },
  { value: '#000000', title: 'Black',       style: { background: '#000', border: '1.5px solid rgba(255,255,255,0.2)' } },
  { value: 'transparent', title: 'Transparent', style: { background: 'repeating-conic-gradient(#363b44 0% 25%, #24272f 0% 50%) 0 0 / 8px 8px', border: '1.5px solid rgba(255,255,255,0.2)' } },
]


export default function BottomToolbar({
  canvasResizeMode,
  cropMode,
  isTextEditing,
  selectedNode,
  canvasSize,
  canvasBackground,
  showLayerPanel,
  onFlip,
  onSetBackground,
  onToggleLayerPanel,
  marqueeSelection,
  onDeleteMarqueeArea,
  canvasCropMode,
  onEnterCanvasCrop,
  onConfirmCanvasCrop,
  onCancelCanvasCrop,
  onEnterResize,
  onConfirmResize,
  onCancelResize,
  onEnterCrop,
  onConfirmCrop,
  onCancelCrop,
  // Tool switching
  activeTool,
  onSetActiveTool,
  // Text edit mode
  onEnterTextEdit,
  onConfirmTextEdit,
  onCancelTextEdit,
  onTextStyleStart,
  onTextStyleChange,
  editingNode,
  onFontChange,
  // Brush config
  brushColor,
  brushSize,
  onBrushColorChange,
  onBrushSizeChange,
  stageScale = 1,
}) {
  // ── Hooks must be declared before any early returns (Rules of Hooks) ───────
  const [toolsExpanded, setToolsExpanded] = useState(false)
  const [bgOpen, setBgOpen] = useState(false)
  const [sizeOverlayOpen, setSizeOverlayOpen] = useState(false)
  const [sizeOverlayPos, setSizeOverlayPos] = useState({ left: 0, bottom: 0 })
  const sizeBtnRef = useRef(null)
  const sizeOverlayRef = useRef(null)
  const scrubStateRef = useRef({ active: false, startX: 0, startSize: 20, didMove: false })
  const [strokeSizeOverlayOpen, setStrokeSizeOverlayOpen] = useState(false)
  const [strokeSizeOverlayPos, setStrokeSizeOverlayPos] = useState({ left: 0, bottom: 0 })
  const strokeSizeBtnRef = useRef(null)
  const strokeSizeOverlayRef = useRef(null)
  const strokeScrubStateRef = useRef({ active: false, startX: 0, startSize: 2, didMove: false })
  const [showLeftFade,  setShowLeftFade]  = useState(false)
  const [showRightFade, setShowRightFade] = useState(false)
  const scrollRef = useRef(null)

  const updateFades = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    setShowLeftFade(el.scrollLeft > 0)
    setShowRightFade(Math.ceil(el.scrollLeft) < el.scrollWidth - el.clientWidth)
  }, [])

  // Re-check after every render — content changes (different controls shown)
  // affect scrollWidth and need a fresh fade calculation.
  useEffect(updateFades)
  const bgBtnRef = useRef(null)
  const bgMenuRef = useRef(null)
  const [bgPos, setBgPos] = useState({ left: 0, bottom: 0 })

  useEffect(() => {
    if (!bgOpen) return
    const handler = (e) => {
      if (bgBtnRef.current?.contains(e.target) || bgMenuRef.current?.contains(e.target)) return
      setBgOpen(false)
    }
    document.addEventListener('pointerdown', handler)
    return () => document.removeEventListener('pointerdown', handler)
  }, [bgOpen])

  const isDrawing = activeTool === 'brush' || activeTool === 'eraser'
  const ActiveToolIcon = TOOLS.find(t => t.id === activeTool)?.Icon ?? TOOLS[0].Icon

  useEffect(() => {
    if (!sizeOverlayOpen || !isDrawing) return
    const handler = (e) => {
      if (scrubStateRef.current.active) return
      if (sizeBtnRef.current?.contains(e.target) || sizeOverlayRef.current?.contains(e.target)) return
      setSizeOverlayOpen(false)
    }
    document.addEventListener('pointerdown', handler)
    return () => document.removeEventListener('pointerdown', handler)
  }, [sizeOverlayOpen, isDrawing])

  useEffect(() => {
    if (!strokeSizeOverlayOpen) return
    const handler = (e) => {
      if (strokeScrubStateRef.current.active) return
      if (strokeSizeBtnRef.current?.contains(e.target) || strokeSizeOverlayRef.current?.contains(e.target)) return
      setStrokeSizeOverlayOpen(false)
    }
    document.addEventListener('pointerdown', handler)
    return () => document.removeEventListener('pointerdown', handler)
  }, [strokeSizeOverlayOpen])

  const isBold = selectedNode?.fontStyle?.includes('bold')
  const isItalic = selectedNode?.fontStyle?.includes('italic')

  // While resizing, show only confirm / cancel
  if (canvasResizeMode) {
    return (
      <footer className="flex items-center justify-center gap-3 px-4 h-16 sm:h-14 bg-[#24272f] text-white shrink-0 border-t border-white/5">
        <button
          onClick={onCancelResize}
          className="flex items-center gap-1.5 px-5 py-3 sm:px-4 sm:py-2 rounded text-sm font-medium bg-red-700 hover:bg-red-600 transition-colors"
        >
          <X size={16} /> Cancel
        </button>
        <button
          onClick={onConfirmResize}
          className="flex items-center gap-1.5 px-5 py-3 sm:px-4 sm:py-2 rounded text-sm font-medium bg-[#0fff95] text-[#24272f] hover:bg-[#0de882] transition-colors"
        >
          <Check size={16} /> Apply Resize
        </button>
      </footer>
    )
  }

  // While in inline text editing, show font selector + confirm / cancel
  if (isTextEditing) {
    return (
      <footer
        className="flex items-center gap-3 px-4 h-16 sm:h-14 bg-[#24272f] text-white shrink-0 border-t border-white/5 overflow-x-auto"
        style={{ WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {/* Font selector */}
        <select
          value={editingNode?.fontFamily ?? 'Anton'}
          onChange={(e) => onFontChange(e.target.value)}
          className="h-11 sm:h-9 px-2 rounded text-sm bg-[#363b44] text-white border border-white/15 cursor-pointer shrink-0"
          style={{ fontFamily: editingNode?.fontFamily ?? 'Anton' }}
          title="Font family"
        >
          {FONTS.map(({ label, value }) => (
            <option key={value} value={value} style={{ fontFamily: value }}>
              {label}
            </option>
          ))}
        </select>

        <div className="flex-1" />

        {/* Keyboard hint — only useful on desktop with a physical keyboard */}
        <span className="hidden sm:block text-xs text-white/40 whitespace-nowrap">Cmd+Enter to confirm · Esc to cancel</span>
        <button
          onClick={onCancelTextEdit}
          className="flex items-center gap-1.5 px-5 py-3 sm:px-4 sm:py-2 rounded text-sm font-medium bg-red-700 hover:bg-red-600 transition-colors shrink-0"
        >
          <X size={16} /> Cancel
        </button>
        <button
          onClick={onConfirmTextEdit}
          className="flex items-center gap-1.5 px-5 py-3 sm:px-4 sm:py-2 rounded text-sm font-medium bg-[#0fff95] text-[#24272f] hover:bg-[#0de882] transition-colors shrink-0"
        >
          <Check size={16} /> Done
        </button>
      </footer>
    )
  }

  // While trimming (per-image crop), show only confirm / cancel
  if (cropMode) {
    return (
      <footer className="flex items-center justify-center gap-3 px-4 h-16 sm:h-14 bg-[#24272f] text-white shrink-0 border-t border-white/5">
        <button
          onClick={onCancelCrop}
          className="flex items-center gap-1.5 px-5 py-3 sm:px-4 sm:py-2 rounded text-sm font-medium bg-red-700 hover:bg-red-600 transition-colors"
        >
          <X size={16} /> Cancel
        </button>
        <button
          onClick={onConfirmCrop}
          className="flex items-center gap-1.5 px-5 py-3 sm:px-4 sm:py-2 rounded text-sm font-medium bg-[#0fff95] text-[#24272f] hover:bg-[#0de882] transition-colors"
        >
          <Check size={16} /> Apply Trim
        </button>
      </footer>
    )
  }

  // While in canvas crop mode, show only confirm / cancel
  if (canvasCropMode) {
    return (
      <footer className="flex items-center justify-center gap-3 px-4 h-16 sm:h-14 bg-[#24272f] text-white shrink-0 border-t border-white/5">
        <button
          onClick={onCancelCanvasCrop}
          className="flex items-center gap-1.5 px-5 py-3 sm:px-4 sm:py-2 rounded text-sm font-medium bg-red-700 hover:bg-red-600 transition-colors"
        >
          <X size={16} /> Cancel
        </button>
        <button
          onClick={onConfirmCanvasCrop}
          className="flex items-center gap-1.5 px-5 py-3 sm:px-4 sm:py-2 rounded text-sm font-medium bg-[#0fff95] text-[#24272f] hover:bg-[#0de882] transition-colors"
        >
          <Check size={16} /> Apply Crop
        </button>
      </footer>
    )
  }

  // ── Normal toolbar ──────────────────────────────────────────────────────────

  return (
    <footer className="flex h-16 sm:h-14 bg-[#24272f] text-white shrink-0 border-t border-white/5">

      {/* Scrollable controls region + fade hints */}
      <div className="flex-1 relative min-w-0">
        {showLeftFade && (
          <div className="absolute left-0 top-0 bottom-0 w-8 pointer-events-none z-10"
            style={{ background: 'linear-gradient(to right, #24272f, transparent)' }} />
        )}
        {showRightFade && (
          <div className="absolute right-0 top-0 bottom-0 w-8 pointer-events-none z-10"
            style={{ background: 'linear-gradient(to left, #24272f, transparent)' }} />
        )}
      <div
        ref={scrollRef}
        className="flex items-center gap-2 px-4 h-16 sm:h-14 overflow-x-auto"
        style={{ WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        onScroll={updateFades}
      >

      {/* Tool selector */}

      {/* Mobile: wrench toggle + active tool indicator + collapsible list */}
      <div className="sm:hidden flex items-center shrink-0">
        <button
          className="w-10 h-10 flex items-center justify-center rounded bg-[#2d3139] text-white/60 hover:text-white hover:bg-[#424850] transition-colors"
          onClick={() => setToolsExpanded((p) => !p)}
          title={toolsExpanded ? 'Hide tools' : 'Show tools'}
        >
          {toolsExpanded ? <ChevronLeft size={18} /> : <><Wrench size={17} /><ChevronRight size={14} className="-ml-0.5" /></>}
        </button>
        {!toolsExpanded && (
          <span className={`w-7 h-7 flex items-center justify-center pointer-events-none ${activeTool === 'eraser' ? 'text-red-400' : 'text-[#0fff95]'}`}>
            <ActiveToolIcon size={18} />
          </span>
        )}
      </div>

      <div
        className="sm:hidden overflow-hidden transition-all duration-200 ease-out shrink-0"
        style={{ maxWidth: toolsExpanded ? '216px' : '0px' }}
      >
        <div className="flex items-center bg-[#2d3139] rounded-full p-0.5 gap-0.5">
          {TOOLS.map((tool) => (
            <button
              key={tool.id}
              title={tool.title}
              onClick={() => { onSetActiveTool(tool.id); setToolsExpanded(false) }}
              className={`w-10 h-10 flex items-center justify-center rounded-full transition-colors shrink-0 ${activeTool === tool.id ? 'bg-[#0fff95] text-[#24272f]' : 'text-white/60 hover:text-white hover:bg-[#424850]'}`}
            >
              <tool.Icon size={18} />
            </button>
          ))}
        </div>
      </div>

      {/* Desktop: always visible in fixed order */}
      <div className="hidden sm:flex items-center bg-[#2d3139] rounded p-0.5 gap-0.5 shrink-0">
        {TOOLS.map((tool) => (
          <button
            key={tool.id}
            title={tool.title}
            onClick={() => onSetActiveTool(tool.id)}
            className={`w-8 h-8 flex items-center justify-center rounded transition-colors ${activeTool === tool.id ? 'bg-[#0fff95] text-[#24272f]' : 'text-white/60 hover:text-white hover:bg-[#424850]'}`}
          >
            <tool.Icon size={15} />
          </button>
        ))}
      </div>

      {/* Brush controls — inline when draw tool is active */}
      {isDrawing && (
        <>
          {activeTool === 'brush' && (
            <div className="relative w-8 h-8 sm:w-6 sm:h-6 shrink-0" title="Brush colour">
              <input
                type="color"
                value={brushColor}
                onChange={(e) => onBrushColorChange(e.target.value)}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <div
                className="w-full h-full rounded-full border border-white/20 pointer-events-none"
                style={{ background: brushColor }}
              />
            </div>
          )}

          {/* Mobile: vertical scrub gesture to change brush size */}
          <div className="relative sm:hidden shrink-0" ref={sizeBtnRef}>
            <button
              title="Drag left/right to change brush size"
              style={{ touchAction: 'none' }}
              onPointerDown={(e) => {
                e.preventDefault()
                e.stopPropagation()
                const s = scrubStateRef.current
                s.active = true
                s.startX = e.clientX
                s.startSize = brushSize
                s.didMove = false
                if (sizeBtnRef.current) {
                  const rect = sizeBtnRef.current.getBoundingClientRect()
                  setSizeOverlayPos({ left: rect.left + rect.width / 2, bottom: window.innerHeight - rect.top + 8 })
                }
                setSizeOverlayOpen(true)
                e.currentTarget.setPointerCapture(e.pointerId)
              }}
              onPointerMove={(e) => {
                const s = scrubStateRef.current
                if (!s.active) return
                if (Math.abs(e.clientX - s.startX) > 4) s.didMove = true
                const delta = (e.clientX - s.startX) / 1.5
                const newSize = Math.round(Math.min(120, Math.max(2, s.startSize + delta)))
                onBrushSizeChange(newSize)
              }}
              onPointerUp={() => {
                scrubStateRef.current.active = false
                setSizeOverlayOpen(false)
              }}
              className={`w-10 h-10 flex items-center justify-center rounded transition-colors ${sizeOverlayOpen ? 'bg-white text-[#24272f]' : 'bg-[#2d3139] text-white/60 hover:text-white hover:bg-[#424850]'}`}
            >
              {sizeOverlayOpen ? <MoveHorizontal size={18} /> : <Circle size={18} />}
            </button>

            {sizeOverlayOpen && (
              <>
                {/* Bar popover — fixed size */}
                <div
                  ref={sizeOverlayRef}
                  className="fixed bg-[#2d3139] border border-white/10 rounded-xl shadow-2xl flex flex-row items-center gap-2 px-3 py-3 pointer-events-none"
                  style={{ left: sizeOverlayPos.left, bottom: sizeOverlayPos.bottom, transform: 'translateX(-50%)', zIndex: 50 }}
                >
                  <span className="text-xs text-white/40 tabular-nums">2px</span>
                  <div className="w-28 h-1 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-[#0fff95]/60 rounded-full" style={{ width: `${((brushSize - 2) / 118) * 100}%` }} />
                  </div>
                  <span className="text-xs text-white/40 tabular-nums w-10 text-right">{brushSize}px</span>
                </div>

                {/* Circle preview — floats above the bar, grows freely */}
                <div
                  className="fixed pointer-events-none flex items-end justify-center"
                  style={{ left: sizeOverlayPos.left, bottom: sizeOverlayPos.bottom + 56, transform: 'translateX(-50%)', zIndex: 50 }}
                >
                  <div
                    className="rounded-full bg-white/15 border border-white/40"
                    style={{ width: brushSize * stageScale, height: brushSize * stageScale }}
                  />
                </div>
              </>
            )}
          </div>

          {/* Desktop: original inline horizontal slider */}
          <div className="hidden sm:flex items-center gap-2 shrink-0">
            <span className="text-xs text-white/40 whitespace-nowrap">Size</span>
            <input
              type="range"
              min={2}
              max={120}
              step={1}
              value={brushSize}
              onChange={(e) => onBrushSizeChange(Number(e.target.value))}
              className="w-28 sm:w-24 accent-[#0fff95]"
            />
            <span className="text-xs text-white/40 tabular-nums w-8">{brushSize}px</span>
          </div>
        </>
      )}

      {/* Clear area — erase pixels within marquee selection on the active raster layer */}
      {!isDrawing && marqueeSelection && (
        <button
          onClick={onDeleteMarqueeArea}
          title="Erase pixels in selected area"
          className="flex items-center gap-1.5 px-3 py-3 sm:px-3 sm:py-2 rounded text-sm font-medium bg-[#363b44] text-white hover:bg-[#424850] transition-colors whitespace-nowrap shrink-0"
        >
          <Eraser size={16} /> <span className="hidden sm:inline">Clear</span>
        </button>
      )}

      {/* Divider — separates tool-specific controls from canvas/document controls */}
      {(isDrawing || marqueeSelection) && (
        <div className="w-px h-6 bg-white/10 mx-1 shrink-0" />
      )}

      {/* Layers toggle — hidden on desktop (handled by sidebar) */}
      <button
        onClick={onToggleLayerPanel}
        className={`sm:hidden flex items-center gap-1.5 px-3 py-3 rounded text-sm font-medium transition-colors whitespace-nowrap shrink-0 ${
          showLayerPanel
            ? 'bg-white text-[#24272f]'
            : 'bg-[#363b44] text-white hover:bg-[#424850]'
        }`}
      >
        <Layers size={16} />
      </button>

      {/* Resize */}
      <button
        onClick={onEnterResize}
        className="flex items-center gap-1.5 px-3 py-3 sm:px-3 sm:py-2 rounded text-sm font-medium bg-[#363b44] text-white hover:bg-[#424850] transition-colors whitespace-nowrap shrink-0"
        title="Resize canvas"
      >
        <Maximize size={16} /> <span className="hidden sm:inline">Resize</span>
      </button>

      {/* Crop — visible when a non-text node or marquee selection exists */}
      {((selectedNode?.type !== 'text' && selectedNode) || marqueeSelection) && (
        <button
          onClick={onEnterCanvasCrop}
          title="Crop canvas to selection"
          className="flex items-center gap-1.5 px-3 py-3 sm:px-3 sm:py-2 rounded text-sm font-medium bg-[#363b44] text-white hover:bg-[#424850] transition-colors whitespace-nowrap shrink-0"
        >
          <Crop size={16} /> <span className="hidden sm:inline">Crop</span>
        </button>
      )}

      {/* Background picker — visible when nothing is selected and not drawing */}
      {!isDrawing && !selectedNode && (
        <>
          {/* Desktop: inline */}
          <div className="hidden sm:contents">
            <div className="w-px h-6 bg-white/10 mx-1 shrink-0" />
            <span className="text-xs text-white/40 whitespace-nowrap">BG</span>
            <div className="flex items-center gap-1">
              {BG_OPTIONS.map(({ value, title, style }) => (
                <button
                  key={value}
                  title={title}
                  onClick={() => onSetBackground(value)}
                  className="w-7 h-7 rounded transition-transform hover:scale-110"
                  style={{
                    ...style,
                    outline: canvasBackground === value ? '2px solid #0fff95' : '2px solid transparent',
                    outlineOffset: '2px',
                  }}
                />
              ))}
            </div>
          </div>

          {/* Mobile: popover */}
          <div className="relative sm:hidden shrink-0">
            <button
              ref={bgBtnRef}
              onClick={() => {
                if (!bgOpen && bgBtnRef.current) {
                  const rect = bgBtnRef.current.getBoundingClientRect()
                  setBgPos({ left: rect.left, bottom: window.innerHeight - rect.top + 6 })
                }
                setBgOpen((o) => !o)
              }}
              className={`flex items-center gap-1.5 px-3 py-3 rounded text-sm font-medium transition-colors whitespace-nowrap ${
                bgOpen ? 'bg-white text-[#24272f]' : 'bg-[#363b44] text-white hover:bg-[#424850]'
              }`}
              title="Background color"
            >
              <Palette size={16} />
            </button>

            {bgOpen && (
              <div
                ref={bgMenuRef}
                className="fixed bg-[#2d3139] border border-white/10 rounded-xl shadow-2xl overflow-hidden p-3"
                style={{ left: bgPos.left, bottom: bgPos.bottom, zIndex: 50 }}
              >
                <span className="text-xs text-white/40 block mb-2">Background</span>
                <div className="flex items-center gap-2">
                  {BG_OPTIONS.map(({ value, title, style }) => (
                    <button
                      key={value}
                      title={title}
                      onClick={() => { onSetBackground(value); setBgOpen(false) }}
                      className="w-9 h-9 rounded transition-transform hover:scale-110"
                      style={{
                        ...style,
                        outline: canvasBackground === value ? '2px solid #0fff95' : '2px solid transparent',
                        outlineOffset: '2px',
                      }}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Per-node controls — only shown when select tool is active */}

      {/* Per-image controls */}
      {activeTool === 'select' && selectedNode?.type === 'image' && (
        <>
          <div className="w-px h-6 bg-white/10 mx-1 shrink-0" />

          <button
            onClick={onEnterCrop}
            disabled={selectedNode.rotation !== 0}
            title={selectedNode.rotation !== 0 ? 'Flatten rotation before trimming' : 'Trim image'}
            className="flex items-center gap-1.5 px-3 py-2 rounded text-sm bg-[#363b44] hover:bg-[#424850] transition-colors whitespace-nowrap disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Scissors size={14} /> Trim
          </button>

          <button
            onClick={onFlip}
            className="flex items-center gap-1.5 px-3 py-2 rounded text-sm bg-[#363b44] hover:bg-[#424850] transition-colors whitespace-nowrap"
          >
            <FlipHorizontal2 size={14} /> Flip
          </button>

        </>
      )}

      {/* Per-text controls */}
      {activeTool === 'select' && selectedNode?.type === 'text' && (
        <>
          <div className="w-px h-6 bg-white/10 mx-1 shrink-0" />

          {/* Re-enter edit mode */}
          <button
            onClick={onEnterTextEdit}
            className="flex items-center gap-1.5 px-3 py-2 rounded text-sm bg-[#363b44] hover:bg-[#424850] transition-colors whitespace-nowrap"
            title="Edit text (double-tap also works)"
          >
            <Pencil size={14} /> Edit
          </button>

          {/* Bold */}
          <button
            onClick={() => {
              const newBold = !isBold
              const newStyle = [newBold ? 'bold' : null, isItalic ? 'italic' : null].filter(Boolean).join(' ') || 'normal'
              onTextStyleStart()
              onTextStyleChange({ fontStyle: newStyle })
            }}
            className={`px-4 py-2 flex items-center justify-center rounded text-sm font-bold transition-colors whitespace-nowrap shrink-0 ${
              isBold ? 'bg-[#0fff95] text-[#24272f]' : 'bg-[#363b44] hover:bg-[#424850]'
            }`}
            title="Bold"
          >
            B
          </button>

          {/* Italic */}
          <button
            onClick={() => {
              const newItalic = !isItalic
              const newStyle = [isBold ? 'bold' : null, newItalic ? 'italic' : null].filter(Boolean).join(' ') || 'normal'
              onTextStyleStart()
              onTextStyleChange({ fontStyle: newStyle })
            }}
            className={`px-4 py-2 flex items-center justify-center rounded text-sm italic transition-colors whitespace-nowrap shrink-0 ${
              isItalic ? 'bg-[#0fff95] text-[#24272f]' : 'bg-[#363b44] hover:bg-[#424850]'
            }`}
            title="Italic"
          >
            I
          </button>

          {/* Font size stepper */}
          <div className="flex items-center gap-0.5 shrink-0">
            <button
              onClick={() => { onTextStyleStart(); onTextStyleChange({ fontSize: Math.max(8, selectedNode.fontSize - 4) }) }}
              className="w-9 h-10 sm:w-7 sm:h-8 flex items-center justify-center rounded text-base bg-[#363b44] hover:bg-[#424850]"
              title="Decrease font size"
            >−</button>
            <span className="text-xs text-white/60 w-12 text-center tabular-nums">{selectedNode.fontSize}px</span>
            <button
              onClick={() => { onTextStyleStart(); onTextStyleChange({ fontSize: Math.min(400, selectedNode.fontSize + 4) }) }}
              className="w-9 h-10 sm:w-7 sm:h-8 flex items-center justify-center rounded text-base bg-[#363b44] hover:bg-[#424850]"
              title="Increase font size"
            >+</button>
          </div>

          {/* Text colour */}
          <div className="relative w-8 h-8 sm:w-6 sm:h-6 shrink-0" title="Text colour">
            <input
              type="color"
              value={selectedNode.fill || '#ffffff'}
              onPointerDown={onTextStyleStart}
              onChange={(e) => onTextStyleChange({ fill: e.target.value })}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <div
              className="w-full h-full rounded-full border border-white/20 pointer-events-none"
              style={{ background: selectedNode.fill || '#ffffff' }}
            />
          </div>

          {/* Divider — separates text style from stroke/outline controls */}
          <div className="w-px h-6 bg-white/10 mx-1 shrink-0" />

          {/* Stroke toggle + colour */}
          <button
            onClick={() => {
              const hasStroke = (selectedNode.strokeWidth ?? 0) > 0
              onTextStyleStart()
              onTextStyleChange({ strokeWidth: hasStroke ? 0 : 6 })
            }}
            className={`px-3 py-2 rounded text-sm transition-colors whitespace-nowrap ${
              (selectedNode.strokeWidth ?? 0) > 0
                ? 'bg-[#0fff95] text-[#24272f]'
                : 'bg-[#363b44] hover:bg-[#424850]'
            }`}
            title="Toggle text outline"
          >
            Outline
          </button>

          {(selectedNode.strokeWidth ?? 0) > 0 && (
            <>
              <div className="relative w-8 h-8 sm:w-6 sm:h-6 shrink-0" title="Outline colour">
                <input
                  type="color"
                  value={selectedNode.stroke || '#000000'}
                  onPointerDown={onTextStyleStart}
                  onChange={(e) => onTextStyleChange({ stroke: e.target.value })}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div
                  className="w-full h-full rounded-full border border-white/20 pointer-events-none"
                  style={{ background: selectedNode.stroke || '#000000' }}
                />
              </div>

              {/* Mobile: scrub gesture to change stroke width */}
              <div className="relative sm:hidden shrink-0" ref={strokeSizeBtnRef}>
                <button
                  title="Drag left/right to change outline width"
                  style={{ touchAction: 'none' }}
                  onPointerDown={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    const s = strokeScrubStateRef.current
                    s.active = true
                    s.startX = e.clientX
                    s.startSize = selectedNode.strokeWidth ?? 2
                    s.didMove = false
                    onTextStyleStart()
                    if (strokeSizeBtnRef.current) {
                      const rect = strokeSizeBtnRef.current.getBoundingClientRect()
                      setStrokeSizeOverlayPos({ left: rect.left + rect.width / 2, bottom: window.innerHeight - rect.top + 8 })
                    }
                    setStrokeSizeOverlayOpen(true)
                    e.currentTarget.setPointerCapture(e.pointerId)
                  }}
                  onPointerMove={(e) => {
                    const s = strokeScrubStateRef.current
                    if (!s.active) return
                    if (Math.abs(e.clientX - s.startX) > 4) s.didMove = true
                    const delta = (e.clientX - s.startX) / 2
                    const newSize = Math.round(Math.min(30, Math.max(1, s.startSize + delta)))
                    onTextStyleChange({ strokeWidth: newSize })
                  }}
                  onPointerUp={() => {
                    strokeScrubStateRef.current.active = false
                    setStrokeSizeOverlayOpen(false)
                  }}
                  className={`w-10 h-10 flex items-center justify-center rounded transition-colors ${
                    strokeSizeOverlayOpen ? 'bg-white text-[#24272f]' : 'bg-[#2d3139] text-white/60 hover:text-white hover:bg-[#424850]'
                  }`}
                >
                  {strokeSizeOverlayOpen ? <MoveHorizontal size={18} /> : <Minus size={18} />}
                </button>

                {strokeSizeOverlayOpen && (
                  <>
                    {/* Bar popover */}
                    <div
                      ref={strokeSizeOverlayRef}
                      className="fixed bg-[#2d3139] border border-white/10 rounded-xl shadow-2xl flex flex-row items-center gap-2 px-3 py-3 pointer-events-none"
                      style={{ left: strokeSizeOverlayPos.left, bottom: strokeSizeOverlayPos.bottom, transform: 'translateX(-50%)', zIndex: 50 }}
                    >
                      <span className="text-xs text-white/40 tabular-nums">1px</span>
                      <div className="w-28 h-1 bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full bg-[#0fff95]/60 rounded-full" style={{ width: `${((selectedNode.strokeWidth - 1) / 29) * 100}%` }} />
                      </div>
                      <span className="text-xs text-white/40 tabular-nums w-10 text-right">{selectedNode.strokeWidth}px</span>
                    </div>

                    {/* Line preview — floats above the bar */}
                    <div
                      className="fixed pointer-events-none flex items-end justify-center"
                      style={{ left: strokeSizeOverlayPos.left, bottom: strokeSizeOverlayPos.bottom + 56, transform: 'translateX(-50%)', zIndex: 50 }}
                    >
                      <div
                        className="bg-white/70 rounded-full"
                        style={{ width: 48, height: Math.max(1, Math.round(selectedNode.strokeWidth / 2)) }}
                      />
                    </div>
                  </>
                )}
              </div>

              {/* Desktop: inline range slider */}
              <div className="hidden sm:flex items-center gap-2 shrink-0">
                <span className="text-xs text-white/40 whitespace-nowrap">Thickness</span>
                <input
                  type="range"
                  min={1}
                  max={30}
                  step={1}
                  value={selectedNode.strokeWidth ?? 2}
                  onPointerDown={onTextStyleStart}
                  onChange={(e) => onTextStyleChange({ strokeWidth: Number(e.target.value) })}
                  className="w-20 accent-[#0fff95]"
                />
                <span className="text-xs text-white/40 tabular-nums w-8">{selectedNode.strokeWidth}px</span>
              </div>
            </>
          )}

        </>
      )}

      </div>{/* end scroll div */}
      </div>{/* end scrollable controls + fades */}

      {/* Fixed dimensions — always visible regardless of scroll position */}
      <div className="shrink-0 flex items-center px-3 border-l border-black/15">
        <span className="text-xs text-white/30 tabular-nums whitespace-nowrap">{canvasSize.width}×{canvasSize.height}</span>
      </div>
    </footer>
  )
}
