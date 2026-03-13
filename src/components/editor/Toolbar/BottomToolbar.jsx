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

import { useState, useRef, useEffect } from 'react'
import { X, Check, ImagePlus, Layers, Maximize, Scissors, FlipHorizontal2, Trash2, Pencil, Palette, Paintbrush, Eraser, MousePointer2, Type } from 'lucide-react'

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
  const [bgOpen, setBgOpen] = useState(false)
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

  // While cropping, show only confirm / cancel
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

  const isDrawing = activeTool === 'brush' || activeTool === 'eraser'

  return (
    <footer
      className="flex items-center gap-2 px-4 h-14 bg-[#24272f] text-white shrink-0 overflow-x-auto border-t border-white/5"
      style={{ WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none', msOverflowStyle: 'none' }}
    >

      <button
        onClick={onAddImage}
        className="flex items-center gap-1 px-2 sm:px-3 py-2 rounded text-sm font-medium bg-[#363b44] text-white hover:bg-[#424850] transition-colors whitespace-nowrap shrink-0"
      >
        <ImagePlus size={14} /> <span className="hidden sm:inline">Import</span>
      </button>

      <div className="w-px h-6 bg-white/10 mx-0.5 shrink-0" />

      {/* Tool selector */}
      <div className="flex items-center bg-[#2d3139] rounded p-0.5 gap-0.5 shrink-0">
        <button title="Select" onClick={() => onSetActiveTool('select')} className={`w-8 h-8 flex items-center justify-center rounded transition-colors shrink-0 ${activeTool === 'select' ? 'bg-[#0fff95] text-[#24272f]' : 'text-white/60 hover:text-white hover:bg-[#424850]'}`}>
          <MousePointer2 size={15} />
        </button>
        <button title="Brush" onClick={() => onSetActiveTool('brush')} className={`w-8 h-8 flex items-center justify-center rounded transition-colors shrink-0 ${activeTool === 'brush' ? 'bg-[#0fff95] text-[#24272f]' : 'text-white/60 hover:text-white hover:bg-[#424850]'}`}>
          <Paintbrush size={15} />
        </button>
        <button title="Eraser" onClick={() => onSetActiveTool('eraser')} className={`w-8 h-8 flex items-center justify-center rounded transition-colors shrink-0 ${activeTool === 'eraser' ? 'bg-[#0fff95] text-[#24272f]' : 'text-white/60 hover:text-white hover:bg-[#424850]'}`}>
          <Eraser size={15} />
        </button>
        <button title="Text" onClick={() => onSetActiveTool('text')} className={`w-8 h-8 flex items-center justify-center rounded transition-colors shrink-0 ${activeTool === 'text' ? 'bg-[#0fff95] text-[#24272f]' : 'text-white/60 hover:text-white hover:bg-[#424850]'}`}>
          <Type size={15} />
        </button>
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

          <div className="flex items-center gap-2 shrink-0">
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
      {!isDrawing && (
        <button
          onClick={onToggleLayerPanel}
          className={`sm:hidden flex items-center gap-1.5 px-2 py-2 rounded text-sm font-medium transition-colors whitespace-nowrap shrink-0 ${
            showLayerPanel
              ? 'bg-[#424850] text-white'
              : 'bg-[#363b44] text-white hover:bg-[#424850]'
          }`}
        >
          <Layers size={14} />
        </button>
      )}

      {/* Resize + Canvas dimensions */}
      {!isDrawing && (
        <button
          onClick={onEnterResize}
          className="flex items-center gap-1.5 px-2 sm:px-3 py-2 rounded text-sm font-medium bg-[#363b44] text-white hover:bg-[#424850] transition-colors whitespace-nowrap shrink-0"
          title="Resize canvas"
        >
          <Maximize size={14} /> <span className="hidden sm:inline">Resize</span>
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
                bgOpen ? 'bg-[#424850] text-white' : 'bg-[#363b44] text-white hover:bg-[#424850]'
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
            title={selectedNode.rotation !== 0 ? 'Flatten rotation before cropping' : 'Crop image'}
            className="flex items-center gap-1.5 px-3 py-2 rounded text-sm bg-[#363b44] hover:bg-[#424850] transition-colors whitespace-nowrap disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Scissors size={14} /> Crop
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

      {/* Canvas dimensions — always visible, pinned to the right */}
      <span className="text-xs text-white/30 tabular-nums whitespace-nowrap shrink-0 ml-auto">{canvasSize.width}×{canvasSize.height}</span>
    </footer>
  )
}
