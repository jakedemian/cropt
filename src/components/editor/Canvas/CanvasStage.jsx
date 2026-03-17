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
import CanvasCropHandles from './CanvasCropHandles'

const MIN_SCALE = 0.1
const MAX_SCALE = 8
const MIN_DRAG_CANVAS_PX = 20  // minimum canvas-unit width to treat as a bounded drag vs a click

function TextPlaceOverlay({ stageViewport, onPlaceText }) {
  const [dragRect, setDragRect] = useState(null) // screen coords { x, y, w, h }
  const dragRef = useRef({ active: false, startX: 0, startY: 0, moved: false })

  const toCanvas = (screenX, screenY, containerRect) => ({
    x: (screenX - containerRect.left - stageViewport.x) / stageViewport.scale,
    y: (screenY - containerRect.top  - stageViewport.y) / stageViewport.scale,
  })

  return (
    <div
      className="absolute inset-0"
      style={{ cursor: 'crosshair', zIndex: 10 }}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId)
        const r = dragRef.current
        r.active  = true
        r.moved   = false
        r.startX  = e.clientX
        r.startY  = e.clientY
        r.containerRect = e.currentTarget.getBoundingClientRect()
        setDragRect(null)
      }}
      onPointerMove={(e) => {
        const r = dragRef.current
        if (!r.active) return
        const dx = e.clientX - r.startX
        const dy = e.clientY - r.startY
        if (!r.moved && Math.abs(dx) < 4 && Math.abs(dy) < 4) return
        r.moved = true
        const x = dx >= 0 ? r.startX : e.clientX
        const y = dy >= 0 ? r.startY : e.clientY
        const containerLeft = r.containerRect.left
        const containerTop  = r.containerRect.top
        setDragRect({ x: x - containerLeft, y: y - containerTop, w: Math.abs(dx), h: Math.abs(dy) })
      }}
      onPointerUp={(e) => {
        const r = dragRef.current
        if (!r.active) return
        r.active = false
        setDragRect(null)

        const containerRect = r.containerRect
        const origin = toCanvas(r.startX, r.startY, containerRect)

        if (r.moved) {
          const end = toCanvas(e.clientX, e.clientY, containerRect)
          const canvasW = Math.abs(end.x - origin.x)
          const canvasX = Math.min(origin.x, end.x)
          const canvasY = Math.min(origin.y, end.y)
          if (canvasW >= MIN_DRAG_CANVAS_PX) {
            onPlaceText(canvasX, canvasY, canvasW)
            return
          }
        }
        onPlaceText(origin.x, origin.y)
      }}
    >
      {dragRect && (
        <div
          className="absolute pointer-events-none"
          style={{
            left:   dragRect.x,
            top:    dragRect.y,
            width:  dragRect.w,
            height: dragRect.h,
            border: '1.5px dashed #0fff95',
            boxSizing: 'border-box',
          }}
        />
      )}
    </div>
  )
}

