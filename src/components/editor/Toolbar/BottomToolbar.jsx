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
import { X, Check, ImagePlus, Layers, Maximize, Crop, Scissors, FlipHorizontal2, Trash2, Pencil, Palette, Paintbrush, Eraser, MousePointer2, Type, BoxSelect, ChevronRight, ChevronDown, Circle } from 'lucide-react'

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
  onAddImage,
  onFlip,
  onDelete,
  onOpacityChange,
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
  onOpacityStart,
  // Tool switching
  activeTool,
  onSetActiveTool,
  onCancelTextPlace,
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
}) {
  // ── Hooks must be declared before any early returns (Rules of Hooks) ───────
  const [toolsExpanded, setToolsExpanded] = useState(false)
  const [bgOpen, setBgOpen] = useState(false)
  const [sizeOverlayOpen, setSizeOverlayOpen] = useState(false)
  const [sizeOverlayPos, setSizeOverlayPos] = useState({ left: 0, bottom: 0 })
  const sizeBtnRef = useRef(null)
  const sizeOverlayRef = useRef(null)
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

  useEffect(() => {
    if (!sizeOverlayOpen || !isDrawing) return
    const handler = (e) => {
      if (sizeBtnRef.current?.contains(e.target) || sizeOverlayRef.current?.contains(e.target)) return
      setSizeOverlayOpen(false)
    }
    document.addEventListener('pointerdown', handler)
    return () => document.removeEventListener('pointerdown', handler)
  }, [sizeOverlayOpen, isDrawing])

  const isBold = selectedNode?.fontStyle?.includes('bold')
  const isItalic = selectedNode?.fontStyle?.includes('italic')

  // While resizing, show only confirm / cancel
  if (canvasResizeMode) {
    return (
      <footer className="flex items-center justify-center gap-3 px-4 h-14 bg-[#24272f] text-white shrink-0 border-t border-white/5">
        <button
          onClick={onCancelResize}
          className="flex items-center gap-1.5 px-4 py-2 rounded text-sm font-medium bg-red-700 hover:bg-red-600 transition-colors"
        >
          <X size={14} /> Cancel
        </button>
        <button
          onClick={onConfirmResize}
          className="flex items-center gap-1.5 px-4 py-2 rounded text-sm font-medium bg-[#0fff95] text-[#24272f] hover:bg-[#0de882] transition-colors"
        >
          <Check size={14} /> Apply Resize
        </button>
      </footer>
    )
  }

  // While in inline text editing, show font selector + confirm / cancel
  if (isTextEditing) {
    return (
      <footer
        className="flex items-center gap-3 px-4 h-14 bg-[#24272f] text-white shrink-0 border-t border-white/5 overflow-x-auto"
        style={{ WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {/* Font selector */}
        <select
          value={editingNode?.fontFamily ?? 'Anton'}
          onChange={(e) => onFontChange(e.target.value)}
          className="h-9 px-2 rounded text-sm bg-[#363b44] text-white border border-white/15 cursor-pointer shrink-0"
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
          className="flex items-center gap-1.5 px-4 py-2 rounded text-sm font-medium bg-red-700 hover:bg-red-600 transition-colors shrink-0"
        >
          <X size={14} /> Cancel
        </button>
        <button
          onClick={onConfirmTextEdit}
          className="flex items-center gap-1.5 px-4 py-2 rounded text-sm font-medium bg-[#0fff95] text-[#24272f] hover:bg-[#0de882] transition-colors shrink-0"
        >
          <Check size={14} /> Done
        </button>
      </footer>
    )
  }

  // While trimming (per-image crop), show only confirm / cancel
  if (cropMode) {
    return (
      <footer className="flex items-center justify-center gap-3 px-4 h-14 bg-[#24272f] text-white shrink-0 border-t border-white/5">
        <button
          onClick={onCancelCrop}
          className="flex items-center gap-1.5 px-4 py-2 rounded text-sm font-medium bg-red-700 hover:bg-red-600 transition-colors"
        >
          <X size={14} /> Cancel
        </button>
        <button
          onClick={onConfirmCrop}
          className="flex items-center gap-1.5 px-4 py-2 rounded text-sm font-medium bg-[#0fff95] text-[#24272f] hover:bg-[#0de882] transition-colors"
        >
          <Check size={14} /> Apply Trim
        </button>
      </footer>
    )
  }

  // While in canvas crop mode, show only confirm / cancel
  if (canvasCropMode) {
    return (
      <footer className="flex items-center justify-center gap-3 px-4 h-14 bg-[#24272f] text-white shrink-0 border-t border-white/5">
        <button
          onClick={onCancelCanvasCrop}
          className="flex items-center gap-1.5 px-4 py-2 rounded text-sm font-medium bg-red-700 hover:bg-red-600 transition-colors"
        >
          <X size={14} /> Cancel
        </button>
        <button
          onClick={onConfirmCanvasCrop}
          className="flex items-center gap-1.5 px-4 py-2 rounded text-sm font-medium bg-[#0fff95] text-[#24272f] hover:bg-[#0de882] transition-colors"
        >
          <Check size={14} /> Apply Crop
        </button>
      </footer>
    )
  }

  // While in text placement mode, show instructions and cancel
  if (activeTool === 'text') {
    return (
      <footer className="flex items-center justify-center gap-3 px-4 h-14 bg-[#24272f] text-white shrink-0 border-t border-white/5">
        <span className="text-sm text-white/60">Tap on the canvas to place text</span>
        <button
          onClick={onCancelTextPlace}
          className="flex items-center gap-1.5 px-4 py-2 rounded text-sm font-medium bg-red-700 hover:bg-red-600 transition-colors"
        >
          <X size={14} /> Cancel
        </button>
      </footer>
    )
  }

  // ── Normal toolbar ──────────────────────────────────────────────────────────

  return (
    <footer className="flex h-14 bg-[#24272f] text-white shrink-0 border-t border-white/5">

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
        className="flex items-center gap-2 px-4 h-14 overflow-x-auto"
        style={{ WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        onScroll={updateFades}
      >

      <button
        onClick={onAddImage}
        className="flex items-center gap-1 px-2 sm:px-3 py-2 rounded text-sm font-medium bg-[#363b44] text-white hover:bg-[#424850] transition-colors whitespace-nowrap shrink-0"
      >
        <ImagePlus size={14} /> <span className="hidden sm:inline">Import</span>
      </button>

      <div className="w-px h-6 bg-white/10 mx-0.5 shrink-0" />

      {/* Tool selector */}

      {/* Mobile: chevron toggle + collapsible list */}
      <button
        className="sm:hidden w-8 h-8 flex items-center justify-center rounded bg-[#2d3139] text-white/60 hover:text-white hover:bg-[#424850] transition-colors shrink-0"
        onClick={() => setToolsExpanded((p) => !p)}
        title={toolsExpanded ? 'Hide tools' : 'Show tools'}
      >
        {toolsExpanded ? <ChevronRight size={15} /> : <ChevronDown size={15} />}
      </button>

      <div
        className="sm:hidden overflow-hidden transition-all duration-200 ease-out shrink-0"
        style={{ maxWidth: toolsExpanded ? '216px' : '0px' }}
      >
        <div className="flex items-center bg-[#2d3139] rounded p-0.5 gap-0.5">
          {TOOLS.map((tool) => (
            <button
              key={tool.id}
              title={tool.title}
              onClick={() => onSetActiveTool(tool.id)}
              className={`w-8 h-8 flex items-center justify-center rounded transition-colors shrink-0 ${activeTool === tool.id ? 'bg-[#0fff95] text-[#24272f]' : 'text-white/60 hover:text-white hover:bg-[#424850]'}`}
            >
              <tool.Icon size={15} />
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
          <div className="w-px h-6 bg-white/10 mx-0.5 shrink-0" />

          {activeTool === 'brush' && (
            <input
              type="color"
              value={brushColor}
              onChange={(e) => onBrushColorChange(e.target.value)}
              className="w-8 h-8 rounded cursor-pointer bg-[#363b44] border-0 shrink-0"
              title="Brush colour"
              style={{ padding: '1px' }}
            />
          )}

          {/* Mobile: toggle button that opens a vertical size overlay */}
          <div className="relative sm:hidden shrink-0" ref={sizeBtnRef}>
            <button
              onClick={() => {
                if (!sizeOverlayOpen && sizeBtnRef.current) {
                  const rect = sizeBtnRef.current.getBoundingClientRect()
                  setSizeOverlayPos({ left: rect.left + rect.width / 2, bottom: window.innerHeight - rect.top + 8 })
                }
                setSizeOverlayOpen((o) => !o)
              }}
              title="Brush size"
              className={`w-8 h-8 flex items-center justify-center rounded transition-colors ${
                sizeOverlayOpen ? 'bg-[#0fff95] text-[#24272f]' : 'bg-[#2d3139] text-white/60 hover:text-white hover:bg-[#424850]'
              }`}
            >
              <Circle size={15} />
            </button>

            {sizeOverlayOpen && (
              <div
                ref={sizeOverlayRef}
                className="fixed bg-[#2d3139] border border-white/10 rounded-xl shadow-2xl flex flex-col items-center gap-2 px-3 py-4"
                style={{ left: sizeOverlayPos.left, bottom: sizeOverlayPos.bottom, transform: 'translateX(-50%)', zIndex: 50 }}
              >
                <span className="text-xs text-white/40 tabular-nums">{brushSize}px</span>
                <input
                  type="range"
                  min={2}
                  max={120}
                  step={1}
                  value={brushSize}
                  onChange={(e) => onBrushSizeChange(Number(e.target.value))}
                  className="accent-[#0fff95]"
                  style={{ writingMode: 'vertical-lr', direction: 'rtl', width: '36px', height: '120px', cursor: 'pointer' }}
                />
                <span className="text-xs text-white/40 tabular-nums">2px</span>
              </div>
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
              className="w-24 accent-[#0fff95]"
            />
            <span className="text-xs text-white/40 tabular-nums w-8">{brushSize}px</span>
          </div>
        </>
      )}

      {/* Layers toggle — hidden on desktop (handled by sidebar) */}
      <button
        onClick={onToggleLayerPanel}
        className={`sm:hidden flex items-center gap-1.5 px-2 py-2 rounded text-sm font-medium transition-colors whitespace-nowrap shrink-0 ${
          showLayerPanel
            ? 'bg-white text-[#24272f]'
            : 'bg-[#363b44] text-white hover:bg-[#424850]'
        }`}
      >
        <Layers size={14} />
      </button>

      {/* Resize */}
      <button
        onClick={onEnterResize}
        className="flex items-center gap-1.5 px-2 sm:px-3 py-2 rounded text-sm font-medium bg-[#363b44] text-white hover:bg-[#424850] transition-colors whitespace-nowrap shrink-0"
        title="Resize canvas"
      >
        <Maximize size={14} /> <span className="hidden sm:inline">Resize</span>
      </button>

      {/* Crop — visible when a node or marquee selection exists */}
      {(selectedNode || marqueeSelection) && (
        <button
          onClick={onEnterCanvasCrop}
          title="Crop canvas to selection"
          className="flex items-center gap-1.5 px-2 sm:px-3 py-2 rounded text-sm font-medium bg-[#363b44] text-white hover:bg-[#424850] transition-colors whitespace-nowrap shrink-0"
        >
          <Crop size={14} /> <span className="hidden sm:inline">Crop</span>
        </button>
      )}

      {/* Clear area — erase pixels within marquee selection on the active raster layer */}
      {!isDrawing && marqueeSelection && (
        <button
          onClick={onDeleteMarqueeArea}
          title="Erase pixels in selected area"
          className="flex items-center gap-1.5 px-2 sm:px-3 py-2 rounded text-sm font-medium bg-[#363b44] text-white hover:bg-[#424850] transition-colors whitespace-nowrap shrink-0"
        >
          <Eraser size={14} /> <span className="hidden sm:inline">Clear</span>
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
              className={`flex items-center gap-1.5 px-2 py-2 rounded text-sm font-medium transition-colors whitespace-nowrap ${
                bgOpen ? 'bg-white text-[#24272f]' : 'bg-[#363b44] text-white hover:bg-[#424850]'
              }`}
              title="Background color"
            >
              <Palette size={14} />
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

          <button
            onClick={onDelete}
            className="flex items-center gap-1.5 px-3 py-2 rounded text-sm bg-red-700 hover:bg-red-600 transition-colors whitespace-nowrap"
          >
            <Trash2 size={14} /> Delete
          </button>

          <div className="flex items-center gap-2 ml-1 shrink-0">
            <span className="hidden sm:block text-xs text-white/40 whitespace-nowrap">Opacity</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={selectedNode.opacity}
              onPointerDown={onOpacityStart}
              onChange={(e) => onOpacityChange(parseFloat(e.target.value))}
              className="w-24 accent-[#0fff95]"
            />
          </div>
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
            className={`w-11 py-2 rounded text-sm font-bold transition-colors whitespace-nowrap ${
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
            className={`w-11 py-2 rounded text-sm italic transition-colors whitespace-nowrap ${
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
              className="w-7 h-8 flex items-center justify-center rounded text-base bg-[#363b44] hover:bg-[#424850]"
              title="Decrease font size"
            >−</button>
            <span className="text-xs text-white/60 w-12 text-center tabular-nums">{selectedNode.fontSize}px</span>
            <button
              onClick={() => { onTextStyleStart(); onTextStyleChange({ fontSize: Math.min(400, selectedNode.fontSize + 4) }) }}
              className="w-7 h-8 flex items-center justify-center rounded text-base bg-[#363b44] hover:bg-[#424850]"
              title="Increase font size"
            >+</button>
          </div>

          {/* Text colour */}
          <input
            type="color"
            value={selectedNode.fill || '#ffffff'}
            onPointerDown={onTextStyleStart}
            onChange={(e) => onTextStyleChange({ fill: e.target.value })}
            className="w-8 h-8 rounded cursor-pointer bg-[#363b44] border-0 shrink-0"
            title="Text colour"
            style={{ padding: '1px' }}
          />

          {/* Stroke toggle + colour */}
          <button
            onClick={() => {
              const hasStroke = (selectedNode.strokeWidth ?? 0) > 0
              onTextStyleStart()
              onTextStyleChange({ strokeWidth: hasStroke ? 0 : 2 })
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
            <input
              type="color"
              value={selectedNode.stroke || '#000000'}
              onPointerDown={onTextStyleStart}
              onChange={(e) => onTextStyleChange({ stroke: e.target.value })}
              className="w-8 h-8 rounded cursor-pointer bg-[#363b44] border-0 shrink-0"
              title="Outline colour"
              style={{ padding: '1px' }}
            />
          )}

          <button
            onClick={onDelete}
            className="flex items-center gap-1.5 px-3 py-2 rounded text-sm bg-red-700 hover:bg-red-600 transition-colors whitespace-nowrap"
          >
            <Trash2 size={14} /> Delete
          </button>

          <div className="flex items-center gap-2 ml-1 shrink-0">
            <span className="hidden sm:block text-xs text-white/40 whitespace-nowrap">Opacity</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={selectedNode.opacity}
              onPointerDown={onOpacityStart}
              onChange={(e) => onOpacityChange(parseFloat(e.target.value))}
              className="w-24 accent-[#0fff95]"
            />
          </div>
        </>
      )}

      {/* Per-raster-layer controls */}
      {activeTool === 'select' && selectedNode?.type === 'raster' && (
        <>
          <div className="w-px h-6 bg-white/10 mx-1 shrink-0" />

          <button
            onClick={onDelete}
            className="flex items-center gap-1.5 px-3 py-2 rounded text-sm bg-red-700 hover:bg-red-600 transition-colors whitespace-nowrap"
          >
            <Trash2 size={14} /> Delete
          </button>

          <div className="flex items-center gap-2 ml-1 shrink-0">
            <span className="hidden sm:block text-xs text-white/40 whitespace-nowrap">Opacity</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={selectedNode.opacity}
              onPointerDown={onOpacityStart}
              onChange={(e) => onOpacityChange(parseFloat(e.target.value))}
              className="w-24 accent-[#0fff95]"
            />
          </div>
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
