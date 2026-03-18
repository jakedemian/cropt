import { renderHook, act } from '@testing-library/react'
import { useImageImport } from './useImageImport'

// ── Mocks ──────────────────────────────────────────────────────────────────────

let mockImageInstance = null

class MockImage {
  constructor() {
    mockImageInstance = this
    this.naturalWidth  = 300
    this.naturalHeight = 200
    this.onload        = null
    this._src          = ''
  }
  get src() { return this._src }
  set src(val) { this._src = val }
}

beforeAll(() => {
  vi.stubGlobal('Image', MockImage)
  vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:fake')
  vi.spyOn(URL, 'revokeObjectURL').mockReturnValue(undefined)

  HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
    drawImage:   vi.fn(),
    clearRect:   vi.fn(),
    fillRect:    vi.fn(),
    getImageData: vi.fn(() => ({ data: new Uint8ClampedArray(4) })),
  }))
  HTMLCanvasElement.prototype.toDataURL = vi.fn(() => 'data:image/png;base64,fake')
})

afterAll(() => {
  vi.unstubAllGlobals()
})

// Helper: fire handleFileChange with a fake image file, then trigger onload with given dimensions
function triggerImport(hook, width, height, filename = 'test.png') {
  mockImageInstance = null
  const file = new File([''], filename, { type: 'image/png' })
  act(() => {
    hook.handleFileChange({ target: { files: [file], value: '' } })
  })
  // Set dimensions before firing onload (naturalWidth/naturalHeight aren't set until load)
  mockImageInstance.naturalWidth  = width
  mockImageInstance.naturalHeight = height
  act(() => { mockImageInstance.onload() })
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('useImageImport — importBlob node dimensions', () => {
  it('creates a raster node sized to the image, not the canvas, when image is smaller', () => {
    const addNode      = vi.fn()
    const setCanvasSize = vi.fn()
    const selectNode   = vi.fn()
    const canvasSize   = { width: 1080, height: 1080 }

    const { result } = renderHook(() =>
      useImageImport({ canvasSize, setCanvasSize, addNode, selectNode })
    )

    triggerImport(result.current, 300, 200)

    expect(addNode).toHaveBeenCalledOnce()
    const node = addNode.mock.calls[0][0]
    expect(node.type).toBe('raster')
    expect(node.width).toBe(300)
    expect(node.height).toBe(200)
    expect(node.x).toBe(390)   // (1080 - 300) / 2
    expect(node.y).toBe(440)   // (1080 - 200) / 2
  })

  it('does not expand the canvas when the image fits within current canvas bounds', () => {
    const addNode       = vi.fn()
    const setCanvasSize = vi.fn()
    const selectNode    = vi.fn()
    const canvasSize    = { width: 1080, height: 1080 }

    const { result } = renderHook(() =>
      useImageImport({ canvasSize, setCanvasSize, addNode, selectNode })
    )

    triggerImport(result.current, 300, 200)

    expect(setCanvasSize).not.toHaveBeenCalled()
  })

  it('creates a raster node at (0, 0) filling the full canvas when image equals canvas size', () => {
    const addNode       = vi.fn()
    const setCanvasSize = vi.fn()
    const selectNode    = vi.fn()
    const canvasSize    = { width: 1080, height: 1080 }

    const { result } = renderHook(() =>
      useImageImport({ canvasSize, setCanvasSize, addNode, selectNode })
    )

    triggerImport(result.current, 1080, 1080)

    expect(addNode).toHaveBeenCalledOnce()
    const node = addNode.mock.calls[0][0]
    expect(node.x).toBe(0)
    expect(node.y).toBe(0)
    expect(node.width).toBe(1080)
    expect(node.height).toBe(1080)
  })

  it('expands the canvas and positions the node at (0, 0) when the image is larger than the canvas', () => {
    const addNode       = vi.fn()
    const setCanvasSize = vi.fn()
    const selectNode    = vi.fn()
    const canvasSize    = { width: 400, height: 300 }

    const { result } = renderHook(() =>
      useImageImport({ canvasSize, setCanvasSize, addNode, selectNode })
    )

    triggerImport(result.current, 800, 600)

    expect(setCanvasSize).toHaveBeenCalledWith({ width: 800, height: 600 })

    expect(addNode).toHaveBeenCalledOnce()
    const node = addNode.mock.calls[0][0]
    expect(node.x).toBe(0)
    expect(node.y).toBe(0)
    expect(node.width).toBe(800)
    expect(node.height).toBe(600)
  })
})
