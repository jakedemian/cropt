import { useEffect, useRef, useState } from 'react'
import { Image as KonvaImage } from 'react-konva'

export default function ImageNode({ node, draggable = true, onSelect, onChange, onLoad }) {
  const [img, setImg] = useState(null)
  const imageRef = useRef(null)

  useEffect(() => {
    const image = new window.Image()
    image.crossOrigin = 'anonymous'
    image.onload = () => { setImg(image); onLoad?.(image) }
    image.src = node.src
  }, [node.src]) // eslint-disable-line react-hooks/exhaustive-deps -- onLoad intentionally excluded; it's a stable callback

  const handleDragEnd = (e) => {
    onChange({ x: e.target.x(), y: e.target.y() })
  }

  const handleTransformEnd = (e) => {
    const node = e.target
    onChange({
      x: node.x(),
      y: node.y(),
      scaleX: node.scaleX(),
      scaleY: node.scaleY(),
      rotation: node.rotation(),
    })
  }

  if (!img) return null

  return (
    <KonvaImage
      ref={imageRef}
      id={node.id}
      image={img}
      x={node.x}
      y={node.y}
      width={node.width}
      height={node.height}
      scaleX={node.flipX ? -node.scaleX : node.scaleX}
      scaleY={node.scaleY}
      offsetX={node.flipX ? node.width : 0}
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
