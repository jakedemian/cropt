import { Text as KonvaText } from 'react-konva'

export default function TextNode({ node, isEditing, draggable = true, onSelect, onChange, onEditRequest }) {
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

  return (
    <KonvaText
      id={node.id}
      text={node.text || ''}
      x={node.x}
      y={node.y}
      width={node.width || undefined}
      fontSize={node.fontSize}
      fontFamily={node.fontFamily}
      fontStyle={node.fontStyle}
      fill={node.fill}
      stroke={node.stroke}
      strokeWidth={node.strokeWidth}
      fillAfterStrokeEnabled={true}
      strokeScaleEnabled={false}
      align={node.align || 'left'}
      wrap="word"
      scaleX={node.scaleX}
      scaleY={node.scaleY}
      rotation={node.rotation}
      opacity={node.opacity}
      visible={!isEditing}
      draggable={draggable}
      onClick={onSelect}
      onTap={onSelect}
      onDblClick={onEditRequest}
      onDblTap={onEditRequest}
      onDragEnd={handleDragEnd}
      onTransformEnd={handleTransformEnd}
    />
  )
}
