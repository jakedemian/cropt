import { useRef, useEffect, useCallback, useState } from 'react'
import { Stage, Layer, Rect } from 'react-konva'
import { fitCanvasToContainer } from '../../utils/canvasUtils'
import ImageNode from './ImageNode'
import TextNode from './TextNode'
import TextEditOverlay from './TextEditOverlay'
import TransformWrapper from './TransformWrapper'
import CanvasResizeHandles from './CanvasResizeHandles'
import CropOverlay from './CropOverlay'

const MIN_SCALE = 0.1
const MAX_SCALE = 8

// Offscreen canvas used as a repeating fill pattern for the transparent background.
// Created once at module load — no SSR concern since this is a client-only app.
const checkerPatternCanvas = (() => {
  const c = document.createElement('canvas')
  c.width = 16
  c.height = 16
  const ctx = c.getContext('2d')
  ctx.fillStyle = '#c8c8c8'
  ctx.fillRect(0, 0, 8, 8)
  ctx.fillRect(8, 8, 8, 8)
  ctx.fillStyle = '#f0f0f0'
  ctx.fillRect(8, 0, 8, 8)
  ctx.fillRect(0, 8, 8, 8)
  return c
})()

export default function CanvasStage({
  stageRef,
  canvasSize,
  canvasBackground,
  canvasResizeMode,
  nodes,
  selectedNodeId,
  stageViewport,
  setStageViewport,
  selectNode,
  updateNode,
  // resize-mode props
  setCanvasSize,
  replaceNodes,
  onResizeCommit,
  // crop-mode props
  cropMode,
  cropRect,
  setCropRect,
  // text-mode props
  textPlaceMode,
  onPlaceText,
  editingNodeId,
  onStartEditText,
  onTextChange,
  onConfirmTextEdit,
  onCancelTextEdit,
}) {
  const containerRef = useRef(null)
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 })
  const [imageLoadCount, setImageLoadCount] = useState(0)
  const lastCenter = useRef(null)
  const lastDist = useRef(null)

  // Track container size with ResizeObserver; re-fit on every size change
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      setContainerSize({ width, height })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // In resize mode the DOM overlay handles intercept touch events before Konva
  // sees them, so the Stage's onTouchMove / onWheel (which call
  // e.evt.preventDefault()) never fire. Without that, the browser treats a
  // two-finger pinch — or a macOS trackpad pinch (ctrl+wheel) — as a page
  // zoom and collapses the viewport. Block both event types directly on the
  // container element instead.
  useEffect(() => {
    const el = containerRef.current
    if (!el || !canvasResizeMode) return
    const blockTouch = (e) => { if (e.touches.length >= 2) e.preventDefault() }
    const blockWheel = (e) => e.preventDefault()
    el.addEventListener('touchmove', blockTouch, { passive: false })
    el.addEventListener('wheel', blockWheel, { passive: false })
    return () => {
      el.removeEventListener('touchmove', blockTouch)
      el.removeEventListener('wheel', blockWheel)
    }
  }, [canvasResizeMode])

  // Re-fit canvas whenever container or canvas dimensions change.
  // Skip during resize mode — the drag handles own the viewport then.
  // When resize mode turns OFF, this re-runs and fits the updated canvas.
  useEffect(() => {
    if (containerSize.width === 0 || containerSize.height === 0) return
    if (canvasResizeMode) return
    const vp = fitCanvasToContainer(canvasSize.width, canvasSize.height, containerSize.width, containerSize.height)
    setStageViewport(vp)
  }, [containerSize, canvasSize, canvasResizeMode, setStageViewport])

  // ── Pinch-to-zoom ──────────────────────────────────────────────────────────

  const getCenter = (p1, p2) => ({ x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 })
  const getDist = (p1, p2) => Math.hypot(p2.x - p1.x, p2.y - p1.y)

  const handleTouchMove = useCallback(
    (e) => {
      e.evt.preventDefault()
      const touches = e.evt.touches
      if (touches.length !== 2) return

      const t1 = { x: touches[0].clientX, y: touches[0].clientY }
      const t2 = { x: touches[1].clientX, y: touches[1].clientY }
      const dist = getDist(t1, t2)
      const center = getCenter(t1, t2)

      if (!lastDist.current) {
        lastDist.current = dist
        lastCenter.current = center
        return
      }

      const scaleBy = dist / lastDist.current
      const stage = stageRef.current

      setStageViewport((prev) => {
        const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, prev.scale * scaleBy))
        const stagePos = stage.getAbsolutePosition()
        const px = (center.x - stagePos.x) / prev.scale
        const py = (center.y - stagePos.y) / prev.scale
        const dx = center.x - lastCenter.current.x
        const dy = center.y - lastCenter.current.y
        return {
          x: prev.x + dx - px * (newScale - prev.scale),
          y: prev.y + dy - py * (newScale - prev.scale),
          scale: newScale,
        }
      })

      lastDist.current = dist
      lastCenter.current = center
    },
    [setStageViewport, stageRef]
  )

  const handleTouchEnd = useCallback(() => {
    lastDist.current = null
    lastCenter.current = null
  }, [])

  // ── Mouse wheel zoom ────────────────────────────────────────────────────────

  const handleWheel = useCallback(
    (e) => {
      e.evt.preventDefault()
      const stage = stageRef.current
      const pointer = stage.getPointerPosition()
      const scaleBy = 1.08
      const direction = e.evt.deltaY < 0 ? 1 : -1

      setStageViewport((prev) => {
        const newScale = Math.max(
          MIN_SCALE,
          Math.min(MAX_SCALE, direction > 0 ? prev.scale * scaleBy : prev.scale / scaleBy)
        )
        const px = (pointer.x - prev.x) / prev.scale
        const py = (pointer.y - prev.y) / prev.scale
        return { x: pointer.x - px * newScale, y: pointer.y - py * newScale, scale: newScale }
      })
    },
    [setStageViewport, stageRef]
  )

  // ── Stage drag ─────────────────────────────────────────────────────────────

  const handleStageDragEnd = useCallback(
    (e) => {
      if (e.target !== stageRef.current) return
      const stage = stageRef.current
      setStageViewport((prev) => ({ ...prev, x: stage.x(), y: stage.y() }))
    },
    [setStageViewport, stageRef]
  )

  const handleStageClick = useCallback(
    (e) => {
      if (e.target !== stageRef.current) return
      if (!textPlaceMode) selectNode(null)
    },
    [selectNode, stageRef, textPlaceMode]
  )

  const isInteractive = !canvasResizeMode && !cropMode && !textPlaceMode && !editingNodeId

  // Find the node currently being edited (for the overlay)
  const editingNode = editingNodeId ? nodes.find((n) => n.id === editingNodeId) : null

  return (
    <div ref={containerRef} className="relative w-full h-full bg-[#2d3139] overflow-hidden">
      {containerSize.width > 0 && (
        <>
          <Stage
            ref={stageRef}
            width={containerSize.width}
            height={containerSize.height}
            x={stageViewport.x}
            y={stageViewport.y}
            scaleX={stageViewport.scale}
            scaleY={stageViewport.scale}
            draggable={!canvasResizeMode && !cropMode && !textPlaceMode && !editingNodeId}
            onDragEnd={handleStageDragEnd}
            onWheel={canvasResizeMode || cropMode ? undefined : handleWheel}
            onTouchMove={canvasResizeMode || cropMode ? undefined : handleTouchMove}
            onTouchEnd={canvasResizeMode || cropMode ? undefined : handleTouchEnd}
            onClick={handleStageClick}
            onTap={handleStageClick}
          >
            <Layer listening={false}>
              <Rect
                x={0}
                y={0}
                width={canvasSize.width}
                height={canvasSize.height}
                {...(canvasBackground === 'transparent'
                  ? { fillPatternImage: checkerPatternCanvas, fillPatternRepeat: 'repeat' }
                  : { fill: canvasBackground }
                )}
                shadowColor="black"
                shadowBlur={20}
                shadowOpacity={0.4}
                shadowOffset={{ x: 0, y: 4 }}
              />
            </Layer>

            {/* All nodes — clipped to canvas bounds */}
            <Layer
              clipX={0}
              clipY={0}
              clipWidth={canvasSize.width}
              clipHeight={canvasSize.height}
            >
              {nodes.map((node) => {
                if (!node.visible) return null

                if (node.type === 'image') {
                  return (
                    <ImageNode
                      key={node.id}
                      node={node}
                      isSelected={isInteractive && selectedNodeId === node.id}
                      draggable={isInteractive && selectedNodeId === node.id}
                      onSelect={() => isInteractive && selectNode(node.id)}
                      onChange={(updates) => updateNode(node.id, updates)}
                      onLoad={() => setImageLoadCount((c) => c + 1)}
                    />
                  )
                }

                if (node.type === 'text') {
                  return (
                    <TextNode
                      key={node.id}
                      node={node}
                      isEditing={editingNodeId === node.id}
                      isSelected={isInteractive && selectedNodeId === node.id}
                      draggable={isInteractive && selectedNodeId === node.id}
                      onSelect={() => isInteractive && selectNode(node.id)}
                      onChange={(updates) => updateNode(node.id, updates)}
                      onEditRequest={() => isInteractive && onStartEditText(node.id)}
                    />
                  )
                }

                return null
              })}
            </Layer>

            {/* Transformer in its own unclipped layer so handles remain visible
                even when the selected node extends beyond the canvas edge */}
            <Layer>
              <TransformWrapper
                stageRef={stageRef}
                nodes={nodes}
                selectedNodeId={canvasResizeMode || cropMode || editingNodeId ? null : selectedNodeId}
                onChange={(updates) => selectedNodeId && updateNode(selectedNodeId, updates)}
                imageLoadCount={imageLoadCount}
              />
            </Layer>
          </Stage>

          {/* DOM overlay: resize handles (only visible in resize mode) */}
          {canvasResizeMode && (
            <CanvasResizeHandles
              canvasSize={canvasSize}
              nodes={nodes}
              stageViewport={stageViewport}
              setCanvasSize={setCanvasSize}
              replaceNodes={replaceNodes}
              setStageViewport={setStageViewport}
              onCommit={onResizeCommit}
            />
          )}

          {/* DOM overlay: crop handles (only visible in crop mode) */}
          {cropMode && cropRect && nodes.find((n) => n.id === selectedNodeId) && (
            <CropOverlay
              node={nodes.find((n) => n.id === selectedNodeId)}
              cropRect={cropRect}
              setCropRect={setCropRect}
              stageViewport={stageViewport}
            />
          )}

          {/* DOM overlay: crosshair click-to-place for text placement mode */}
          {textPlaceMode && (
            <div
              className="absolute inset-0"
              style={{ cursor: 'crosshair', zIndex: 10 }}
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect()
                const screenX = e.clientX - rect.left
                const screenY = e.clientY - rect.top
                const canvasX = (screenX - stageViewport.x) / stageViewport.scale
                const canvasY = (screenY - stageViewport.y) / stageViewport.scale
                onPlaceText(canvasX, canvasY)
              }}
            />
          )}

          {/* DOM overlay: textarea for inline text editing */}
          {editingNode && (
            <TextEditOverlay
              node={editingNode}
              stageViewport={stageViewport}
              onTextChange={onTextChange}
              onConfirm={onConfirmTextEdit}
              onCancel={onCancelTextEdit}
            />
          )}
        </>
      )}
    </div>
  )
}
