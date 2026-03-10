import { useCallback, useRef } from 'react'
import { v4 as uuidv4 } from 'uuid'

const MAX_DIMENSION = 2000

function downscaleIfNeeded(img) {
  const { naturalWidth: w, naturalHeight: h } = img
  if (w <= MAX_DIMENSION && h <= MAX_DIMENSION) return { src: null, width: w, height: h }

  const scale = MAX_DIMENSION / Math.max(w, h)
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(w * scale)
  canvas.height = Math.round(h * scale)
  canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)

  return { src: canvas.toDataURL('image/jpeg', 0.92), width: canvas.width, height: canvas.height }
}

export function useImageImport({ canvasSize, setCanvasSize, addNode, selectNode }) {
  const inputRef = useRef(null)

  const openPicker = useCallback(() => {
    inputRef.current?.click()
  }, [])

  // Shared: load a blob/objectURL, downscale, add as node
  const importBlob = useCallback(
    (blob, name = 'Pasted') => {
      const objectUrl = URL.createObjectURL(blob)
      const img = new window.Image()
      img.onload = () => {
        const { src: resizedSrc, width: w, height: h } = downscaleIfNeeded(img)
        const finalSrc = resizedSrc ?? objectUrl

        // Expand canvas to fit the image if it's larger (MS Paint behaviour)
        const newCanvasWidth = Math.max(canvasSize.width, w)
        const newCanvasHeight = Math.max(canvasSize.height, h)
        if (newCanvasWidth !== canvasSize.width || newCanvasHeight !== canvasSize.height) {
          setCanvasSize({ width: newCanvasWidth, height: newCanvasHeight })
        }

        const x = (newCanvasWidth - w) / 2
        const y = (newCanvasHeight - h) / 2

        const id = uuidv4()
        addNode({
          id,
          type: 'image',
          name: name.slice(0, 24) || 'Image',
          src: finalSrc,
          x,
          y,
          width: w,
          height: h,
          rotation: 0,
          scaleX: 1,
          scaleY: 1,
          opacity: 1,
          visible: true,
          flipX: false,
          cropRect: null,
        })
        selectNode(id)
      }
      img.src = objectUrl
    },
    [canvasSize, setCanvasSize, addNode, selectNode]
  )

  const handleFileChange = useCallback(
    (e) => {
      const files = Array.from(e.target.files)
      e.target.value = ''

      files.forEach((file) => {
        if (!file.type.startsWith('image/')) return
        const name = file.name.replace(/\.[^.]+$/, '')
        importBlob(file, name)
      })
    },
    [importBlob]
  )

  // Paste from clipboard — used by the Paste button and Ctrl+V
  const handlePaste = useCallback(
    async (clipboardData) => {
      // If called with a ClipboardEvent's clipboardData (from paste event)
      if (clipboardData?.items) {
        for (const item of clipboardData.items) {
          if (item.type.startsWith('image/')) {
            const blob = item.getAsFile()
            if (blob) importBlob(blob, 'Pasted')
            return
          }
        }
        return
      }

      // Otherwise use the async Clipboard API (from button click)
      if (!navigator.clipboard?.read) return
      try {
        const items = await navigator.clipboard.read()
        for (const item of items) {
          const imageType = item.types.find((t) => t.startsWith('image/'))
          if (imageType) {
            const blob = await item.getType(imageType)
            importBlob(blob, 'Pasted')
            return
          }
        }
      } catch {
        // Permission denied or no image — silently ignore
      }
    },
    [importBlob]
  )

  return { inputRef, openPicker, handleFileChange, handlePaste }
}
