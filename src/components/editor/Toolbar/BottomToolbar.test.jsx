import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import BottomToolbar from '@/components/editor/Toolbar/BottomToolbar'

// ── Shared defaults ───────────────────────────────────────────────────────────

const noop = () => {}

const defaultProps = {
  canvasResizeMode: false,
  cropMode: false,
  canvasCropMode: false,
  isTextEditing: false,
  selectedNode: null,
  canvasSize: { width: 800, height: 600 },
  canvasBackground: '#ffffff',
  showLayerPanel: false,
  marqueeSelection: null,
  activeTool: 'select',
  brushColor: '#000000',
  brushSize: 20,
  stageScale: 1,
  onFlip: noop,
  onSetBackground: noop,
  onToggleLayerPanel: noop,
  onDeleteMarqueeArea: noop,
  onEnterCanvasCrop: noop,
  onConfirmCanvasCrop: noop,
  onCancelCanvasCrop: noop,
  onEnterResize: noop,
  onConfirmResize: noop,
  onCancelResize: noop,
  onEnterCrop: noop,
  onConfirmCrop: noop,
  onCancelCrop: noop,
  onSetActiveTool: noop,
  onEnterTextEdit: noop,
  onTextStyleStart: noop,
  onTextStyleChange: noop,
  onBrushColorChange: noop,
  onBrushSizeChange: noop,
}

function renderToolbar(overrides = {}) {
  return render(<BottomToolbar {...defaultProps} {...overrides} />)
}

// ── Mode-locked rendering ─────────────────────────────────────────────────────

describe('BottomToolbar — mode-locked rendering', () => {
  it('renders only Cancel and Apply Resize buttons when canvasResizeMode is true', () => {
    renderToolbar({ canvasResizeMode: true })
    expect(screen.getByRole('button', { name: /Apply Resize/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Cancel/i })).toBeInTheDocument()
  })

  it('renders only Cancel and Apply Trim buttons when cropMode is true', () => {
    renderToolbar({ cropMode: true })
    expect(screen.getByRole('button', { name: /Apply Trim/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Cancel/i })).toBeInTheDocument()
  })

  it('renders only Cancel and Apply Crop buttons when canvasCropMode is true', () => {
    renderToolbar({ canvasCropMode: true })
    expect(screen.getByRole('button', { name: /Apply Crop/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Cancel/i })).toBeInTheDocument()
  })

  it('does not render the tool selector when canvasResizeMode is true', () => {
    renderToolbar({ canvasResizeMode: true })
    expect(screen.queryByTitle('Brush')).not.toBeInTheDocument()
    expect(screen.queryByTitle('Eraser')).not.toBeInTheDocument()
  })

  it('does not render the tool selector when cropMode is true', () => {
    renderToolbar({ cropMode: true })
    expect(screen.queryByTitle('Brush')).not.toBeInTheDocument()
    expect(screen.queryByTitle('Eraser')).not.toBeInTheDocument()
  })

  it('does not render the tool selector when canvasCropMode is true', () => {
    renderToolbar({ canvasCropMode: true })
    expect(screen.queryByTitle('Brush')).not.toBeInTheDocument()
    expect(screen.queryByTitle('Eraser')).not.toBeInTheDocument()
  })
})

// ── Tool controls visibility ──────────────────────────────────────────────────

describe('BottomToolbar — tool controls visibility', () => {
  it('shows brush color picker and size control when brush tool is active', () => {
    renderToolbar({ activeTool: 'brush' })
    expect(screen.getByTitle('Brush colour')).toBeInTheDocument()
    // Desktop size slider is present
    expect(screen.getByRole('slider')).toBeInTheDocument()
  })

  it('shows size control but no color picker when eraser tool is active', () => {
    renderToolbar({ activeTool: 'eraser' })
    expect(screen.queryByTitle('Brush colour')).not.toBeInTheDocument()
    expect(screen.getByRole('slider')).toBeInTheDocument()
  })

  it('hides brush controls when select tool is active', () => {
    renderToolbar({ activeTool: 'select' })
    expect(screen.queryByTitle('Brush colour')).not.toBeInTheDocument()
    expect(screen.queryByRole('slider')).not.toBeInTheDocument()
  })

  it('hides brush controls when marquee tool is active', () => {
    renderToolbar({ activeTool: 'marquee' })
    expect(screen.queryByTitle('Brush colour')).not.toBeInTheDocument()
    expect(screen.queryByRole('slider')).not.toBeInTheDocument()
  })

  it('hides brush controls when text tool is active', () => {
    renderToolbar({ activeTool: 'text' })
    expect(screen.queryByTitle('Brush colour')).not.toBeInTheDocument()
    expect(screen.queryByRole('slider')).not.toBeInTheDocument()
  })
})

// ── Tool button callbacks ─────────────────────────────────────────────────────

describe('BottomToolbar — tool button callbacks', () => {
  it('calls onSetActiveTool with "select" when Move button is clicked', async () => {
    const onSetActiveTool = vi.fn()
    renderToolbar({ onSetActiveTool })
    await userEvent.click(screen.getByTitle('Move'))
    expect(onSetActiveTool).toHaveBeenCalledWith('select')
  })

  it('calls onSetActiveTool with "marquee" when Select button is clicked', async () => {
    const onSetActiveTool = vi.fn()
    renderToolbar({ onSetActiveTool })
    await userEvent.click(screen.getByTitle('Select'))
    expect(onSetActiveTool).toHaveBeenCalledWith('marquee')
  })

  it('calls onSetActiveTool with "brush" when Brush button is clicked', async () => {
    const onSetActiveTool = vi.fn()
    renderToolbar({ onSetActiveTool })
    await userEvent.click(screen.getByTitle('Brush'))
    expect(onSetActiveTool).toHaveBeenCalledWith('brush')
  })

  it('calls onSetActiveTool with "eraser" when Eraser button is clicked', async () => {
    const onSetActiveTool = vi.fn()
    renderToolbar({ onSetActiveTool })
    await userEvent.click(screen.getByTitle('Eraser'))
    expect(onSetActiveTool).toHaveBeenCalledWith('eraser')
  })

  it('calls onSetActiveTool with "text" when Text button is clicked', async () => {
    const onSetActiveTool = vi.fn()
    renderToolbar({ onSetActiveTool })
    await userEvent.click(screen.getByTitle('Text'))
    expect(onSetActiveTool).toHaveBeenCalledWith('text')
  })
})
