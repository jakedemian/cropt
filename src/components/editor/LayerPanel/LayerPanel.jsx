import { useState, useRef, useCallback } from 'react'
import { X, Plus } from 'lucide-react'
import LayerItem from './LayerItem'

// embedded=true: renders as a flex column for use inside the desktop sidebar.
// embedded=false (default): renders as an absolute bottom overlay for mobile.
export default function LayerPanel({ nodes, selectedNodeId, onSelectNode, onToggleVisible, onReorder, onNewLayer, onClose, embedded = false }) {
  const [dragIndex, setDragIndex] = useState(null)   // panel-index being dragged
  const [dropIndex, setDropIndex] = useState(null)   // 0..n insertion point
  const listRef = useRef(null)

  // Panel shows top layer first — reverse the nodes array for display
  const reversed = [...nodes].reverse()

  // ── Drag helpers ────────────────────────────────────────────────────────────

  const getDropIndex = useCallback((clientY) => {
    const list = listRef.current
    if (!list) return null
    const items = list.querySelectorAll('[data-layer-item]')
    let idx = items.length // default: after last item
    for (let i = 0; i < items.length; i++) {
      const rect = items[i].getBoundingClientRect()
      if (clientY < rect.top + rect.height / 2) {
        idx = i
        break
      }
    }
    return idx
  }, [])

  const handleDragHandlePointerDown = useCallback((panelIndex, e) => {
    e.preventDefault()
    e.stopPropagation()
    // Capture on the list container so we keep receiving events
    listRef.current?.setPointerCapture?.(e.pointerId)
    setDragIndex(panelIndex)
    setDropIndex(panelIndex)
  }, [])

  const handleListPointerMove = useCallback((e) => {
    if (dragIndex === null) return
    setDropIndex(getDropIndex(e.clientY))
  }, [dragIndex, getDropIndex])

  const handleListPointerUp = useCallback(() => {
    if (dragIndex !== null && dropIndex !== null) {
      // Compute effective insert index (account for the item being removed)
      let insertAt = dropIndex
      if (insertAt > dragIndex) insertAt -= 1
      if (insertAt !== dragIndex) {
        const next = [...reversed]
        const [item] = next.splice(dragIndex, 1)
        next.splice(insertAt, 0, item)
        onReorder([...next].reverse()) // reverse back to canvas order
      }
    }
    setDragIndex(null)
    setDropIndex(null)
  }, [dragIndex, dropIndex, reversed, onReorder])

  if (embedded) {
    return (
      <div className="flex flex-col min-h-0">
        {/* Header — no close button in embedded/sidebar mode */}
        <div className="flex items-center px-4 py-2 shrink-0 border-b border-white/10">
          <span className="text-sm font-semibold text-white flex-1">Layers</span>
          {onNewLayer && (
            <button
              onClick={onNewLayer}
              title="New raster layer"
              className="p-1 rounded text-white/40 hover:text-white hover:bg-white/10 transition-colors"
            >
              <Plus size={14} />
            </button>
          )}
        </div>
        <div
          ref={listRef}
          className="overflow-y-auto flex flex-col py-1 touch-none"
          onPointerMove={handleListPointerMove}
          onPointerUp={handleListPointerUp}
          onPointerCancel={handleListPointerUp}
        >
          {reversed.length === 0 && (
            <p className="text-xs text-white/30 text-center py-4">No layers yet — add an image!</p>
          )}
          {reversed.map((node, panelIndex) => {
            const showDropAbove = dragIndex !== null && dropIndex === panelIndex && panelIndex !== dragIndex
            const showDropBelow =
              dragIndex !== null &&
              panelIndex === reversed.length - 1 &&
              dropIndex === reversed.length
            return (
              <div key={node.id} data-layer-item="">
                <LayerItem
                  node={node}
                  index={nodes.indexOf(node)}
                  isSelected={selectedNodeId === node.id}
                  isDragging={panelIndex === dragIndex}
                  showDropAbove={showDropAbove}
                  showDropBelow={showDropBelow}
                  onSelect={() => onSelectNode(node.id)}
                  onToggleVisible={() => onToggleVisible(node.id)}
                  onDragHandlePointerDown={(e) => handleDragHandlePointerDown(panelIndex, e)}
                />
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div
      className="absolute bottom-0 left-0 right-0 flex flex-col bg-[#24272f] border-t border-white/10 rounded-t-xl shadow-2xl"
      style={{ maxHeight: '40%' }}
    >
      {/* Header */}
      <div className="flex items-center px-4 py-2 shrink-0 border-b border-white/10">
        <span className="text-sm font-semibold text-white flex-1">Layers</span>
        {onNewLayer && (
          <button
            onClick={onNewLayer}
            title="New raster layer"
            className="p-1 rounded text-white/40 hover:text-white hover:bg-white/10 transition-colors mr-1"
          >
            <Plus size={14} />
          </button>
        )}
        <button
          onClick={onClose}
          className="text-white/40 hover:text-white p-1 rounded transition-colors"
        >
          <X size={16} strokeWidth={2.5} />
        </button>
      </div>

      {/* Layer list */}
      <div
        ref={listRef}
        className="overflow-y-auto flex flex-col py-1 touch-none"
        onPointerMove={handleListPointerMove}
        onPointerUp={handleListPointerUp}
        onPointerCancel={handleListPointerUp}
      >
        {reversed.length === 0 && (
          <p className="text-xs text-white/30 text-center py-4">No layers yet — add an image!</p>
        )}

        {reversed.map((node, panelIndex) => {
          // Insertion point is 0..n; show line ABOVE item[i] when dropIndex===i,
          // and BELOW the last item when dropIndex===reversed.length
          const showDropAbove = dragIndex !== null && dropIndex === panelIndex && panelIndex !== dragIndex
          const showDropBelow =
            dragIndex !== null &&
            panelIndex === reversed.length - 1 &&
            dropIndex === reversed.length

          return (
            <div key={node.id} data-layer-item="">
              <LayerItem
                node={node}
                index={nodes.indexOf(node)} // canvas index (for fallback name numbering)
                isSelected={selectedNodeId === node.id}
                isDragging={panelIndex === dragIndex}
                showDropAbove={showDropAbove}
                showDropBelow={showDropBelow}
                onSelect={() => onSelectNode(node.id)}
                onToggleVisible={() => onToggleVisible(node.id)}
                onDragHandlePointerDown={(e) => handleDragHandlePointerDown(panelIndex, e)}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}
