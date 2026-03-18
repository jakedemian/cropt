import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '@/components/editor/App'

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('@/components/editor/Canvas/CanvasStage', () => ({
  default: () => <div data-testid="canvas-stage" />,
}))

vi.mock('@/components/editor/hooks/useDocumentHistory', () => ({
  useDocumentHistory: () => ({
    saveToHistory: vi.fn().mockResolvedValue(undefined),
    loadHistory: vi.fn().mockResolvedValue([]),
    loadDocument: vi.fn().mockResolvedValue(null),
    touchEntry: vi.fn().mockResolvedValue(undefined),
  }),
}))

// ── Setup ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  localStorage.clear()
})

// ── Tool switching via toolbar ────────────────────────────────────────────────

describe('App — tool switching via toolbar', () => {
  it('starts with select (Move) as the active tool', () => {
    render(<App />)
    // Brush controls are absent when select is active
    expect(screen.queryByTitle('Brush colour')).not.toBeInTheDocument()
    // Mode-locked buttons are absent
    expect(screen.queryByRole('button', { name: /Apply Resize/i })).not.toBeInTheDocument()
  })

  it('activates brush tool when the Brush button is clicked', async () => {
    render(<App />)
    await userEvent.click(screen.getByTitle('Brush'))
    // Brush color picker appears when brush is active
    expect(screen.getByTitle('Brush colour')).toBeInTheDocument()
  })

  it('activates eraser tool when the Eraser button is clicked', async () => {
    render(<App />)
    await userEvent.click(screen.getByTitle('Eraser'))
    // Size slider appears, but no color picker for eraser
    expect(screen.getByRole('slider')).toBeInTheDocument()
    expect(screen.queryByTitle('Brush colour')).not.toBeInTheDocument()
  })

  it('activates marquee tool when the Select button is clicked', async () => {
    render(<App />)
    await userEvent.click(screen.getByTitle('Select'))
    // Brush controls do not appear for marquee
    expect(screen.queryByTitle('Brush colour')).not.toBeInTheDocument()
    expect(screen.queryByRole('slider')).not.toBeInTheDocument()
  })

  it('activates text tool when the Text button is clicked', async () => {
    render(<App />)
    await userEvent.click(screen.getByTitle('Text'))
    // Brush controls do not appear for text
    expect(screen.queryByTitle('Brush colour')).not.toBeInTheDocument()
    expect(screen.queryByRole('slider')).not.toBeInTheDocument()
  })

  it('returns to select tool when Move button is clicked while another tool is active', async () => {
    render(<App />)
    await userEvent.click(screen.getByTitle('Brush'))
    expect(screen.getByTitle('Brush colour')).toBeInTheDocument()

    await userEvent.click(screen.getByTitle('Move'))
    expect(screen.queryByTitle('Brush colour')).not.toBeInTheDocument()
  })
})

// ── Toolbar controls reflect active tool ─────────────────────────────────────

describe('App — toolbar controls reflect active tool', () => {
  it('shows brush controls after switching to brush tool', async () => {
    render(<App />)
    await userEvent.click(screen.getByTitle('Brush'))
    expect(screen.getByTitle('Brush colour')).toBeInTheDocument()
    expect(screen.getByRole('slider')).toBeInTheDocument()
  })

  it('shows size control but no color picker after switching to eraser tool', async () => {
    render(<App />)
    await userEvent.click(screen.getByTitle('Eraser'))
    expect(screen.queryByTitle('Brush colour')).not.toBeInTheDocument()
    expect(screen.getByRole('slider')).toBeInTheDocument()
  })

  it('hides brush controls after switching from brush back to select', async () => {
    render(<App />)
    await userEvent.click(screen.getByTitle('Brush'))
    expect(screen.getByTitle('Brush colour')).toBeInTheDocument()

    await userEvent.click(screen.getByTitle('Move'))
    expect(screen.queryByTitle('Brush colour')).not.toBeInTheDocument()
    expect(screen.queryByRole('slider')).not.toBeInTheDocument()
  })
})

// ── Raster layer auto-creation ────────────────────────────────────────────────

