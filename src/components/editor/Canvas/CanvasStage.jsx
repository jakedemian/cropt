import { useRef, useEffect, useCallback, useState } from 'react'
import { Stage, Layer, Rect } from 'react-konva'
import { fitCanvasToContainer } from '../utils/canvasUtils'
import ImageNode from './ImageNode'
import TextNode from './TextNode'
import RasterNode from './RasterNode'
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
  ctx.fillStyle = '#363b44'
  ctx.fillRect(0, 0, 8, 8)
  ctx.fillRect(8, 8, 8, 8)
  ctx.fillStyle = '#24272f'
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
  // draw-mode props
  drawMode,
  drawNodeId,
  drawTool,
  brushColor,
  brushSize,
  onDrawStart,
  onDrawEnd,
}) {
  const containerRef = useRef(null)
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 })
  const [imageLoadCount, setImageLoadCount] = useState(0)
  const lastCenter = useRef(null)
  const lastDist = useRef(null)

  // ── Raster layer canvas management ────────────────────────────────────────
  // rasterCanvases is React state so it can be accessed safely during render.
  // rasterCanvasRef mirrors it for sync access inside event handlers.
  const [rasterCanvases, setRasterCanvases] = useState({}) // { [nodeId]: HTMLCanvasElement }
  const rasterCanvasRef    = useRef({})        // mirrors rasterCanvases for event handlers
  const rasterDataUrlCache = useRef({})        // last synced dataUrl per node

  useEffect(() => {
    rasterCanvasRef.current = rasterCanvases
  }, [rasterCanvases])

  useEffect(() => {
    const cache = rasterDataUrlCache.current
    let changed = false

    const next = { ...rasterCanvasRef.current }

    nodes.forEach((node) => {
      if (node.type !== 'raster') return

      // Create canvas element on first encounter
      if (!next[node.id]) {
        const canvas = document.createElement('canvas')
        canvas.width  = node.width
        canvas.height = node.height
        next[node.id]   = canvas
        cache[node.id]  = null
        changed = true
      }

      const canvas = next[node.id]

      // dataUrl changed externally (undo/redo/restore) — reload pixels
      if (node.dataUrl !== cache[node.id]) {
        const ctx = canvas.getContext('2d')
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        cache[node.id] = node.dataUrl
        if (node.dataUrl) {
          const img = new window.Image()
          img.onload = () => {
            ctx.drawImage(img, 0, 0)
            stageRef.current?.batchDraw()
          }
          img.src = node.dataUrl
        } else {
          stageRef.current?.batchDraw()
        }
      }
    })

    // Remove stale canvases for deleted nodes
    Object.keys(next).forEach((id) => {
      if (!nodes.find((n) => n.id === id)) {
        delete next[id]
        delete cache[id]
        changed = true
      }
    })

    if (changed) setRasterCanvases(next)
  }, [nodes, stageRef])

  // ── Drawing helpers ────────────────────────────────────────────────────────
  // Keep draw config in a ref so pointer handlers never go stale and don't
  // need drawTool/brushColor/brushSize in their dependency arrays.
  const drawConfigRef = useRef({ drawTool, brushColor, brushSize })
  useEffect(() => { drawConfigRef.current = { drawTool, brushColor, brushSize } }, [drawTool, brushColor, brushSize])

  // Keep stageViewport + draw node info in refs for the same reason.
  const stageViewportRef = useRef(stageViewport)
  useEffect(() => { stageViewportRef.current = stageViewport }, [stageViewport])
  const drawNodeIdRef = useRef(drawNodeId)
  useEffect(() => { drawNodeIdRef.current = drawNodeId }, [drawNodeId])
  const nodesRef = useRef(nodes)
  useEffect(() => { nodesRef.current = nodes }, [nodes])

  const isDrawingRef = useRef(false)
  const lastDrawPt   = useRef(null)
  const [brushCursorPos, setBrushCursorPos] = useState(null)

  const getDrawPoint = useCallback((e) => {
    if (!containerRef.current) return null
    const rect = containerRef.current.getBoundingClientRect()
    const vp  = stageViewportRef.current
    const cx  = (e.clientX - rect.left  - vp.x) / vp.scale
    const cy  = (e.clientY - rect.top   - vp.y) / vp.scale
    const id  = drawNodeIdRef.current
    const node = nodesRef.current.find((n) => n.id === id)
    if (!node) return null
    return {
      x: (cx - node.x) / (node.scaleX || 1),
      y: (cy - node.y) / (node.scaleY || 1),
    }
  }, [])

  const paintDot = useCallback((ctx, x, y) => {
    const { drawTool: tool, brushColor: color, brushSize: size } = drawConfigRef.current
    ctx.save()
    ctx.globalCompositeOperation = tool === 'eraser' ? 'destination-out' : 'source-over'
    ctx.fillStyle = tool === 'eraser' ? 'rgba(0,0,0,1)' : color
    ctx.beginPath()
    ctx.arc(x, y, size / 2, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }, [])

  const paintLine = useCallback((ctx, x1, y1, x2, y2) => {
    const { brushSize: size } = drawConfigRef.current
    const dx = x2 - x1
    const dy = y2 - y1
    const dist  = Math.hypot(dx, dy)
    const step  = Math.max(1, size / 4)
    const steps = Math.ceil(dist / step)
    for (let i = 0; i <= steps; i++) {
      const t = steps === 0 ? 0 : i / steps
      paintDot(ctx, x1 + dx * t, y1 + dy * t)
    }
  }, [paintDot])

  const handleDrawPointerDown = useCallback((e) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    onDrawStart()
    isDrawingRef.current = true
    const pt = getDrawPoint(e)
    if (!pt) return
    lastDrawPt.current = pt
    const canvas = rasterCanvasRef.current[drawNodeIdRef.current]
    if (!canvas) return
    paintDot(canvas.getContext('2d'), pt.x, pt.y)
    stageRef.current?.batchDraw()
  }, [onDrawStart, getDrawPoint, paintDot, stageRef])

  const handleDrawPointerMove = useCallback((e) => {
    if (!isDrawingRef.current) return
    const pt = getDrawPoint(e)
    if (!pt || !lastDrawPt.current) return
    const canvas = rasterCanvasRef.current[drawNodeIdRef.current]
    if (!canvas) return
    paintLine(canvas.getContext('2d'), lastDrawPt.current.x, lastDrawPt.current.y, pt.x, pt.y)
    lastDrawPt.current = pt
    stageRef.current?.batchDraw()
  }, [getDrawPoint, paintLine, stageRef])

  const handleDrawPointerUp = useCallback(() => {
    if (!isDrawingRef.current) return
    isDrawingRef.current = false
    lastDrawPt.current   = null
    const id = drawNodeIdRef.current
    const canvas = rasterCanvasRef.current[id]
    if (!canvas) return
    const dataUrl = canvas.toDataURL('image/png')
    // Update cache before notifying parent so the sync effect doesn't reload
    rasterDataUrlCache.current[id] = dataUrl
    onDrawEnd(id, dataUrl)
  }, [onDrawEnd])

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

  const isInteractive = !canvasResizeMode && !cropMode && !textPlaceMode && !editingNodeId && !drawMode

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
            draggable={!canvasResizeMode && !cropMode && !textPlaceMode && !editingNodeId && !drawMode}
            onDragEnd={handleStageDragEnd}
            onWheel={canvasResizeMode || cropMode || drawMode ? undefined : handleWheel}
            onTouchMove={canvasResizeMode || cropMode || drawMode ? undefined : handleTouchMove}
            onTouchEnd={canvasResizeMode || cropMode || drawMode ? undefined : handleTouchEnd}
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

                if (node.type === 'raster') {
                  return (
                    <RasterNode
                      key={node.id}
                      node={node}
                      canvasEl={rasterCanvases[node.id]}
                      draggable={isInteractive && selectedNodeId === node.id}
                      onSelect={() => isInteractive && selectNode(node.id)}
                      onChange={(updates) => updateNode(node.id, updates)}
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

          {/* DOM overlay: drawing surface */}
          {drawMode && drawNodeId && (
            <div
              className="absolute inset-0"
              style={{ cursor: 'none', zIndex: 10, touchAction: 'none' }}
              onPointerDown={handleDrawPointerDown}
              onPointerMove={(e) => {
                const rect = containerRef.current?.getBoundingClientRect()
                if (rect) setBrushCursorPos({ x: e.clientX - rect.left, y: e.clientY - rect.top })
                handleDrawPointerMove(e)
              }}
              onPointerUp={handleDrawPointerUp}
              onPointerCancel={handleDrawPointerUp}
              onPointerLeave={() => setBrushCursorPos(null)}
            >
              {brushCursorPos && (
                <div
                  style={{
                    position: 'absolute',
                    left: brushCursorPos.x,
                    top: brushCursorPos.y,
                    width: brushSize * stageViewport.scale,
                    height: brushSize * stageViewport.scale,
                    transform: 'translate(-50%, -50%)',
                    borderRadius: '50%',
                    border: '1.5px solid rgba(255,255,255,0.65)',
                    background: 'rgba(255,255,255,0.07)',
                    pointerEvents: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              )}
            </div>
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
