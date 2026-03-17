import { useEffect, useRef } from 'react'

// DOM textarea overlay that appears over a text node during inline editing.
// Positioned by converting canvas coordinates to screen coordinates via stageViewport.
export default function TextEditOverlay({ node, stageViewport, onTextChange, onConfirm, onCancel }) {
  const textareaRef = useRef(null)

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

  const scale = stageViewport.scale
  // Canvas point (node.x, node.y) → screen position relative to the container
  const screenX = stageViewport.x + node.x * scale
  const screenY = stageViewport.y + node.y * scale
  // Font size accounts for canvas scale and the node's own scaleX
  const screenFontSize = Math.max(10, node.fontSize * Math.abs(node.scaleX ?? 1) * scale)
  const screenWidth = node.width ? node.width * Math.abs(node.scaleX ?? 1) * scale : undefined

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
  )
}
