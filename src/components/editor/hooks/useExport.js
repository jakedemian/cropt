import { useCallback } from 'react'

export function useExport({ stageRef, canvasBackground, canvasSize, pixelRatio = 1 }) {

  // ── Shared blob capture ────────────────────────────────────────────────────
  // Resets the stage to identity transform, optionally strips the checkerboard
  // pattern for transparent-background exports, captures a PNG blob clipped to
  // canvasSize, then fully restores the stage.
  //
  // The stage container is hidden via `visibility: hidden` for the entire
  // operation. `visibility: hidden` removes the element from view but the
  // underlying canvas buffer remains fully readable by toBlob — so Konva's
  // internal redraws (triggered by changing x/y/scale) never flash on screen.
  const captureBlob = useCallback(async (ratio = pixelRatio) => {
    const stage = stageRef.current
    if (!stage) return null

    // Hide the stage so viewport resets don't flash on screen
    const container = stage.container()
    container.style.visibility = 'hidden'

    try {
      // Reset viewport transform so 1 stage px === 1 canvas px
      const origX      = stage.x()
      const origY      = stage.y()
      const origScaleX = stage.scaleX()
      const origScaleY = stage.scaleY()
      stage.x(0)
      stage.y(0)
      stage.scaleX(1)
      stage.scaleY(1)

      // Hide the Transformer so selection handles don't appear in the export
      const transformer = stage.findOne('Transformer')
      if (transformer) { transformer.visible(false); transformer.getLayer()?.batchDraw() }

      // Transparent background: remove the checkerboard before capture
      let bgRect = null
      let savedFillPatternImage = null
      if (canvasBackground === 'transparent') {
        const bgLayer = stage.getLayers()[0]
        bgRect = bgLayer?.getChildren()[0] ?? null
        if (bgRect) {
          savedFillPatternImage = bgRect.fillPatternImage()
          bgRect.fillPatternImage(null)
          bgRect.fill('')      // rect is now fully transparent
          bgLayer.draw()       // force Konva to redraw this layer before capture
        }
      }

      const blob = await new Promise((resolve, reject) => {
        try {
          const p = stage.toBlob({
            x: 0,
            y: 0,
            width:  canvasSize.width,
            height: canvasSize.height,
            pixelRatio: ratio,
            mimeType: 'image/png',
            callback: resolve,
          })
          // Konva's toBlob also returns a Promise internally — catch any rejection
          // so the outer Promise doesn't hang if Konva throws asynchronously.
          if (p && typeof p.then === 'function') p.catch(reject)
        } catch (err) {
          reject(err)
        }
      })

      // Restore stage
      stage.x(origX)
      stage.y(origY)
      stage.scaleX(origScaleX)
      stage.scaleY(origScaleY)
      if (bgRect && savedFillPatternImage) {
        bgRect.fillPatternImage(savedFillPatternImage)
        stage.getLayers()[0]?.draw()
      }
      if (transformer) { transformer.visible(true); transformer.getLayer()?.batchDraw() }

      return blob
    } finally {
      // Always restore visibility, even if capture throws
      container.style.visibility = ''
    }
  }, [stageRef, canvasBackground, canvasSize, pixelRatio])

  // ── Export (download or native share sheet) ────────────────────────────────
  const exportCanvas = useCallback(async () => {
    const blob = await captureBlob(pixelRatio)
    if (!blob) return

    const filename = `cropt-${pixelRatio}x.png`
    const file = new File([blob], filename, { type: 'image/png' })

    // Use the native share sheet only on touch-primary devices (phones / tablets).
    // navigator.share is also available on desktop macOS/Windows but a direct
    // download is more natural there, so we gate on maxTouchPoints > 0.
    const isTouchDevice = navigator.maxTouchPoints > 0
    if (isTouchDevice && navigator.share && navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: 'Cropt' })
        return
      } catch (err) {
        if (err.name === 'AbortError') return   // user dismissed share sheet
        // Other errors fall through to download
      }
    }

    // Fallback: trigger browser download
    const url = URL.createObjectURL(blob)
    const a   = document.createElement('a')
    a.href     = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }, [captureBlob, pixelRatio])

  // ── Copy to clipboard ──────────────────────────────────────────────────────
  // Always captures at 1× for clipboard (oversized images paste poorly in most
  // apps). Falls back gracefully if the Clipboard API isn't available.
  const copyCanvas = useCallback(async () => {
    if (!navigator.clipboard?.write) {
      // Clipboard API unavailable — fall back to a silent download so the user
      // isn't left hanging.
      return exportCanvas()
    }

    const blob = await captureBlob(1)
    if (!blob) return

    try {
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob }),
      ])
    } catch (err) {
      console.warn('Clipboard write failed:', err)
    }
  }, [captureBlob, exportCanvas])

  return { exportCanvas, copyCanvas, captureBlob }
}
