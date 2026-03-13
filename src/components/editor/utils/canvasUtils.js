/**
 * Compute the initial viewport scale and offset to fit the canvas
 * centered within the available stage container dimensions.
 */
export function fitCanvasToContainer(canvasWidth, canvasHeight, containerWidth, containerHeight, padding = 24) {
  const scaleX = (containerWidth - padding * 2) / canvasWidth
  const scaleY = (containerHeight - padding * 2) / canvasHeight
  const scale = Math.min(scaleX, scaleY, 1)

  const x = (containerWidth - canvasWidth * scale) / 2
  const y = (containerHeight - canvasHeight * scale) / 2

  return { x, y, scale }
}

/**
 * Clamp a value between min and max.
 */
export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}

/**
 * Crop an image node to an arbitrary axis-aligned rect (in canvas coordinates).
 * Handles flipX; rotation must be 0 (callers should guard).
 * Returns a partial node update: { src, x, y, width, height, scaleX, scaleY, flipX, rotation }.
 */
export async function cropImageToRect(node, cropRect) {
  const absScaleX = Math.abs(node.scaleX)
  const absScaleY = Math.abs(node.scaleY)
  const renderedW = node.width * absScaleX
  const renderedH = node.height * absScaleY

  const img = await loadImageElement(node.src)

  // Draw the rendered (and optionally flipped) image into an offscreen canvas
  // that matches the node's rendered size, origin at (0, 0).
  const offscreen = document.createElement('canvas')
  offscreen.width = Math.ceil(renderedW)
  offscreen.height = Math.ceil(renderedH)
  const ctx = offscreen.getContext('2d')

  ctx.save()
  if (node.flipX) {
    // Mirror around the right edge so the flipped image fills (0,0)→(renderedW,renderedH)
    ctx.translate(renderedW, 0)
    ctx.scale(-1, 1)
  }
  ctx.drawImage(img, 0, 0, node.width, node.height, 0, 0, renderedW, renderedH)
  ctx.restore()

  // cropRect is in canvas coords; convert to local (offscreen) coords
  const localX = cropRect.x - node.x
  const localY = cropRect.y - node.y
  const cw = Math.round(cropRect.width)
  const ch = Math.round(cropRect.height)

  const cropped = document.createElement('canvas')
  cropped.width = cw
  cropped.height = ch
  cropped.getContext('2d').drawImage(offscreen, localX, localY, cropRect.width, cropRect.height, 0, 0, cw, ch)

  return {
    src: cropped.toDataURL('image/png'),
    x: cropRect.x,
    y: cropRect.y,
    width: cw,
    height: ch,
    scaleX: 1,
    scaleY: 1,
    flipX: false,
    rotation: 0,
  }
}

/**
 * Crop a raster node to the given canvas bounds.
 * Returns null if the node is entirely outside; returns the original node if
 * it already fits; otherwise returns a new node with a cropped dataUrl.
 */
export async function cropRasterToCanvas(node, canvasWidth, canvasHeight) {
  if (node.type !== 'raster') return node

  const ix      = Math.max(0, node.x)
  const iy      = Math.max(0, node.y)
  const iRight  = Math.min(canvasWidth,  node.x + node.width)
  const iBottom = Math.min(canvasHeight, node.y + node.height)

  if (iRight <= ix || iBottom <= iy) return null

  const iw = iRight - ix
  const ih = iBottom - iy

  // Already fully inside — nothing to do.
  if (ix === node.x && iy === node.y && Math.round(iw) === node.width && Math.round(ih) === node.height) {
    return node
  }

  const output = document.createElement('canvas')
  output.width  = Math.round(iw)
  output.height = Math.round(ih)

  if (node.dataUrl) {
    const img = await loadImageElement(node.dataUrl)
    // node.dataUrl pixel (0,0) = canvas position (node.x, node.y),
    // so the intersection starts at node-local offset (ix - node.x, iy - node.y).
    output.getContext('2d').drawImage(img,
      ix - node.x, iy - node.y, iw, ih,
      0, 0, Math.round(iw), Math.round(ih),
    )
  }

  return {
    ...node,
    x:      ix,
    y:      iy,
    width:  Math.round(iw),
    height: Math.round(ih),
    dataUrl: output.toDataURL('image/png'),
  }
}

/**
 * Load an HTMLImageElement from a src string (data URL or URL).
 */
export function loadImageElement(src) {
  return new Promise((resolve, reject) => {
    const img = new window.Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

/**
 * Destructively crop an image node to the canvas bounds.
 *
 * - Only handles rotation=0 nodes (rotated nodes are left unchanged — the
 *   Konva layer clip already provides visual cropping for them).
 * - Returns null if the node is entirely outside the canvas (caller should
 *   remove it).
 * - Returns the original node object unchanged if it already fits entirely
 *   inside the canvas.
 * - Otherwise returns a new node with a cropped data-URL src and updated
 *   geometry (x, y, width, height, scaleX=1, scaleY=1, flipX=false).
 */
export async function cropNodeToCanvas(node, canvasWidth, canvasHeight) {
  if (node.type !== 'image' || node.rotation !== 0) return node

  const renderedW = node.width * node.scaleX
  const renderedH = node.height * node.scaleY

  // Konva renders flipX as offsetX=width + scaleX=-absScaleX, which means the
  // visible left edge is still node.x regardless of flipX.
  const renderedLeft = node.x
  const renderedTop = node.y
  const renderedRight = renderedLeft + renderedW
  const renderedBottom = renderedTop + renderedH

  // Already fully inside — nothing to do.
  if (
    renderedLeft >= 0 &&
    renderedTop >= 0 &&
    renderedRight <= canvasWidth &&
    renderedBottom <= canvasHeight
  ) {
    return node
  }

  // Intersection with canvas bounds.
  const ix = Math.max(0, renderedLeft)
  const iy = Math.max(0, renderedTop)
  const iRight = Math.min(canvasWidth, renderedRight)
  const iBottom = Math.min(canvasHeight, renderedBottom)

  // Completely outside — signal removal.
  if (iRight <= ix || iBottom <= iy) return null

  const iw = iRight - ix
  const ih = iBottom - iy

  // Draw the rendered image (at its current scale / flip) onto an offscreen
  // canvas that matches the canvas dimensions, then copy just the intersection
  // rectangle out into a second cropped canvas.
  const img = await loadImageElement(node.src)

  const offscreen = document.createElement('canvas')
  offscreen.width = canvasWidth
  offscreen.height = canvasHeight
  const ctx = offscreen.getContext('2d')

  ctx.save()
  if (node.flipX) {
    // Mirror around x=node.x: translate to the right edge, then flip.
    ctx.translate(node.x + renderedW, node.y)
    ctx.scale(-node.scaleX, node.scaleY)
    ctx.drawImage(img, 0, 0, node.width, node.height)
  } else {
    ctx.drawImage(img, node.x, node.y, renderedW, renderedH)
  }
  ctx.restore()

  const cropped = document.createElement('canvas')
  cropped.width = Math.round(iw)
  cropped.height = Math.round(ih)
  cropped.getContext('2d').drawImage(offscreen, ix, iy, iw, ih, 0, 0, iw, ih)

  return {
    ...node,
    src: cropped.toDataURL('image/png'),
    x: ix,
    y: iy,
    width: Math.round(iw),
    height: Math.round(ih),
    scaleX: 1,
    scaleY: 1,
    flipX: false,
  }
}
