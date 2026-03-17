import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { X, Check } from 'lucide-react'

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

// DOM textarea overlay that appears over a text node during inline editing.
// Positioned by converting canvas coordinates to screen coordinates via stageViewport.
// Also renders a floating toolbar (font selector + cancel/done) anchored above the textarea.
export default function TextEditOverlay({ node, stageViewport, onTextChange, onConfirm, onCancel, onFontChange, onFontSizeChange }) {
  const textareaRef = useRef(null)
  const toolbarRef = useRef(null)

  const scale = stageViewport.scale
  // Canvas point (node.x, node.y) → screen position relative to the container
  const screenX = stageViewport.x + node.x * scale
  const screenY = stageViewport.y + node.y * scale
  // Font size accounts for canvas scale and the node's own scaleX
  const screenFontSize = Math.max(10, node.fontSize * Math.abs(node.scaleX ?? 1) * scale)
  const screenWidth = node.width ? node.width * Math.abs(node.scaleX ?? 1) * scale : undefined

  // Toolbar left starts at screenX; clamped to stay within the container.
  const [toolbarLeft, setToolbarLeft] = useState(screenX)

  // Auto-focus and move cursor to end on mount.
  // Deferred via setTimeout so focus isn't contested by the pointer event
  // that triggered placement (pointerup on TextPlaceOverlay) still resolving.
  useEffect(() => {
    const ta = textareaRef.current
    if (!ta) return
    const t = setTimeout(() => {
      if (!textareaRef.current) return
      ta.focus()
      const len = ta.value.length
      ta.setSelectionRange(len, len)
    }, 0)
    return () => clearTimeout(t)
  }, [])

  // Auto-resize textarea height whenever text content changes
  useEffect(() => {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = `${ta.scrollHeight}px`
  }, [node.text])

  // Clamp toolbar horizontally so it never overflows the container bounds.
  // useLayoutEffect fires after DOM mutation but before paint — no visible flash.
  useLayoutEffect(() => {
    const el = toolbarRef.current
    if (!el) return
    const containerWidth = el.offsetParent?.clientWidth ?? window.innerWidth
    const toolbarWidth = el.offsetWidth
    const pad = 8
    const clamped = Math.max(pad, Math.min(screenX, containerWidth - toolbarWidth - pad))
    setToolbarLeft(clamped)
  }, [screenX])

  const isBold = node.fontStyle?.includes('bold')
  const isItalic = node.fontStyle?.includes('italic')

  const handleKeyDown = (e) => {
    // Prevent app-level shortcuts (undo/redo) while typing
    e.stopPropagation()
    if (e.key === 'Escape') { e.preventDefault(); onCancel() }
    // Cmd/Ctrl+Enter to confirm
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); onConfirm() }
  }

  return (
    <>
      {/* Floating toolbar anchored above the textarea, clamped to stay on screen */}
      <div
        ref={toolbarRef}
        className="absolute flex flex-col gap-1.5 bg-[#2d3139] border border-white/10 rounded-lg shadow-2xl px-2 py-2 pointer-events-auto"
        style={{
          left: `${toolbarLeft}px`,
          top: `${screenY}px`,
          transform: 'translateY(calc(-100% - 8px))',
          zIndex: 21,
        }}
      >
        {/* Row 1: font selector + size stepper */}
        <div className="flex items-center gap-1.5">
          <select
            value={node.fontFamily ?? 'Anton'}
            onChange={(e) => onFontChange(e.target.value)}
            className="h-8 px-2 rounded text-sm bg-[#363b44] text-white border border-white/15 cursor-pointer flex-1 min-w-0"
            style={{ fontFamily: node.fontFamily ?? 'Anton' }}
          >
            {FONTS.map(({ label, value }) => (
              <option key={value} value={value} style={{ fontFamily: value }}>
                {label}
              </option>
            ))}
          </select>

          <div className="flex items-center gap-0.5 shrink-0">
            <button
              onClick={() => onFontSizeChange(Math.max(8, node.fontSize - 4))}
              className="w-7 h-7 flex items-center justify-center rounded text-base bg-[#363b44] hover:bg-[#424850] text-white"
            >−</button>
            <span className="text-xs text-white/60 w-10 text-center tabular-nums">{node.fontSize}px</span>
            <button
              onClick={() => onFontSizeChange(Math.min(400, node.fontSize + 4))}
              className="w-7 h-7 flex items-center justify-center rounded text-base bg-[#363b44] hover:bg-[#424850] text-white"
            >+</button>
          </div>
        </div>

        {/* Row 2: cancel + done */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={onCancel}
            className="flex-1 flex items-center justify-center gap-1 px-2.5 py-1 rounded text-sm font-medium bg-red-700 hover:bg-red-600 text-white transition-colors"
          >
            <X size={14} /> Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 flex items-center justify-center gap-1 px-2.5 py-1 rounded text-sm font-medium bg-[#0fff95] text-[#24272f] hover:bg-[#0de882] transition-colors"
          >
            <Check size={14} /> Done
          </button>
        </div>
      </div>

      <textarea
        ref={textareaRef}
        value={node.text}
        onChange={(e) => onTextChange(e.target.value)}
        onKeyDown={handleKeyDown}
        className="absolute pointer-events-auto resize-none outline-none border-2 border-[#0fff95] rounded bg-black/25"
        style={{
          left: `${screenX}px`,
          top: `${screenY}px`,
          fontSize: `${screenFontSize}px`,
          fontFamily: node.fontFamily,
          fontStyle: isItalic ? 'italic' : 'normal',
          fontWeight: isBold ? 'bold' : 'normal',
          color: node.fill,
          width: screenWidth ? `${screenWidth}px` : 'auto',
          minWidth: '80px',
          lineHeight: 1.2,
          padding: '2px 4px',
          caretColor: 'white',
          transform: node.rotation ? `rotate(${node.rotation}deg)` : undefined,
          transformOrigin: 'top left',
          overflow: 'hidden',
          zIndex: 20,
        }}
        spellCheck={false}
      />
    </>
  )
}
