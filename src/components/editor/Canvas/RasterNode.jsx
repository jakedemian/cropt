import { useRef } from 'react'
import { Image as KonvaImage } from 'react-konva'

export default function RasterNode({ node, canvasEl, draggable, onSelect, onChange }) {
  const imageRef = useRef(null)

  const handleDragEnd = (e) => {
    onChange({ x: e.target.x(), y: e.target.y() })
  }

  const handleTransformEnd = (e) => {
    const target = e.target
    onChange({
      x: target.x(),
      y: target.y(),
      scaleX: target.scaleX(),
      scaleY: target.scaleY(),
      rotation: target.rotation(),
    })
  }

  if (!canvasEl) return null

  return (
    <KonvaImage
      ref={imageRef}
      id={node.id}
      image={canvasEl}
      x={node.x}
      y={node.y}
      width={node.width}
      height={node.height}
      scaleX={node.scaleX}
      scaleY={node.scaleY}
      rotation={node.rotation}
      opacity={node.opacity}
      draggable={draggable}
      onClick={onSelect}
      onTap={onSelect}
      onDragEnd={handleDragEnd}
      onTransformEnd={handleTransformEnd}
    />
  )
}