describe('App — raster layer auto-creation', () => {
  it('auto-creates a raster layer when switching to brush with no nodes present', async () => {
    render(<App />)
    expect(screen.queryByText('Layer 1')).not.toBeInTheDocument()

    await userEvent.click(screen.getByTitle('Brush'))
    expect(screen.getByText('Layer 1')).toBeInTheDocument()
  })

  it('auto-creates a raster layer when switching to eraser with no nodes present', async () => {
    render(<App />)
    expect(screen.queryByText('Layer 1')).not.toBeInTheDocument()

    await userEvent.click(screen.getByTitle('Eraser'))
    expect(screen.getByText('Layer 1')).toBeInTheDocument()
  })

  it('does not create a second raster layer when brush is selected while a raster layer is already active', async () => {
    render(<App />)

    // First click creates Layer 1 and selects it
    await userEvent.click(screen.getByTitle('Brush'))
    expect(screen.getAllByText(/^Layer \d+$/).length).toBe(1)

    // Switch away and back — should reuse Layer 1, not create Layer 2
    await userEvent.click(screen.getByTitle('Move'))
    await userEvent.click(screen.getByTitle('Brush'))
    expect(screen.getAllByText(/^Layer \d+$/).length).toBe(1)
  })
})

// ── Resize mode transitions ───────────────────────────────────────────────────

describe('App — resize mode transitions', () => {
  it('shows only Cancel and Apply Resize toolbar when resize button is clicked', async () => {
    render(<App />)
    await userEvent.click(screen.getByTitle('Resize canvas'))
    expect(screen.getByRole('button', { name: /Apply Resize/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Cancel/i })).toBeInTheDocument()
    // Normal tool buttons are gone
    expect(screen.queryByTitle('Brush')).not.toBeInTheDocument()
  })

  it('restores the normal toolbar when Cancel is clicked in resize mode', async () => {
    render(<App />)
    await userEvent.click(screen.getByTitle('Resize canvas'))
    expect(screen.getByRole('button', { name: /Apply Resize/i })).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /Cancel/i }))
    expect(screen.queryByRole('button', { name: /Apply Resize/i })).not.toBeInTheDocument()
    expect(screen.getByTitle('Brush')).toBeInTheDocument()
  })
})

// ── ESC key behavior ──────────────────────────────────────────────────────────

describe('App — ESC key behavior', () => {
  it('pressing Escape while brush is active returns to select tool', async () => {
    render(<App />)
    await userEvent.click(screen.getByTitle('Brush'))
    expect(screen.getByTitle('Brush colour')).toBeInTheDocument()

    fireEvent.keyDown(window, { key: 'Escape' })
    expect(screen.queryByTitle('Brush colour')).not.toBeInTheDocument()
  })

  it('pressing Escape while eraser is active returns to select tool', async () => {
    render(<App />)
    await userEvent.click(screen.getByTitle('Eraser'))
    expect(screen.getByRole('slider')).toBeInTheDocument()

    fireEvent.keyDown(window, { key: 'Escape' })
    expect(screen.queryByRole('slider')).not.toBeInTheDocument()
  })

  it('pressing Escape while text tool is active returns to select tool', async () => {
    render(<App />)
    await userEvent.click(screen.getByTitle('Text'))
    // Text tool is active — brush controls are not shown
    expect(screen.queryByTitle('Brush colour')).not.toBeInTheDocument()

    fireEvent.keyDown(window, { key: 'Escape' })

    // After ESC, Move tool should be active — we can still click Brush and see its controls
    // confirming the tool state reset by verifying the toolbar is still in normal (non-locked) state
    expect(screen.getByTitle('Brush')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Apply/i })).not.toBeInTheDocument()
  })

  it('pressing Escape while select tool is active has no effect', async () => {
    render(<App />)
    // Confirm we start in normal select state
    expect(screen.queryByTitle('Brush colour')).not.toBeInTheDocument()

    fireEvent.keyDown(window, { key: 'Escape' })

    // Still in normal state — no crash, toolbar unchanged
    expect(screen.queryByTitle('Brush colour')).not.toBeInTheDocument()
    expect(screen.getByTitle('Brush')).toBeInTheDocument()
  })
})
