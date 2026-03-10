import { useEffect, useRef } from 'react'
import { Transformer } from 'react-konva'

export default function TransformWrapper({ stageRef, nodes, selectedNodeId, imageLoadCount }) {
  const trRef = useRef(null)

  useEffect(() => {
    if (!trRef.current || !stageRef.current) return

    if (selectedNodeId) {
      const selectedNode = stageRef.current.findOne(`#${selectedNodeId}`)
      if (selectedNode) {
        trRef.current.nodes([selectedNode])
        trRef.current.getLayer()?.batchDraw()
      }
    } else {
      trRef.current.nodes([])
      trRef.current.getLayer()?.batchDraw()
    }
  }, [selectedNodeId, nodes, stageRef, imageLoadCount])

  return (
    <Transformer
      ref={trRef}
      rotateEnabled
      keepRatio={false}
      boundBoxFunc={(oldBox, newBox) => {
        // Prevent collapsing to zero
        if (Math.abs(newBox.width) < 5 || Math.abs(newBox.height) < 5) return oldBox
        return newBox
      }}
    />
  )
}
