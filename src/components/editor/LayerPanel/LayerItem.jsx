import { useState, useRef, useEffect } from 'react'
import { Eye, EyeOff, Paintbrush, MousePointer2, Trash2, Layers, Check } from 'lucide-react'

export default function LayerItem({
  node,
  index,
  isSelected,
  transformEnabled,
  isDragging,
  showDropAbove,
  showDropBelow,
  onSelect,
  onActivateTransform,
  onToggleVisible,
  onDragHandlePointerDown,
  onOpacityStart,
  onOpacityChange,
  onDelete,
  onRasterizeText,
  isEditing,
}) {
  const [rasterized, setRasterized] = useState(false)
  const [opacityPopoverOpen, setOpacityPopoverOpen] = useState(false)
  const [popoverPos, setPopoverPos] = useState({ left: 0, bottom: 0 })
  const opacityBtnRef = useRef(null)
  const opacityOverlayRef = useRef(null)
  const scrubStateRef = useRef({ active: false, startX: 0, startOpacity: 1, didMove: false })

  useEffect(() => {
    if (!opacityPopoverOpen) return
    const handler = (e) => {
      if (opacityBtnRef.current?.contains(e.target) || opacityOverlayRef.current?.contains(e.target)) return
      setOpacityPopoverOpen(false)
    }
    document.addEventListener('pointerdown', handler)
    return () => document.removeEventListener('pointerdown', handler)
  }, [opacityPopoverOpen])

  const handleOpacityPointerDown = (e) => {
    e.stopPropagation()
    e.preventDefault()
    const s = scrubStateRef.current
    s.active = true
    s.startX = e.clientX
    s.startOpacity = node.opacity ?? 1
    s.didMove = false
    e.currentTarget.setPointerCapture(e.pointerId)
    onOpacityStart?.()
  }

  const handleOpacityPointerMove = (e) => {
    const s = scrubStateRef.current
    if (!s.active) return
    const delta = (e.clientX - s.startX) / 150
    if (Math.abs(e.clientX - s.startX) > 4) s.didMove = true
    const newOpacity = Math.min(1, Math.max(0, s.startOpacity + delta))
    onOpacityChange?.(node.id, newOpacity)
  }

  const handleOpacityPointerUp = (e) => {
    e.stopPropagation()
    const s = scrubStateRef.current
    if (!s.didMove && s.active) {
      if (opacityBtnRef.current) {
        const rect = opacityBtnRef.current.getBoundingClientRect()
        setPopoverPos({ left: rect.left + rect.width / 2, bottom: window.innerHeight - rect.top + 8 })
      }
      setOpacityPopoverOpen(true)
    }
    s.active = false
  }

  return (
    <>
      {/* Drop indicator — above this item */}
      {showDropAbove && (
        <div className="h-0.5 bg-[#0fff95] mx-2 rounded-full" />
      )}

      <div
        onClick={onSelect}
        className={`flex items-center gap-2 px-2 py-2.5 sm:py-1.5 rounded cursor-pointer select-none transition-colors ${
          isSelected ? 'bg-[rgba(15,255,149,0.15)]' : 'hover:bg-white/5'
        } ${isDragging ? 'opacity-40' : ''}`}
        title="Target this layer"
      >
        {/* Drag handle */}
        <div
          className="flex flex-col gap-0.5 px-1 py-1 cursor-grab active:cursor-grabbing touch-none shrink-0"
          onPointerDown={onDragHandlePointerDown}
        >
          {[0, 1].map((row) => (
            <div key={row} className="flex gap-0.5">
              {[0, 1].map((col) => (
                <div key={col} className="w-1 h-1 rounded-full bg-white/30" />
              ))}
            </div>
          ))}
        </div>

        {/* Thumbnail */}
        <div className="w-10 h-10 sm:w-9 sm:h-9 rounded overflow-hidden shrink-0 bg-[#363b44] flex items-center justify-center">
          {node.type === 'image' && node.src && (
            <img
              src={node.src}
              alt=""
              className="w-full h-full object-contain"
              style={{ opacity: node.opacity }}
              draggable={false}
            />
          )}
          {node.type === 'text' && (
            <span
              className="text-base font-bold leading-none select-none"
              style={{
                color: node.fill || '#fff',
                WebkitTextStroke: node.stroke ? `0.5px ${node.stroke}` : undefined,
              }}
            >
              {node.text ? node.text.slice(0, 2).toUpperCase() : 'T'}
            </span>
          )}
          {node.type === 'raster' && (
            node.dataUrl
              ? <img src={node.dataUrl} alt="" className="w-full h-full object-contain" style={{ opacity: node.opacity }} draggable={false} />
              : <Paintbrush size={14} className="text-white/30" />
          )}
        </div>

        {/* Name */}
        <span className="flex-1 text-xs text-white truncate">
          {node.name || (node.type === 'text' ? 'Text' : `Layer ${index + 1}`)}
        </span>

        {/* Rasterize button — text nodes only */}
        {node.type === 'text' && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onRasterizeText?.()
              setRasterized(true)
              setTimeout(() => setRasterized(false), 1500)
            }}
            disabled={isEditing}
            className={`shrink-0 p-2.5 sm:p-1.5 rounded transition-colors ${
              rasterized
                ? 'text-[#0fff95]'
                : 'text-white/40 hover:text-white hover:bg-white/10'
            } disabled:opacity-30 disabled:cursor-not-allowed`}
            title="Rasterize text layer"
          >
            {rasterized ? <Check size={16} /> : <Layers size={16} />}
          </button>
        )}

        {/* Transform / move button — activates transformer for this layer */}
        <button
          onClick={(e) => { e.stopPropagation(); onActivateTransform() }}
          className={`shrink-0 p-2.5 sm:p-1.5 rounded transition-colors ${
            isSelected && transformEnabled
              ? 'text-[#0fff95] bg-[rgba(15,255,149,0.15)]'
              : 'text-white/40 hover:text-white hover:bg-white/10'
          }`}
          title="Move / transform this layer"
        >
          <MousePointer2 size={16} />
        </button>

        {/* Visibility toggle */}
        <button
          onClick={(e) => { e.stopPropagation(); onToggleVisible() }}
          className={`shrink-0 p-2.5 sm:p-1.5 rounded transition-colors ${
            node.visible ? 'text-white/60 hover:text-white' : 'text-white/20 hover:text-white/40'
          }`}
          title={node.visible ? 'Hide layer' : 'Show layer'}
        >
          {node.visible ? <Eye size={18} /> : <EyeOff size={18} />}
        </button>

        {/* Delete */}
        <button
          onClick={(e) => { e.stopPropagation(); onDelete() }}
          className="shrink-0 p-2.5 sm:p-1.5 rounded transition-colors text-white/40 hover:text-red-400 hover:bg-white/10"
          title="Delete layer"
        >
          <Trash2 size={16} />
        </button>

        {/* Opacity scrub button */}
        <div className="relative shrink-0" ref={opacityBtnRef}>
          <button
            className="relative w-11 text-xs text-white/50 hover:text-white cursor-ew-resize transition-colors text-center select-none px-1 pb-1"
            style={{ touchAction: 'none' }}
            onPointerDown={handleOpacityPointerDown}
            onPointerMove={handleOpacityPointerMove}
            onPointerUp={handleOpacityPointerUp}
            title="Drag to adjust opacity · tap for slider"
          >
            {Math.round((node.opacity ?? 1) * 100)}%
            <span
              className="absolute bottom-0 left-0 h-0.5 rounded-full bg-[#0fff95]/50"
              style={{ width: `${(node.opacity ?? 1) * 100}%` }}
            />
          </button>

          {opacityPopoverOpen && (
            <div
              ref={opacityOverlayRef}
              className="fixed bg-[#2d3139] border border-white/10 rounded-xl shadow-2xl flex flex-col items-center gap-2 px-3 py-4"
              style={{ left: popoverPos.left, bottom: popoverPos.bottom, transform: 'translateX(-50%)', zIndex: 50 }}
            >
              <span className="text-xs text-white/40 tabular-nums">{Math.round((node.opacity ?? 1) * 100)}%</span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={node.opacity ?? 1}
                onPointerDown={onOpacityStart}
                onChange={(e) => onOpacityChange?.(node.id, parseFloat(e.target.value))}
                className="accent-[#0fff95]"
                style={{ writingMode: 'vertical-lr', direction: 'rtl', width: '36px', height: '120px', cursor: 'pointer' }}
              />
              <span className="text-xs text-white/40 tabular-nums">0%</span>
            </div>
          )}
        </div>
      </div>

      {/* Drop indicator — below this item (only for last slot) */}
      {showDropBelow && (
        <div className="h-0.5 bg-[#0fff95] mx-2 rounded-full" />
      )}
    </>
  )
}
