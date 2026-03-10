import { useRef, useCallback } from 'react'

const MIN_SIZE = 100 // minimum canvas dimension in canvas pixels

// 8 handles: position as fraction of canvas width/height
const HANDLES = [
  { type: 'tl', xFrac: 0,   yFrac: 0,   cursor: 'nw-resize'  },
  { type: 'tc', xFrac: 0.5, yFrac: 0,   cursor: 'n-resize'   },
  { type: 'tr', xFrac: 1,   yFrac: 0,   cursor: 'ne-resize'  },
  { type: 'ml', xFrac: 0,   yFrac: 0.5, cursor: 'w-resize'   },
  { type: 'mr', xFrac: 1,   yFrac: 0.5, cursor: 'e-resize'   },
  { type: 'bl', xFrac: 0,   yFrac: 1,   cursor: 'sw-resize'  },
  { type: 'bc', xFrac: 0.5, yFrac: 1,   cursor: 's-resize'   },
  { type: 'br', xFrac: 1,   yFrac: 1,   cursor: 'se-resize'  },
]

export default function CanvasResizeHandles({
  canvasSize,
  nodes,
  stageViewport,
  setCanvasSize,
  replaceNodes,
  setStageViewport,
  onCommit,
}) {
  const dragState = useRef(null)

  const { x: vx, y: vy, scale } = stageViewport
  const cw = canvasSize.width * scale
  const ch = canvasSize.height * scale

  const handlePointerDown = useCallback(
    (type, e) => {
      e.preventDefault()
      e.stopPropagation()
      e.currentTarget.setPointerCapture(e.pointerId)

      dragState.current = {
        type,
        startX: e.clientX,
        startY: e.clientY,
        startCanvasSize: { ...canvasSize },
        startViewport: { ...stageViewport },
        startNodes: nodes, // captured snapshot — used for absolute position computation
      }
    },
    [canvasSize, stageViewport, nodes]
  )

  const handlePointerMove = useCallback(
    (type, e) => {
      const ds = dragState.current
      if (!ds || ds.type !== type) return

      const { startX, startY, startCanvasSize, startViewport, startNodes } = ds
      const s = startViewport.scale

      const dx = (e.clientX - startX) / s // delta in canvas pixels
      const dy = (e.clientY - startY) / s

      let newWidth = startCanvasSize.width
      let newHeight = startCanvasSize.height
      let shiftX = 0
      let shiftY = 0
      let vpDx = 0
      let vpDy = 0

      // ── Right / left ──────────────────────────────────────────────────────
      if (type.includes('r')) {
        newWidth = Math.max(MIN_SIZE, startCanvasSize.width + dx)
      }
      if (type.includes('l')) {
        // Dragging left handle left (dx < 0) expands the canvas
        const rawWidth = startCanvasSize.width - dx
        newWidth = Math.max(MIN_SIZE, rawWidth)
        const expansion = newWidth - startCanvasSize.width // positive = grew wider
        shiftX = expansion           // shift all nodes right by the same amount
        vpDx = -expansion * s        // viewport origin moves left in screen space
      }

      // ── Bottom / top ──────────────────────────────────────────────────────
      if (type.includes('b')) {
        newHeight = Math.max(MIN_SIZE, startCanvasSize.height + dy)
      }
      if (type.includes('t')) {
        const rawHeight = startCanvasSize.height - dy
        newHeight = Math.max(MIN_SIZE, rawHeight)
        const expansion = newHeight - startCanvasSize.height
        shiftY = expansion
        vpDy = -expansion * s
      }

      // ── Apply atomically ──────────────────────────────────────────────────
      const finalSize = { width: Math.round(newWidth), height: Math.round(newHeight) }
      dragState.current.lastSize = finalSize
      setCanvasSize(finalSize)

      if (shiftX !== 0 || shiftY !== 0) {
        replaceNodes(startNodes.map((n) => ({
          ...n,
          x: n.x + shiftX,
          y: n.y + shiftY,
        })))
      }

      // Always sync viewport so handles stay anchored to the canvas edge
      setStageViewport({
        ...startViewport,
        x: startViewport.x + vpDx,
        y: startViewport.y + vpDy,
      })
    },
    [setCanvasSize, replaceNodes, setStageViewport]
  )

  const handlePointerUp = useCallback(() => {
    const lastSize = dragState.current?.lastSize
    dragState.current = null
    if (lastSize) onCommit(lastSize)
  }, [onCommit])

  return (
    <>
      {/* Dashed canvas border overlay */}
      <div
        className="pointer-events-none absolute"
        style={{
          left: vx,
          top: vy,
          width: cw,
          height: ch,
          outline: '2px dashed #0fff95',
          outlineOffset: '-1px',
        }}
      />

      {/* 8 drag handles */}
      {HANDLES.map(({ type, xFrac, yFrac, cursor }) => {
        const sx = vx + xFrac * cw
        const sy = vy + yFrac * ch

        return (
          <div
            key={type}
            className="absolute"
            style={{
              left: sx - 22,
              top: sy - 22,
              width: 44,
              height: 44,
              cursor,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              touchAction: 'none',
              zIndex: 10,
            }}
            onPointerDown={(e) => handlePointerDown(type, e)}
            onPointerMove={(e) => handlePointerMove(type, e)}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
          >
            {/* Visual square */}
            <div
              style={{
                width: 10,
                height: 10,
                background: 'white',
                border: '2px solid #0fff95',
                borderRadius: 2,
              }}
            />
          </div>
        )
      })}
    </>
  )
}
