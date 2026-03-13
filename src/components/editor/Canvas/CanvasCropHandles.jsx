import { useRef, useCallback } from 'react'

const MIN_CROP = 10

const HANDLES = [
  { type: 'tl', xFrac: 0,   yFrac: 0,   cursor: 'nw-resize' },
  { type: 'tc', xFrac: 0.5, yFrac: 0,   cursor: 'n-resize'  },
  { type: 'tr', xFrac: 1,   yFrac: 0,   cursor: 'ne-resize' },
  { type: 'ml', xFrac: 0,   yFrac: 0.5, cursor: 'w-resize'  },
  { type: 'mr', xFrac: 1,   yFrac: 0.5, cursor: 'e-resize'  },
  { type: 'bl', xFrac: 0,   yFrac: 1,   cursor: 'sw-resize' },
  { type: 'bc', xFrac: 0.5, yFrac: 1,   cursor: 's-resize'  },
  { type: 'br', xFrac: 1,   yFrac: 1,   cursor: 'se-resize' },
]

export default function CanvasCropHandles({
  cropRect,
  cropBounds,
  canvasSize,
  stageViewport,
  onCropRectChange,
}) {
  const dragState = useRef(null)
  const { x: vx, y: vy, scale } = stageViewport

  // Canvas screen bounds (dark overlay covers full canvas minus crop rect)
  const canvW = canvasSize.width  * scale
  const canvH = canvasSize.height * scale

  // Crop rect in screen space
  const cx  = vx + cropRect.x      * scale
  const cy  = vy + cropRect.y      * scale
  const csw = cropRect.width        * scale
  const csh = cropRect.height       * scale

  const handlePointerDown = useCallback((type, e) => {
    e.preventDefault()
    e.stopPropagation()
    e.currentTarget.setPointerCapture(e.pointerId)
    dragState.current = {
      type,
      startX: e.clientX,
      startY: e.clientY,
      startRect: { ...cropRect },
      startViewport: { ...stageViewport },
    }
  }, [cropRect, stageViewport])

  const handlePointerMove = useCallback((type, e) => {
    const ds = dragState.current
    if (!ds || ds.type !== type) return
    const s  = ds.startViewport.scale
    const dx = (e.clientX - ds.startX) / s
    const dy = (e.clientY - ds.startY) / s

    const { x: bx, y: by, width: bw, height: bh } = cropBounds
    const { x, y, width, height } = ds.startRect
    let newLeft   = x
    let newTop    = y
    let newRight  = x + width
    let newBottom = y + height

    // Clamp each edge: cannot go outside cropBounds, must keep MIN_CROP size
    if (type.includes('l')) newLeft   = Math.max(bx,      Math.min(newRight  - MIN_CROP, x + dx))
    if (type.includes('r')) newRight  = Math.min(bx + bw, Math.max(newLeft   + MIN_CROP, (x + width)  + dx))
    if (type.includes('t')) newTop    = Math.max(by,      Math.min(newBottom - MIN_CROP, y + dy))
    if (type.includes('b')) newBottom = Math.min(by + bh, Math.max(newTop    + MIN_CROP, (y + height) + dy))

    const newRect = {
      x:      Math.round(newLeft),
      y:      Math.round(newTop),
      width:  Math.round(newRight  - newLeft),
      height: Math.round(newBottom - newTop),
    }
    dragState.current.lastRect = newRect
    onCropRectChange(newRect)
  }, [cropBounds, onCropRectChange])

  const handlePointerUp = useCallback(() => {
    dragState.current = null
  }, [])

  return (
    <>
      {/* Dark overlay: full canvas minus the crop rect (4 surrounding regions) */}
      {/* Top */}
      {cy > vy && (
        <div className="pointer-events-none absolute" style={{ left: vx, top: vy, width: canvW, height: cy - vy, background: 'rgba(0,0,0,0.5)' }} />
      )}
      {/* Bottom */}
      {cy + csh < vy + canvH && (
        <div className="pointer-events-none absolute" style={{ left: vx, top: cy + csh, width: canvW, height: vy + canvH - (cy + csh), background: 'rgba(0,0,0,0.5)' }} />
      )}
      {/* Left */}
      {cx > vx && (
        <div className="pointer-events-none absolute" style={{ left: vx, top: cy, width: cx - vx, height: csh, background: 'rgba(0,0,0,0.5)' }} />
      )}
      {/* Right */}
      {cx + csw < vx + canvW && (
        <div className="pointer-events-none absolute" style={{ left: cx + csw, top: cy, width: vx + canvW - (cx + csw), height: csh, background: 'rgba(0,0,0,0.5)' }} />
      )}

      {/* Crop rect border */}
      <div
        className="pointer-events-none absolute"
        style={{
          left: cx,
          top: cy,
          width: csw,
          height: csh,
          outline: '2px dashed #0fff95',
          outlineOffset: '-1px',
        }}
      />

      {/* 8 drag handles */}
      {HANDLES.map(({ type, xFrac, yFrac, cursor }) => {
        const hx = cx + xFrac * csw
        const hy = cy + yFrac * csh
        return (
          <div
            key={type}
            className="absolute"
            style={{
              left: hx - 22,
              top:  hy - 22,
              width: 44,
              height: 44,
              cursor,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              touchAction: 'none',
              zIndex: 20,
            }}
            onPointerDown={(e) => handlePointerDown(type, e)}
            onPointerMove={(e) => handlePointerMove(type, e)}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
          >
            <div style={{ width: 10, height: 10, background: 'white', border: '2px solid #0fff95', borderRadius: 2 }} />
          </div>
        )
      })}
    </>
  )
}