// Watermark tile constants — tweak these to adjust the stage background pattern.
const WATERMARK_TILE_W  = 280   // px — tile width; smaller = denser horizontal repeat
const WATERMARK_TILE_H  = 140   // px — tile height; smaller = denser vertical repeat
const WATERMARK_ANGLE   = 15    // degrees of clockwise rotation
const WATERMARK_OPACITY = 0.02  // 0–1; keep low for subtlety

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
  transformEnabled,
  onActivateTransform,
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
  onFontChange,
  // draw-mode props
  drawMode,
  drawNodeId,
  drawTool,
  brushColor,
  brushSize,
  onDrawStart,
  onDrawEnd,
  // marquee-mode props
  marqueeMode,
  marqueeNodeId,
  isSelectToolActive,
  onMarqueeStart,
  onMarqueeEnd,
  onMarqueeReady,   // (rect | null) → called whenever selection is finalized or cleared
  onConvertToRaster, // (nodeId) → called when an image node is implicitly rasterized by a pixel op
  marqueeDeleteTrigger,
  // canvas-crop-mode props
  canvasCropMode,
  canvasCropRect,
  canvasCropBounds,
  onCanvasCropRectChange,
}) {
  const containerRef = useRef(null)
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 })
  const [imageLoadCount, setImageLoadCount] = useState(0)
  const lastCenter = useRef(null)
  const lastDist = useRef(null)

  // ── Stage background watermark ─────────────────────────────────────────────
  const [watermarkDataUrl, setWatermarkDataUrl] = useState(null)
  useEffect(() => {
    const img = new Image()
    img.onload = () => {
      // Tile is double-height to accommodate two staggered rows.
      const c = document.createElement('canvas')
      c.width  = WATERMARK_TILE_W
      c.height = WATERMARK_TILE_H * 2
      const ctx = c.getContext('2d')

      const logoSize = 48
      ctx.font = 'bold 40px Arial, sans-serif'
      const textW = ctx.measureText('cropt').width
      const totalW = logoSize + 5 + textW
      // Negative angle = counter-clockwise = text slants up-to-the-right
      const angleRad = (-WATERMARK_ANGLE * Math.PI) / 180

      const draw = (cx, cy) => {
        ctx.save()
        ctx.translate(cx, cy)
        ctx.rotate(angleRad)
        ctx.globalAlpha = WATERMARK_OPACITY
        ctx.fillStyle = '#ffffff'
        ctx.drawImage(img, -totalW / 2, -logoSize / 2, logoSize, logoSize)
        ctx.textBaseline = 'middle'
        ctx.fillText('cropt', -totalW / 2 + logoSize + 5, 0)
        ctx.restore()
      }

      // Row 1 — centered horizontally, top half of tile
      draw(WATERMARK_TILE_W / 2, WATERMARK_TILE_H / 2)
      // Row 2 — offset 50% horizontally, bottom half of tile.
      // Drawn at both x=0 and x=TILE_W so the split instance tiles seamlessly.
      draw(0, WATERMARK_TILE_H * 3 / 2)
      draw(WATERMARK_TILE_W, WATERMARK_TILE_H * 3 / 2)

      setWatermarkDataUrl(c.toDataURL())
    }
    img.src = '/icons/cropt-logo.png'
  }, []) // eslint-disable-line react-hooks/exhaustive-deps -- intentionally runs once on mount

  // ── Raster layer canvas management ────────────────────────────────────────
  // rasterCanvases is React state so it can be accessed safely during render.
  // rasterCanvasRef mirrors it for sync access inside event handlers.
  const [rasterCanvases, setRasterCanvases] = useState({}) // { [nodeId]: HTMLCanvasElement }
  const rasterCanvasRef    = useRef({})        // mirrors rasterCanvases for event handlers
  const rasterDataUrlCache = useRef({})        // last synced dataUrl per node
  const imageLoadedRef     = useRef({})        // { [nodeId]: HTMLImageElement } — loaded image elements
  const canvasSizeRef      = useRef(canvasSize)
  useEffect(() => { canvasSizeRef.current = canvasSize }, [canvasSize])

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

      // Resize canvas if node dimensions changed (e.g. after canvas crop or undo)
      if (canvas.width !== node.width || canvas.height !== node.height) {
        canvas.width  = node.width   // also clears canvas content as a side-effect
        canvas.height = node.height
        cache[node.id] = null        // force dataUrl reload on next check
        changed = true
      }

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

    // Remove stale canvases and image elements for deleted nodes
    Object.keys(next).forEach((id) => {
      if (!nodes.find((n) => n.id === id)) {
        delete next[id]
        delete cache[id]
        delete imageLoadedRef.current[id]
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

  const isDrawingRef  = useRef(false)
  const lastDrawPt    = useRef(null)
  const drawPanStartRef = useRef(null) // { clientX, clientY, vp } — set when drag begins outside canvas
  const [brushCursorPos, setBrushCursorPos] = useState(null)

  // ── Marquee tool ───────────────────────────────────────────────────────────
  const [marqueeRect, setMarqueeRect] = useState(null)     // canvas coords { x, y, width, height }
  const marqueeRectRef    = useRef(null)
  const marqueeNodeIdRef  = useRef(marqueeNodeId)
  const onMarqueeStartRef = useRef(onMarqueeStart)
  const onMarqueeEndRef   = useRef(onMarqueeEnd)
  useEffect(() => { marqueeRectRef.current   = marqueeRect   }, [marqueeRect])
  useEffect(() => { marqueeNodeIdRef.current = marqueeNodeId }, [marqueeNodeId])
  useEffect(() => { onMarqueeStartRef.current = onMarqueeStart }, [onMarqueeStart])
  useEffect(() => { onMarqueeEndRef.current   = onMarqueeEnd   }, [onMarqueeEnd])

  const onMarqueeReadyRef      = useRef(onMarqueeReady)
  const onConvertToRasterRef   = useRef(onConvertToRaster)
  useEffect(() => { onMarqueeReadyRef.current    = onMarqueeReady    }, [onMarqueeReady])
  useEffect(() => { onConvertToRasterRef.current = onConvertToRaster }, [onConvertToRaster])

  // Tracks which raster node the selection was drawn on — survives tool switches.
  // State is used in render; ref is used in callbacks/effects to avoid stale closures.
  const [committedMarqueeNodeId, setCommittedMarqueeNodeId] = useState(null)
  const committedMarqueeNodeIdRef = useRef(null)
  // Mirror isSelectToolActive in a ref so cleanup effects can read it synchronously
  const isSelectToolActiveRef = useRef(isSelectToolActive)
  useEffect(() => { isSelectToolActiveRef.current = isSelectToolActive }, [isSelectToolActive])

  const marqueePhaseRef    = useRef('idle') // 'idle' | 'drawing' | 'ready' | 'moving'
  const marqDrawStartRef   = useRef(null)   // { x, y } canvas point where drag began
  const marqMoveStartRef   = useRef(null)   // { pt: {x,y}, rect: {x,y,width,height} }
  const marqFloatRef       = useRef(null)   // HTMLCanvasElement — cut pixels
  const marqFloatPosRef    = useRef(null)   // { x, y } current canvas pos of floating content
  const marqPanStartRef    = useRef(null)   // { clientX, clientY, vp, moved } — set when drag begins outside canvas
  const prevMarqueeNodeIdRef = useRef(null) // previous marqueeNodeId — used to distinguish tool-switch from node-change
  const [marqFloatDisplay, setMarqFloatDisplay] = useState(null) // { dataUrl, x, y, width, height }

  // Stamp floating content onto the source canvas and notify parent
  const stampMarqueeFloat = useCallback(() => {
    const nodeId = marqueeNodeIdRef.current || committedMarqueeNodeIdRef.current
    const float  = marqFloatRef.current
    const pos    = marqFloatPosRef.current
    if (!float || !pos || !nodeId) return
    const canvas = rasterCanvasRef.current[nodeId]
    if (!canvas) return
    canvas.getContext('2d').drawImage(float, pos.x, pos.y)
    const dataUrl = canvas.toDataURL('image/png')
    rasterDataUrlCache.current[nodeId] = dataUrl
    onMarqueeEndRef.current(nodeId, dataUrl)
    stageRef.current?.batchDraw()
    marqFloatRef.current    = null
    marqFloatPosRef.current = null
    setMarqFloatDisplay(null)
  }, [stageRef])

  // Rasterize an image node into a full-canvas offscreen HTMLCanvas so marquee
  // pixel ops can be applied to it. The canvas is inserted into rasterCanvases
  // synchronously (via ref + state). App.jsx is notified via onConvertToRaster so
  // it can replace the node's type from 'image' to 'raster'.
  // Returns the canvas, or null if the image element isn't loaded yet.
  const rasterizeImageNode = useCallback((nodeId) => {
    const imgEl = imageLoadedRef.current[nodeId]
    const node  = nodesRef.current.find((n) => n.id === nodeId)
    if (!imgEl || !node) return null

    const { width: cw, height: ch } = canvasSizeRef.current
    const canvas = document.createElement('canvas')
    canvas.width  = cw
    canvas.height = ch

    // Replicate Konva's image transform: translate → rotate → scale → draw with offset
    const scaleX  = node.flipX ? -(node.scaleX ?? 1) : (node.scaleX ?? 1)
    const scaleY  = node.scaleY ?? 1
    const offsetX = node.flipX ? node.width : 0
    const ctx = canvas.getContext('2d')
    ctx.save()
    ctx.translate(node.x ?? 0, node.y ?? 0)
    ctx.rotate(((node.rotation ?? 0) * Math.PI) / 180)
    ctx.scale(scaleX, scaleY)
    ctx.drawImage(imgEl, -offsetX, 0, node.width, node.height)
    ctx.restore()

    // Sync into raster canvas tracking immediately (ref + state)
    rasterCanvasRef.current[nodeId]    = canvas
    rasterDataUrlCache.current[nodeId] = null // will be set after pixel op
    setRasterCanvases((prev) => ({ ...prev, [nodeId]: canvas }))

    return canvas
  }, [])

  // Clear (erase) the pixels within the marquee selection on the target raster layer.
  // Keeps the selection active so the user can see what was deleted.
  const handleMarqueeDeleteArea = useCallback(() => {
    const rect   = marqueeRectRef.current
    const nodeId = marqueeNodeIdRef.current || committedMarqueeNodeIdRef.current
    if (!rect || !nodeId || rect.width < 1 || rect.height < 1) return
    let canvas = rasterCanvasRef.current[nodeId]
    if (!canvas) {
      canvas = rasterizeImageNode(nodeId)
      if (!canvas) return
    }
    const wasImage = nodesRef.current.find((n) => n.id === nodeId)?.type === 'image'
    onMarqueeStartRef.current()  // push history before mutation (captures pre-rasterize state)
    if (wasImage) onConvertToRasterRef.current?.(nodeId)
    const fx = Math.round(rect.x),     fy = Math.round(rect.y)
    const fw = Math.round(rect.width), fh = Math.round(rect.height)
    canvas.getContext('2d').clearRect(fx, fy, fw, fh)
    stageRef.current?.batchDraw()
    const dataUrl = canvas.toDataURL('image/png')
    rasterDataUrlCache.current[nodeId] = dataUrl
    onMarqueeEndRef.current(nodeId, dataUrl)
    // Discard any in-flight float; keep phase='ready' so selection stays visible
    marqFloatRef.current    = null
    marqFloatPosRef.current = null
    setMarqFloatDisplay(null)
  }, [stageRef, rasterizeImageNode])

  // Stamp + clear when marquee tool is deactivated.
  // When switching to the Move (select) tool, stamp any floating pixels but
  // keep the selection rect so the marching ants remain visible.
  useEffect(() => {
    if (marqueeMode) return
    stampMarqueeFloat() // eslint-disable-line react-hooks/set-state-in-effect
    if (!isSelectToolActiveRef.current) {
      // Switching to a non-select tool: clear selection entirely
      setMarqueeRect(null)
      marqueePhaseRef.current = 'idle'
      committedMarqueeNodeIdRef.current = null
      setCommittedMarqueeNodeId(null)
    }
    // else: switching to Move tool — keep rect + committed node + phase='ready'
  }, [marqueeMode]) // eslint-disable-line react-hooks/exhaustive-deps -- intentionally runs only on marqueeMode change

  // Clear selection when the raster target changes from one node to another while
  // in marquee mode. We track the previous value to avoid false clears on tool
  // switches where marqueeNodeId transitions to/from null:
  //   node → null: switching tools, handled by the cleanup effect
  //   null → node: returning to marquee, keep the preserved selection
  //   nodeA → nodeB: genuinely different layer — clear
  useEffect(() => {
    const prev = prevMarqueeNodeIdRef.current
    prevMarqueeNodeIdRef.current = marqueeNodeId
    if (!prev || !marqueeNodeId || prev === marqueeNodeId) return
    if (marqFloatRef.current || marqueeRectRef.current) {
      marqFloatRef.current    = null
      marqFloatPosRef.current = null
      setMarqFloatDisplay(null) // eslint-disable-line react-hooks/set-state-in-effect
      setMarqueeRect(null)
      marqueePhaseRef.current = 'idle'
      committedMarqueeNodeIdRef.current = null
      setCommittedMarqueeNodeId(null)
    }
  }, [marqueeNodeId])

  // Keyboard shortcuts while marquee is active (marquee tool OR move tool with selection)
  useEffect(() => {
    if (!marqueeMode && !isSelectToolActive) return
    const handler = (e) => {
      if (e.key === 'Escape') {
        stampMarqueeFloat()
        setMarqueeRect(null)
        marqueePhaseRef.current = 'idle'
        committedMarqueeNodeIdRef.current = null
        setCommittedMarqueeNodeId(null)
        onMarqueeReadyRef.current(null)
      } else if ((e.key === 'Delete' || e.key === 'Backspace') && marqueePhaseRef.current === 'ready') {
        e.preventDefault()
        handleMarqueeDeleteArea()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [marqueeMode, isSelectToolActive, stampMarqueeFloat, handleMarqueeDeleteArea])

  // Dismiss the marquee on pointer-up outside the canvas container.
  // Tool-agnostic: fires whenever a selection exists, regardless of active tool.
  // Listens to pointer-up (not pointer-down) so a tap+drag to pan doesn't
  // prematurely dismiss the selection before the gesture resolves.
  useEffect(() => {
    const handler = (e) => {
      if (!marqueeRectRef.current) return
      if (!containerRef.current) return
      if (containerRef.current.contains(e.target)) return
      if (e.target.closest('button')) return
      stampMarqueeFloat()
      setMarqueeRect(null)
      marqueePhaseRef.current = 'idle'
      committedMarqueeNodeIdRef.current = null
      setCommittedMarqueeNodeId(null)
      onMarqueeReadyRef.current(null)
    }
    window.addEventListener('pointerup', handler)
    return () => window.removeEventListener('pointerup', handler)
  }, [stampMarqueeFloat])

  // Triggered by toolbar "Clear" button (marqueeDeleteTrigger increments)
  useEffect(() => {
    if (marqueeDeleteTrigger === 0) return
    handleMarqueeDeleteArea()
  }, [marqueeDeleteTrigger, handleMarqueeDeleteArea])

  // Convert screen → canvas coordinates (not node-relative)
  const getMarqueePoint = useCallback((e) => {
    if (!containerRef.current) return null
    const rect = containerRef.current.getBoundingClientRect()
    const vp   = stageViewportRef.current
    return {
      x: (e.clientX - rect.left - vp.x) / vp.scale,
      y: (e.clientY - rect.top  - vp.y) / vp.scale,
    }
  }, [])

  const handleMarqueePointerDown = useCallback((e) => {
    // If the pointer started outside the canvas bounds, pan instead of drawing.
    const containerRect = containerRef.current?.getBoundingClientRect()
    if (containerRect) {
      const vp = stageViewportRef.current
      const cs = canvasSizeRef.current
      const px = e.clientX - containerRect.left
      const py = e.clientY - containerRect.top
      const outsideCanvas = px < vp.x || px > vp.x + cs.width * vp.scale
        || py < vp.y || py > vp.y + cs.height * vp.scale
      if (outsideCanvas) {
        e.currentTarget.setPointerCapture(e.pointerId)
        marqPanStartRef.current = { clientX: e.clientX, clientY: e.clientY, vp, moved: false }
        return
      }
    }

    const pt = getMarqueePoint(e)
    if (!pt) return

    // Always begin drawing a new selection — stamp any existing float first.
    // Dragging the selection is handled by the select tool overlay.
    stampMarqueeFloat()
    onMarqueeReadyRef.current(null)
    e.currentTarget.setPointerCapture(e.pointerId)
    marqueePhaseRef.current  = 'drawing'
    marqDrawStartRef.current = pt
    setMarqueeRect(null)
  }, [getMarqueePoint, stageRef, stampMarqueeFloat, rasterizeImageNode])

  const handleMarqueePointerMove = useCallback((e) => {
    if (marqPanStartRef.current) {
      const start = marqPanStartRef.current
      const dx = e.clientX - start.clientX
      const dy = e.clientY - start.clientY
      if (!start.moved && Math.hypot(dx, dy) > 4) start.moved = true
      if (start.moved) setStageViewport({ ...start.vp, x: start.vp.x + dx, y: start.vp.y + dy })
      return
    }

    const pt    = getMarqueePoint(e)
    if (!pt) return
    const phase = marqueePhaseRef.current

    if (phase === 'drawing') {
      const start = marqDrawStartRef.current
      if (!start) return
      setMarqueeRect({
        x:      Math.min(start.x, pt.x),
        y:      Math.min(start.y, pt.y),
        width:  Math.abs(pt.x - start.x),
        height: Math.abs(pt.y - start.y),
      })
    } else if (phase === 'moving') {
      const ms = marqMoveStartRef.current
      if (!ms) return
      const nx = Math.round(ms.rect.x + (pt.x - ms.pt.x))
      const ny = Math.round(ms.rect.y + (pt.y - ms.pt.y))
      marqFloatPosRef.current = { x: nx, y: ny }
      setMarqFloatDisplay((prev) => prev ? { ...prev, x: nx, y: ny } : prev)
      setMarqueeRect({ x: nx, y: ny, width: ms.rect.width, height: ms.rect.height })
    }
  }, [getMarqueePoint, setStageViewport])

  const handleMarqueePointerUp = useCallback(() => {
    if (marqPanStartRef.current) {
      const { moved } = marqPanStartRef.current
      marqPanStartRef.current = null
      if (!moved) {
        // Bare tap outside canvas — clear the selection
        stampMarqueeFloat()
        setMarqueeRect(null)
        marqueePhaseRef.current = 'idle'
        committedMarqueeNodeIdRef.current = null
        setCommittedMarqueeNodeId(null)
        onMarqueeReadyRef.current(null)
      }
      return
    }

    const phase = marqueePhaseRef.current
    if (phase === 'drawing') {
      const rect = marqueeRectRef.current
      if (!rect || rect.width < 2 || rect.height < 2) {
        setMarqueeRect(null)
        marqueePhaseRef.current = 'idle'
        onMarqueeReadyRef.current(null)
      } else {
        marqueePhaseRef.current = 'ready'
        committedMarqueeNodeIdRef.current = marqueeNodeIdRef.current
        setCommittedMarqueeNodeId(marqueeNodeIdRef.current)
        onMarqueeReadyRef.current(rect)
      }
    } else if (phase === 'moving') {
      // Park the float at its current position — don't stamp yet.
      // The user can drag again to reposition the same pixels.
      marqueePhaseRef.current = 'ready'
      onMarqueeReadyRef.current(marqueeRectRef.current)
    }
  }, [stampMarqueeFloat])

  // In Move (select) tool mode: clicking inside the marching ants initiates pixel move
  const handleSelectModeMarqueePointerDown = useCallback((e) => {
    e.stopPropagation()  // prevent Konva stage from receiving this as a node deselect
    const pt   = getMarqueePoint(e)
    if (!pt) return
    const rect = marqueeRectRef.current
    if (!rect) return

    if (marqFloatRef.current) {
      // Float already established — just resume moving it, no new cut
      e.currentTarget.setPointerCapture(e.pointerId)
      marqueePhaseRef.current  = 'moving'
      marqMoveStartRef.current = { pt, rect }
    } else {
      // First pick — cut pixels from canvas
      const nodeId = committedMarqueeNodeIdRef.current
      let canvas = rasterCanvasRef.current[nodeId]
      if (!canvas) {
        canvas = rasterizeImageNode(nodeId)
      }
      if (!canvas) return
      e.currentTarget.setPointerCapture(e.pointerId)
      const wasImage = nodesRef.current.find((n) => n.id === nodeId)?.type === 'image'
      onMarqueeStartRef.current()
      if (wasImage) onConvertToRasterRef.current?.(nodeId)
      marqueePhaseRef.current  = 'moving'
      marqMoveStartRef.current = { pt, rect }
      const fx = Math.round(rect.x),     fy = Math.round(rect.y)
      const fw = Math.round(rect.width), fh = Math.round(rect.height)
      if (fw < 1 || fh < 1) return
      const float = document.createElement('canvas')
      float.width  = fw
      float.height = fh
      float.getContext('2d').drawImage(canvas, fx, fy, fw, fh, 0, 0, fw, fh)
      canvas.getContext('2d').clearRect(fx, fy, fw, fh)
      stageRef.current?.batchDraw()
      marqFloatRef.current    = float
      marqFloatPosRef.current = { x: fx, y: fy }
      setMarqFloatDisplay({ dataUrl: float.toDataURL('image/png'), x: fx, y: fy, width: fw, height: fh })
    }
  }, [getMarqueePoint, stageRef, rasterizeImageNode])

  const handleSelectModeMarqueePointerUp = useCallback(() => {
    if (marqueePhaseRef.current !== 'moving') return
    // Park the float — don't stamp yet, user may reposition again
    marqueePhaseRef.current = 'ready'
    onMarqueeReadyRef.current(marqueeRectRef.current)
  }, [])

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
    // If the pointer started outside the canvas bounds, pan instead of drawing.
    const containerRect = containerRef.current?.getBoundingClientRect()
    if (containerRect) {
      const vp = stageViewportRef.current
      const cs = canvasSizeRef.current
      const px = e.clientX - containerRect.left
      const py = e.clientY - containerRect.top
      const outsideCanvas = px < vp.x || px > vp.x + cs.width * vp.scale
        || py < vp.y || py > vp.y + cs.height * vp.scale
      if (outsideCanvas) {
        e.currentTarget.setPointerCapture(e.pointerId)
        drawPanStartRef.current = { clientX: e.clientX, clientY: e.clientY, vp }
        return
      }
    }

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
    if (drawPanStartRef.current) {
      const start = drawPanStartRef.current
      const dx = e.clientX - start.clientX
      const dy = e.clientY - start.clientY
      setStageViewport({ ...start.vp, x: start.vp.x + dx, y: start.vp.y + dy })
      return
    }

    if (!isDrawingRef.current) return
    const pt = getDrawPoint(e)
    if (!pt || !lastDrawPt.current) return
    const canvas = rasterCanvasRef.current[drawNodeIdRef.current]
    if (!canvas) return
    paintLine(canvas.getContext('2d'), lastDrawPt.current.x, lastDrawPt.current.y, pt.x, pt.y)
    lastDrawPt.current = pt
    stageRef.current?.batchDraw()
  }, [getDrawPoint, paintLine, stageRef, setStageViewport])

  const handleDrawPointerUp = useCallback(() => {
    if (drawPanStartRef.current) {
      drawPanStartRef.current = null
      return
    }

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

  // When a second finger arrives during a single-finger pan, Konva's drag and
  // the pinch handler both write to the stage position on the same frame,
  // causing snap jumps. Stop Konva's drag immediately and sync viewport state
  // so the pinch handler has clean, uncontested ownership going forward.
  const handleTouchStart = useCallback(
    (e) => {
      if (e.evt.touches.length < 2) return
      const stage = stageRef.current
      if (!stage) return
      stage.stopDrag()
      const pos = stage.getAbsolutePosition()
      setStageViewport((prev) => ({ ...prev, x: pos.x, y: pos.y }))
      lastDist.current = null
      lastCenter.current = null
    },
    [stageRef, setStageViewport]
  )

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
      // Capture ref values before the async updater runs — handleTouchEnd or
      // handleTouchStart may null these refs before React executes the callback.
      const prevCenter = lastCenter.current

      setStageViewport((prev) => {
        if (!prevCenter || !stage) return prev
        const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, prev.scale * scaleBy))
        const stagePos = stage.getAbsolutePosition()
        const px = (center.x - stagePos.x) / prev.scale
        const py = (center.y - stagePos.y) / prev.scale
        const dx = center.x - prevCenter.x
        const dy = center.y - prevCenter.y
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

  const handleStageDragMove = useCallback(
    (e) => {
      if (e.target !== stageRef.current) return
      const stage = stageRef.current
      setStageViewport((prev) => ({ ...prev, x: stage.x(), y: stage.y() }))
    },
    [setStageViewport, stageRef]
  )

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
      if (marqueeRectRef.current) {
        stampMarqueeFloat()
        setMarqueeRect(null)
        marqueePhaseRef.current = 'idle'
        committedMarqueeNodeIdRef.current = null
        setCommittedMarqueeNodeId(null)
        onMarqueeReadyRef.current(null)
      }
      if (!textPlaceMode) onActivateTransform(null)
    },
    [onActivateTransform, stageRef, textPlaceMode, stampMarqueeFloat]
  )

  const isInteractive = !canvasResizeMode && !cropMode && !canvasCropMode && !textPlaceMode && !editingNodeId && !drawMode && !marqueeMode

  // Find the node currently being edited (for the overlay)
  const editingNode = editingNodeId ? nodes.find((n) => n.id === editingNodeId) : null

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden"
      style={{
        backgroundColor: '#2d3139',
        ...(watermarkDataUrl && {
          backgroundImage: `url(${watermarkDataUrl})`,
          backgroundRepeat: 'repeat',
        }),
      }}
    >
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
            draggable={!canvasResizeMode && !cropMode && !canvasCropMode && !textPlaceMode && !editingNodeId && !drawMode && !marqueeMode}
            onDragMove={handleStageDragMove}
            onDragEnd={handleStageDragEnd}
            onWheel={canvasResizeMode || cropMode || canvasCropMode || drawMode ? undefined : handleWheel}
            onTouchStart={canvasResizeMode || cropMode || canvasCropMode || drawMode ? undefined : handleTouchStart}
            onTouchMove={canvasResizeMode || cropMode || canvasCropMode || drawMode ? undefined : handleTouchMove}
            onTouchEnd={canvasResizeMode || cropMode || canvasCropMode || drawMode ? undefined : handleTouchEnd}
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
                      isSelected={isInteractive && selectedNodeId === node.id && transformEnabled}
                      draggable={isInteractive && selectedNodeId === node.id && transformEnabled}
                      onSelect={() => isInteractive && onActivateTransform(node.id)}
                      onChange={(updates) => updateNode(node.id, updates)}
                      onLoad={(img) => {
                        if (img) imageLoadedRef.current[node.id] = img
                        setImageLoadCount((c) => c + 1)
                      }}
                    />
                  )
                }

                if (node.type === 'text') {
                  return (
                    <TextNode
                      key={node.id}
                      node={node}
                      isEditing={editingNodeId === node.id}
                      isSelected={isInteractive && selectedNodeId === node.id && transformEnabled}
                      draggable={isInteractive && selectedNodeId === node.id && transformEnabled}
                      onSelect={() => isInteractive && onActivateTransform(node.id)}
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
                      draggable={isInteractive && selectedNodeId === node.id && transformEnabled}
                      onSelect={() => isInteractive && onActivateTransform(node.id)}
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
                selectedNodeId={canvasResizeMode || cropMode || canvasCropMode || editingNodeId || drawMode || marqueeMode || !transformEnabled ? null : selectedNodeId}
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

          {/* DOM overlay: canvas crop handles */}
          {canvasCropMode && canvasCropRect && canvasCropBounds && (
            <CanvasCropHandles
              cropRect={canvasCropRect}
              cropBounds={canvasCropBounds}
              canvasSize={canvasSize}
              stageViewport={stageViewport}
              onCropRectChange={onCanvasCropRectChange}
            />
          )}

          {/* DOM overlay: drawing surface */}
          {drawMode && drawNodeId && (
            <div
              className="absolute inset-0"
              style={{ cursor: 'none', zIndex: 10, touchAction: 'none' }}
              onPointerDown={handleDrawPointerDown}
              onPointerMove={(e) => {
                if (drawPanStartRef.current) { setBrushCursorPos(null); handleDrawPointerMove(e); return }
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

          {/* DOM overlay: marquee selection tool */}
          {marqueeMode && !canvasCropMode && (
            <div
              className="absolute inset-0"
              style={{ cursor: 'crosshair', zIndex: 10, touchAction: 'none' }}
              onPointerDown={handleMarqueePointerDown}
              onPointerMove={handleMarqueePointerMove}
              onPointerUp={handleMarqueePointerUp}
              onPointerCancel={handleMarqueePointerUp}
            >
              {/* Floating pixels being dragged */}
              {marqFloatDisplay && (
                <img
                  src={marqFloatDisplay.dataUrl}
                  alt=""
                  style={{
                    position: 'absolute',
                    left:   marqFloatDisplay.x * stageViewport.scale + stageViewport.x,
                    top:    marqFloatDisplay.y * stageViewport.scale + stageViewport.y,
                    width:  marqFloatDisplay.width  * stageViewport.scale,
                    height: marqFloatDisplay.height * stageViewport.scale,
                    imageRendering: 'pixelated',
                    pointerEvents: 'none',
                  }}
                />
              )}

              {/* Selection rectangle — marching ants */}
              {marqueeRect && (() => {
                const sx = marqueeRect.x      * stageViewport.scale + stageViewport.x
                const sy = marqueeRect.y      * stageViewport.scale + stageViewport.y
                const sw = Math.max(1, marqueeRect.width  * stageViewport.scale)
                const sh = Math.max(1, marqueeRect.height * stageViewport.scale)
                return (
                  <svg
                    style={{ position: 'absolute', left: sx, top: sy, width: sw, height: sh, overflow: 'visible', pointerEvents: 'none' }}
                  >
                    {/* Dark shadow for contrast on light backgrounds */}
                    <rect x={0.5} y={0.5} width={sw - 1} height={sh - 1}
                      fill="rgba(255,255,255,0.06)"
                      stroke="rgba(0,0,0,0.55)" strokeWidth={2}
                      strokeDasharray="6 4"
                    />
                    {/* Animated white dashes */}
                    <rect x={0.5} y={0.5} width={sw - 1} height={sh - 1}
                      fill="none"
                      stroke="white" strokeWidth={1.5}
                      strokeDasharray="6 4"
                      style={{ animation: 'marchingAnts 0.35s linear infinite' }}
                    />
                  </svg>
                )
              })()}
            </div>
          )}

          {/* DOM overlay: Move tool — marching ants persist + selection rect is draggable */}
          {isSelectToolActive && marqueeRect && !canvasCropMode && (
            <div className="absolute inset-0" style={{ pointerEvents: 'none', zIndex: 10, touchAction: 'none' }}>
              {/* Floating pixels during in-place move */}
              {marqFloatDisplay && (
                <img
                  src={marqFloatDisplay.dataUrl}
                  alt=""
                  style={{
                    position: 'absolute',
                    left:   marqFloatDisplay.x * stageViewport.scale + stageViewport.x,
                    top:    marqFloatDisplay.y * stageViewport.scale + stageViewport.y,
                    width:  marqFloatDisplay.width  * stageViewport.scale,
                    height: marqFloatDisplay.height * stageViewport.scale,
                    imageRendering: 'pixelated',
                    pointerEvents: 'none',
                  }}
                />
              )}
              {(() => {
                const sx = marqueeRect.x      * stageViewport.scale + stageViewport.x
                const sy = marqueeRect.y      * stageViewport.scale + stageViewport.y
                const sw = Math.max(1, marqueeRect.width  * stageViewport.scale)
                const sh = Math.max(1, marqueeRect.height * stageViewport.scale)
                const committedNodeType = nodes.find((n) => n.id === committedMarqueeNodeId)?.type
                const hasRasterCanvas = !!rasterCanvases[committedMarqueeNodeId]
                  || committedNodeType === 'image'
                return (
                  <>
                    {/* Marching ants — visual only, no pointer events */}
                    <svg style={{ position: 'absolute', left: sx, top: sy, width: sw, height: sh, overflow: 'visible', pointerEvents: 'none' }}>
                      <rect x={0.5} y={0.5} width={sw - 1} height={sh - 1}
                        fill="rgba(255,255,255,0.06)"
                        stroke="rgba(0,0,0,0.55)" strokeWidth={2}
                        strokeDasharray="6 4"
                      />
                      <rect x={0.5} y={0.5} width={sw - 1} height={sh - 1}
                        fill="none"
                        stroke="white" strokeWidth={1.5}
                        strokeDasharray="6 4"
                        style={{ animation: 'marchingAnts 0.35s linear infinite' }}
                      />
                    </svg>
                    {/* Hit area — only over the selection rect, only when there's a canvas to move */}
                    {hasRasterCanvas && (
                      <div
                        style={{
                          position: 'absolute',
                          left: sx, top: sy, width: sw, height: sh,
                          cursor: 'move',
                          pointerEvents: 'auto',
                        }}
                        onPointerDown={handleSelectModeMarqueePointerDown}
                        onPointerMove={handleMarqueePointerMove}
                        onPointerUp={handleSelectModeMarqueePointerUp}
                        onPointerCancel={handleSelectModeMarqueePointerUp}
                      />
                    )}
                  </>
                )
              })()}
            </div>
          )}

          {/* DOM overlay: crosshair click-to-place / drag-to-bound for text placement mode */}
          {textPlaceMode && (
            <TextPlaceOverlay
              stageViewport={stageViewport}
              onPlaceText={onPlaceText}
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
              onFontChange={onFontChange}
            />
          )}
        </>
      )}
    </div>
  )
}
