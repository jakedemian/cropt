import { useRef, useCallback } from 'react'

const MIN_CROP = 10 // minimum crop dimension in canvas pixels

const HANDLES = [
  { id: 'tl', cursor: 'nw-resize' },
  { id: 'tc', cursor: 'n-resize'  },
  { id: 'tr', cursor: 'ne-resize' },
  { id: 'ml', cursor: 'w-resize'  },
  { id: 'mr', cursor: 'e-resize'  },
  { id: 'bl', cursor: 'sw-resize' },
  { id: 'bc', cursor: 's-resize'  },
  { id: 'br', cursor: 'se-resize' },
]

// Screen position of each handle given the crop rect in screen coords
function handleScreenPos(id, cl, ct, cr, cb) {
  const mx = (cl + cr) / 2
  const my = (ct + cb) / 2
  return {
    tl: { x: cl, y: ct }, tc: { x: mx, y: ct }, tr: { x: cr, y: ct },
    ml: { x: cl, y: my },                         mr: { x: cr, y: my },
    bl: { x: cl, y: cb }, bc: { x: mx, y: cb }, br: { x: cr, y: cb },
  }[id]
}

export default function CropOverlay({ node, cropRect, setCropRect, stageViewport }) {
  const dragState = useRef(null)
  const { x: vx, y: vy, scale } = stageViewport

  // Canvas → screen coordinate helpers
  const sx = (cx) => cx * scale + vx
  const sy = (cy) => cy * scale + vy

  // Image bounds in screen coords
  const absScaleX = Math.abs(node.scaleX)
  const absScaleY = Math.abs(node.scaleY)
  const imgL = sx(node.x)
  const imgT = sy(node.y)
  const imgW = node.width * absScaleX * scale
  const imgH = node.height * absScaleY * scale
  const imgR = imgL + imgW
  const imgB = imgT + imgH

  // Crop rect in screen coords
  const cl = sx(cropRect.x)
  const ct = sy(cropRect.y)
  const cw = cropRect.width  * scale
  const ch = cropRect.height * scale
  const cr = cl + cw
  const cb = ct + ch

  // Image bounds in canvas coords (for constraining drags)
  const imgCanvasL = node.x
  const imgCanvasT = node.y
  const imgCanvasR = node.x + node.width * absScaleX
  const imgCanvasB = node.y + node.height * absScaleY

  const handlePointerDown = useCallback((id, e) => {
    e.preventDefault()
    e.stopPropagation()
    e.currentTarget.setPointerCapture(e.pointerId)
    dragState.current = {
      id,
      startX: e.clientX,
      startY: e.clientY,
      startCropRect: { ...cropRect },
    }
  }, [cropRect])

  const handlePointerMove = useCallback((id, e) => {
    const ds = dragState.current
    if (!ds || ds.id !== id) return

    const dx = (e.clientX - ds.startX) / scale   // delta in canvas pixels
    const dy = (e.clientY - ds.startY) / scale
    let { x, y, width, height } = ds.startCropRect

    if (id.includes('l')) {
      const newX = Math.max(imgCanvasL, Math.min(x + width - MIN_CROP, x + dx))
      width = x + width - newX
      x = newX
    }
    if (id.includes('r')) {
      width = Math.max(MIN_CROP, Math.min(imgCanvasR - x, width + dx))
    }
    if (id.includes('t')) {
      const newY = Math.max(imgCanvasT, Math.min(y + height - MIN_CROP, y + dy))
      height = y + height - newY
      y = newY
    }
    if (id.includes('b')) {
      height = Math.max(MIN_CROP, Math.min(imgCanvasB - y, height + dy))
    }

    setCropRect({ x, y, width, height })
  }, [scale, imgCanvasL, imgCanvasT, imgCanvasR, imgCanvasB, setCropRect])

  const handlePointerUp = useCallback(() => {
    dragState.current = null
  }, [])

  return (
    <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 20 }}>
      {/* Dark overlay: 4 rects covering the image area outside the crop box */}
      {/* Top strip */}
      <div className="absolute bg-black/60" style={{
        left: imgL, top: imgT,
        width: imgW, height: Math.max(0, ct - imgT),
      }} />
      {/* Bottom strip */}
      <div className="absolute bg-black/60" style={{
        left: imgL, top: cb,
        width: imgW, height: Math.max(0, imgB - cb),
      }} />
      {/* Left strip (between top and bottom strips) */}
      <div className="absolute bg-black/60" style={{
        left: imgL, top: ct,
        width: Math.max(0, cl - imgL), height: ch,
      }} />
      {/* Right strip */}
      <div className="absolute bg-black/60" style={{
        left: cr, top: ct,
        width: Math.max(0, imgR - cr), height: ch,
      }} />

      {/* Dashed crop border */}
      <div className="absolute pointer-events-none" style={{
        left: cl, top: ct,
        width: cw, height: ch,
        outline: '2px dashed #0fff95',
        outlineOffset: '-1px',
      }} />

      {/* 8 drag handles */}
      {HANDLES.map(({ id, cursor }) => {
        const pos = handleScreenPos(id, cl, ct, cr, cb)
        return (
          <div
            key={id}
            className="absolute pointer-events-auto"
            style={{
              left: pos.x - 22,
              top:  pos.y - 22,
              width: 44,
              height: 44,
              cursor,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              touchAction: 'none',
            }}
            onPointerDown={(e) => handlePointerDown(id, e)}
            onPointerMove={(e) => handlePointerMove(id, e)}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
          >
            <div style={{
              width: 10, height: 10,
              background: '#0fff95',
              border: '2px solid #0fff95',
              borderRadius: 2,
              boxShadow: '0 0 0 1.5px rgba(0,0,0,0.6)',
            }} />
          </div>
        )
      })}
    </div>
  )
}
