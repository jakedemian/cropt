import { render } from '@testing-library/react'
import TopBar from '@/components/editor/Toolbar/TopBar'

describe('TopBar', () => {
  it('renders without crashing', () => {
    render(
      <TopBar
        canvasResizeMode={false}
        cropMode={false}
        canvasCropMode={false}
        onNew={() => {}}
        onExport={() => {}}
        onCopy={() => {}}
        onPaste={() => {}}
        onUndo={() => {}}
        onRedo={() => {}}
        canUndo={false}
        canRedo={false}
        onAddImage={() => {}}
        pixelRatio={1}
        onTogglePixelRatio={() => {}}
        canInstall={false}
        onInstall={() => {}}
        version="0.0.0"
        onShare={() => {}}
        uploadStatus={null}
        sidebarOpen={false}
        onToggleSidebar={() => {}}
        onOpenHistory={() => {}}
      />
    )
    expect(document.body).toBeInTheDocument()
  })
})
