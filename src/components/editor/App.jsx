import { useRef, useState, useEffect, useCallback } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { X, Clock } from 'lucide-react'
import { version } from '../../../package.json'
import { useCanvasState } from './hooks/useCanvasState'
import { useImageImport } from './hooks/useImageImport'
import { useExport } from './hooks/useExport'
import { useUpload } from './hooks/useUpload'
import { useInstallPrompt } from './hooks/useInstallPrompt'
import { useSessionPersistence } from './hooks/useSessionPersistence'
import { useBackGuard } from './hooks/useBackGuard'
import { useDocumentHistory } from './hooks/useDocumentHistory'
import { cropNodeToCanvas, cropImageToRect } from './utils/canvasUtils'
import CanvasStage from './Canvas/CanvasStage'
import TopBar from './Toolbar/TopBar'
import BottomToolbar from './Toolbar/BottomToolbar'
import LayerPanel from './LayerPanel/LayerPanel'
import DesktopSidebar from './Sidebar/DesktopSidebar'
import HistoryPanel from './Sidebar/HistoryPanel'

export default function App() {
  const stageRef = useRef(null)
  const [showLayerPanel, setShowLayerPanel] = useState(false)
  const [showMobileHistory, setShowMobileHistory] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    try { return localStorage.getItem('cropt_sidebar') !== 'false' } catch { return true }
  })
  const [historyEntries, setHistoryEntries] = useState([])
  // Shared with useBackGuard — when the user confirms "Leave" in our custom
  // dialog, this ref is set true before history.back() so the beforeunload
  // handler stands down and doesn't show a redundant second dialog.
  const suppressBeforeUnloadRef = useRef(false)

  const {
    canvasSize,
    setCanvasSize,
    canvasBackground,
    setCanvasBackground,
    canvasResizeMode,
    toggleResizeMode,
    nodes,
    addNode,
    updateNode,
    removeNode,
    reorderNodes,
    replaceNodes,
    selectedNodeId,
    selectNode,
    stageViewport,
    setStageViewport,
    pushHistory,
    pushSnapshot,
    undo,
    redo,
    canUndo,
    canRedo,
    resetDocument,
  } = useCanvasState()

  const { save, loadSession, clearSession } = useSessionPersistence()
  const { saveToHistory, loadHistory, loadDocument } = useDocumentHistory()

  // ── Restore session on mount ───────────────────────────────────────────────
  // Runs exactly once. Silently restores the last saved canvas state if one
  // exists. No prompt — just restore. loadSession() returns null on miss,
  // corrupt data, or private browsing.
  useEffect(() => {
    const session = loadSession()
    if (!session) return
    replaceNodes(session.nodes)
    setCanvasSize(session.canvasSize)
    setCanvasBackground(session.canvasBackground)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps -- intentionally runs once on mount

  // ── Load document history on mount ────────────────────────────────────────
  useEffect(() => {
    loadHistory().then(setHistoryEntries)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps -- intentionally runs once on mount

  // ── Persist sidebar open/close preference ─────────────────────────────────
  useEffect(() => {
    try { localStorage.setItem('cropt_sidebar', sidebarOpen ? 'true' : 'false') } catch { /* ignore */ }
  }, [sidebarOpen])

  // ── Auto-save on every meaningful change ──────────────────────────────────
  // Debounced inside the hook (1500 ms). Skip while in resize mode because
  // canvasSize is partially-dragged and not a valid committed value.
  useEffect(() => {
    if (canvasResizeMode) return
    save({ nodes, canvasSize, canvasBackground })
  }, [nodes, canvasSize, canvasBackground, canvasResizeMode, save])

  // Wrap addNode so every import pushes a history snapshot first.
  const addNodeWithHistory = useCallback((node) => {
    pushHistory()
    addNode(node)
  }, [pushHistory, addNode])

  const { inputRef, openPicker, handleFileChange, handlePaste } = useImageImport({ canvasSize, setCanvasSize, addNode: addNodeWithHistory, selectNode })

  // Wrap updateNode for canvas interactions (drag end, transform end).
  // Opacity is handled separately via onOpacityStart.
  const updateNodeWithHistory = useCallback((id, updates) => {
    pushHistory()
    updateNode(id, updates)
  }, [pushHistory, updateNode])
  const [pixelRatio, setPixelRatio] = useState(1)
  const { exportCanvas, copyCanvas, captureBlob } = useExport({ stageRef, canvasBackground, canvasSize, pixelRatio })
  const { status: uploadStatus, shareUrl, error: uploadError, upload, reset: resetUpload } = useUpload({ captureBlob })

  // Generate a small thumbnail data URL from the current canvas state.
  const generateThumbnail = useCallback(async () => {
    try {
      const blob = await captureBlob(1)
      if (!blob) return null
      return new Promise((resolve) => {
        const img = new Image()
        img.onload = () => {
          const maxSize = 96
          const scale = Math.min(maxSize / img.width, maxSize / img.height, 1)
          const canvas = document.createElement('canvas')
          canvas.width  = Math.round(img.width  * scale)
          canvas.height = Math.round(img.height * scale)
          canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
          resolve(canvas.toDataURL('image/jpeg', 0.7))
          URL.revokeObjectURL(img.src)
        }
        img.onerror = () => resolve(null)
        img.src = URL.createObjectURL(blob)
      })
    } catch {
      return null
    }
  }, [captureBlob])
  const { canInstall, promptInstall } = useInstallPrompt()

  // ── Back-button guard (Android PWA + browsers) ────────────────────────────
  // Pushes a history guard state so the back button shows our custom dialog
  // instead of immediately leaving. iOS PWA swipe-close cannot be intercepted
  // (OS limitation) — this guard only helps on Android PWA and desktop/mobile
  // browsers where history.popstate is fired before the page unloads.
  const [showLeaveWarning, setShowLeaveWarning] = useState(false)
  const onLeaveRequested = useCallback(() => setShowLeaveWarning(true), [])
  const { confirmLeave } = useBackGuard({
    hasContent: nodes.length > 0,
    onLeaveRequested,
    suppressBeforeUnloadRef,
  })

  // Committed size: updates on handle release (via onResizeCommit) while in
  // resize mode, and tracks canvasSize automatically when outside resize mode
  // (e.g. image-import auto-expand).
  const [committedCanvasSize, setCommittedCanvasSize] = useState(canvasSize)
  useEffect(() => {
    if (!canvasResizeMode) setCommittedCanvasSize(canvasSize) // eslint-disable-line react-hooks/set-state-in-effect
  }, [canvasSize, canvasResizeMode])

  const selectedNode = nodes.find((n) => n.id === selectedNodeId) ?? null

  // ── Crop mode ──────────────────────────────────────────────────────────────
  const [cropMode, setCropMode] = useState(false)
  const [cropRect, setCropRect] = useState(null) // { x, y, width, height } canvas coords

  // ── Draw mode ──────────────────────────────────────────────────────────────
  const [drawMode, setDrawMode] = useState(false)
  const [drawTool, setDrawTool] = useState('brush')   // 'brush' | 'eraser'
  const [brushColor, setBrushColor] = useState('#000000')
  const [brushSize, setBrushSize] = useState(20)

  // ── Text mode ──────────────────────────────────────────────────────────────
  const [textPlaceMode, setTextPlaceMode] = useState(false)
  const [editingNodeId, setEditingNodeId] = useState(null)
  // Snapshot of state (nodes, canvasSize, canvasBackground) taken before editing
  // started — used to push history on confirm, or restore on cancel.
  const [editingOrigState, setEditingOrigState] = useState(null)

  // ── New document ───────────────────────────────────────────────────────────
  const [confirmingNew, setConfirmingNew] = useState(false)

  const executeNewDocument = useCallback(async () => {
    try {
      // Save current document to history before clearing (only if there's content)
      if (nodes.length > 0) {
        const thumbnail = await generateThumbnail()
        await saveToHistory({ nodes, canvasSize, canvasBackground }, thumbnail)
        setHistoryEntries(await loadHistory())
      }
      // Exit any active sub-mode before wiping state
      setCropMode(false)
      setCropRect(null)
      setTextPlaceMode(false)
      setEditingNodeId(null)
      setEditingOrigState(null)
      setDrawMode(false)
      setShowLayerPanel(false)
      setShowMobileHistory(false)
      // Reset all canvas state and history
      resetDocument()
      // Wipe the saved session — fast "New → confirm" can't re-save old state
      // because clearSession() also cancels the pending debounce timer.
      clearSession()
      // Reset viewport to default position
      setStageViewport({ x: 0, y: 0, scale: 1 })
    } finally {
      setConfirmingNew(false)
    }
  }, [nodes, canvasSize, canvasBackground, generateThumbnail, saveToHistory, loadHistory, resetDocument, clearSession, setStageViewport])

  const handleNewDocument = useCallback(() => {
    if (nodes.length > 0) {
      setConfirmingNew(true)
    } else {
      executeNewDocument()
    }
  }, [nodes.length, executeNewDocument])

  const handleRestoreDocument = useCallback(async (id) => {
    const doc = await loadDocument(id)
    if (!doc) return
    // Save current state to history first
    if (nodes.length > 0) {
      const thumbnail = await generateThumbnail()
      await saveToHistory({ nodes, canvasSize, canvasBackground }, thumbnail)
    }
    // Restore the selected document
    replaceNodes(doc.nodes)
    setCanvasSize(doc.canvasSize)
    setCanvasBackground(doc.canvasBackground)
    setStageViewport({ x: 0, y: 0, scale: 1 })
    setShowMobileHistory(false)
    setHistoryEntries(await loadHistory())
  }, [loadDocument, loadHistory, saveToHistory, generateThumbnail, nodes, canvasSize, canvasBackground, replaceNodes, setCanvasSize, setCanvasBackground, setStageViewport])

  // ── Raster layer creation ──────────────────────────────────────────────────
  const handleNewRasterLayer = useCallback(() => {
    const count = nodes.filter((n) => n.type === 'raster').length + 1
    pushHistory()
    addNode({
      id: uuidv4(),
      type: 'raster',
      name: `Layer ${count}`,
      x: 0,
      y: 0,
      width: canvasSize.width,
      height: canvasSize.height,
      dataUrl: null,
      opacity: 1,
      visible: true,
      scaleX: 1,
      scaleY: 1,
      rotation: 0,
    })
  }, [pushHistory, addNode, nodes, canvasSize])

  // ── Keyboard shortcuts ─────────────────────────────────────────────────────
  // Placed after cropMode/textMode declarations to avoid temporal dead zone.
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape' && drawMode) { setDrawMode(false); return }
      if (canvasResizeMode || cropMode || editingNodeId || drawMode) return
      if (!(e.metaKey || e.ctrlKey)) return
      if (e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo() }
      if (e.key === 'z' &&  e.shiftKey) { e.preventDefault(); redo() }
      if (e.key === 'y')                { e.preventDefault(); redo() }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [undo, redo, canvasResizeMode, cropMode, editingNodeId, drawMode])

  // ── Paste image from clipboard (Ctrl+V / Cmd+V) ─────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if (editingNodeId) return   // don't intercept paste while editing text
      if (e.clipboardData) handlePaste(e.clipboardData)
    }
    window.addEventListener('paste', handler)
    return () => window.removeEventListener('paste', handler)
  }, [editingNodeId, handlePaste])

  // ── Crop handlers ──────────────────────────────────────────────────────────

  const handleEnterCrop = () => {
    if (!selectedNode || selectedNode.type !== 'image') return
    const absScaleX = Math.abs(selectedNode.scaleX)
    const absScaleY = Math.abs(selectedNode.scaleY)
    setCropRect({
      x: selectedNode.x,
      y: selectedNode.y,
      width:  selectedNode.width  * absScaleX,
      height: selectedNode.height * absScaleY,
    })
    setCropMode(true)
    setShowLayerPanel(false)
  }

  const handleConfirmCrop = async () => {
    if (!selectedNode || !cropRect) return
    pushHistory()
    const updates = await cropImageToRect(selectedNode, cropRect)
    updateNode(selectedNode.id, updates)
    setCropMode(false)
    setCropRect(null)
  }

  const handleCancelCrop = () => {
    setCropMode(false)
    setCropRect(null)
  }

  // ── Resize mode ────────────────────────────────────────────────────────────
  // Save canvas size on entry so cancel can restore it.
  const preResizeCanvasSize = useRef(null)

  const handleEnterResize = () => {
    preResizeCanvasSize.current = canvasSize
    toggleResizeMode()
    setShowLayerPanel(false)
  }

  // Confirm: destructively crop all image nodes to the new canvas bounds.
  const handleConfirmResize = async () => {
    // Snapshot the state BEFORE the resize using the original canvas size,
    // because canvasSize has already changed via live handle dragging.
    pushSnapshot({ nodes, canvasSize: preResizeCanvasSize.current, canvasBackground })
    const results = await Promise.all(
      nodes.map((node) => cropNodeToCanvas(node, canvasSize.width, canvasSize.height))
    )
    const validNodes = results.filter(Boolean)
    replaceNodes(validNodes)
    if (selectedNodeId && !validNodes.find((n) => n.id === selectedNodeId)) {
      selectNode(null)
    }
    toggleResizeMode()
  }

  // Cancel: restore original canvas size and exit without committing.
  const handleCancelResize = () => {
    if (preResizeCanvasSize.current) setCanvasSize(preResizeCanvasSize.current)
    toggleResizeMode()
  }

  // ── Text placement handlers ────────────────────────────────────────────────

  const handleEnterTextPlaceMode = () => {
    setTextPlaceMode(true)
    setShowLayerPanel(false)
    selectNode(null)
  }

  const handleCancelTextPlace = () => {
    setTextPlaceMode(false)
  }

  // Called by CanvasStage when the user clicks in text placement mode.
  const handlePlaceText = (canvasX, canvasY) => {
    const id = uuidv4()
    const textNode = {
      id,
      type: 'text',
      name: 'Text',
      text: '',
      x: canvasX,
      y: canvasY,
      width: 0,        // 0 = auto-width (single-line, expands with content)
      fontSize: 60,
      fontFamily: 'Anton',
      fontStyle: 'normal',
      fill: '#ffffff',
      stroke: '#000000',
      strokeWidth: 2,
      align: 'left',
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      opacity: 1,
      visible: true,
    }
    // Save current state (without the text node) so we can push it to history
    // when the user confirms — enabling Ctrl+Z to undo the text addition.
    setEditingOrigState({ nodes, canvasSize, canvasBackground })
    addNode(textNode)
    selectNode(id)
    setTextPlaceMode(false)
    setEditingNodeId(id)
  }

  // ── Text edit handlers ─────────────────────────────────────────────────────

  // Enter inline edit mode for an existing confirmed text node.
  const handleStartEditText = (id) => {
    const node = nodes.find((n) => n.id === id)
    if (!node) return
    // Save current state so we can push it to history on confirm (undo = original text),
    // or restore it on cancel.
    setEditingOrigState({ nodes, canvasSize, canvasBackground })
    setEditingNodeId(id)
  }

  const handleConfirmTextEdit = () => {
    const node = nodes.find((n) => n.id === editingNodeId)
    if (!node) {
      setEditingNodeId(null)
      setEditingOrigState(null)
      return
    }
    if (!node.text.trim()) {
      // Empty text — remove the node without pushing to history
      removeNode(editingNodeId)
    } else if (editingOrigState) {
      // Push the pre-edit snapshot so Ctrl+Z can undo this text change/addition
      pushSnapshot(editingOrigState)
    }
    setEditingNodeId(null)
    setEditingOrigState(null)
  }

  const handleCancelTextEdit = () => {
    if (editingOrigState) {
      const wasNew = !editingOrigState.nodes.find((n) => n.id === editingNodeId)
      if (wasNew) {
        // Node was just placed — remove it (no history change needed)
        removeNode(editingNodeId)
      } else {
        // Existing node — restore its original text
        const origNode = editingOrigState.nodes.find((n) => n.id === editingNodeId)
        if (origNode) updateNode(editingNodeId, { text: origNode.text })
      }
    }
    setEditingNodeId(null)
    setEditingOrigState(null)
  }

  return (
    <div className="flex flex-col w-full h-full overflow-hidden bg-[#24272f]">
      <TopBar
        canvasResizeMode={canvasResizeMode}
        canvasSize={committedCanvasSize}
        onNew={handleNewDocument}
        onExport={exportCanvas}
        onCopy={copyCanvas}
        onPaste={() => handlePaste()}
        onUndo={undo}
        onRedo={redo}
        canUndo={canUndo}
        canRedo={canRedo}
        pixelRatio={pixelRatio}
        onTogglePixelRatio={() => setPixelRatio((r) => (r === 1 ? 2 : 1))}
        canInstall={canInstall}
        onInstall={promptInstall}
        version={version}
        onShare={upload}
        uploadStatus={uploadStatus}
        sidebarOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen((o) => !o)}
        onOpenHistory={() => setShowMobileHistory(true)}
      />

      {/* Canvas area + desktop sidebar */}
      <div className="flex-1 overflow-hidden flex">

        {/* Canvas + mobile overlays */}
        <div className="flex-1 overflow-hidden relative">
          <CanvasStage
            stageRef={stageRef}
            canvasSize={canvasSize}
            canvasBackground={canvasBackground}
            canvasResizeMode={canvasResizeMode}
            nodes={nodes}
            selectedNodeId={selectedNodeId}
            stageViewport={stageViewport}
            setStageViewport={setStageViewport}
            selectNode={selectNode}
            updateNode={updateNodeWithHistory}
            setCanvasSize={setCanvasSize}
            replaceNodes={replaceNodes}
            onResizeCommit={setCommittedCanvasSize}
            cropMode={cropMode}
            cropRect={cropRect}
            setCropRect={setCropRect}
            textPlaceMode={textPlaceMode}
            onPlaceText={handlePlaceText}
            editingNodeId={editingNodeId}
            onStartEditText={handleStartEditText}
            onTextChange={(text) => editingNodeId && updateNode(editingNodeId, { text })}
            onConfirmTextEdit={handleConfirmTextEdit}
            onCancelTextEdit={handleCancelTextEdit}
            drawMode={drawMode}
            drawNodeId={drawMode ? selectedNodeId : null}
            drawTool={drawTool}
            brushColor={brushColor}
            brushSize={brushSize}
            onDrawStart={pushHistory}
            onDrawEnd={(id, dataUrl) => updateNode(id, { dataUrl })}
          />

          {/* Mobile layer panel overlay (desktop uses sidebar) */}
          {showLayerPanel && (
            <div className="sm:hidden">
              <LayerPanel
                nodes={nodes}
                selectedNodeId={selectedNodeId}
                onSelectNode={selectNode}
                onToggleVisible={(id) => {
                  const node = nodes.find((n) => n.id === id)
                  if (node) { pushHistory(); updateNode(id, { visible: !node.visible }) }
                }}
                onReorder={(newNodes) => { pushHistory(); reorderNodes(newNodes) }}
                onNewLayer={handleNewRasterLayer}
                onClose={() => setShowLayerPanel(false)}
              />
            </div>
          )}

          {/* Mobile history overlay */}
          {showMobileHistory && (
            <div className="sm:hidden absolute bottom-0 left-0 right-0 flex flex-col bg-[#24272f] border-t border-white/10 rounded-t-xl shadow-2xl" style={{ maxHeight: '50%' }}>
              <div className="flex items-center justify-between px-4 py-2 border-b border-white/10 shrink-0">
                <span className="text-sm font-semibold text-white flex items-center gap-2">
                  <Clock size={13} className="text-white/40" /> History
                </span>
                <button
                  onClick={() => setShowMobileHistory(false)}
                  className="text-white/40 hover:text-white p-1 rounded transition-colors"
                >
                  <X size={16} strokeWidth={2.5} />
                </button>
              </div>
              <HistoryPanel
                entries={historyEntries}
                onRestore={handleRestoreDocument}
              />
            </div>
          )}
        </div>

        {/* Desktop sidebar */}
        {sidebarOpen && (
          <DesktopSidebar
            nodes={nodes}
            selectedNodeId={selectedNodeId}
            onSelectNode={selectNode}
            onToggleVisible={(id) => {
              const node = nodes.find((n) => n.id === id)
              if (node) { pushHistory(); updateNode(id, { visible: !node.visible }) }
            }}
            onReorder={(newNodes) => { pushHistory(); reorderNodes(newNodes) }}
            onNewLayer={handleNewRasterLayer}
            historyEntries={historyEntries}
            onRestoreDocument={handleRestoreDocument}
          />
        )}
      </div>

      <BottomToolbar
        canvasResizeMode={canvasResizeMode}
        cropMode={cropMode}
        textPlaceMode={textPlaceMode}
        isTextEditing={editingNodeId !== null}
        selectedNode={selectedNode}
        canvasSize={canvasSize}
        canvasBackground={canvasBackground}
        showLayerPanel={showLayerPanel}
        onAddImage={openPicker}
        onFlip={() => { if (selectedNode) { pushHistory(); updateNode(selectedNode.id, { flipX: !selectedNode.flipX }) } }}
        onDelete={() => { if (selectedNode) { pushHistory(); removeNode(selectedNode.id) } }}
        onOpacityStart={() => pushHistory()}
        onOpacityChange={(v) => selectedNode && updateNode(selectedNode.id, { opacity: v })}
        onSetBackground={(bg) => { pushHistory(); setCanvasBackground(bg) }}
        onToggleLayerPanel={() => setShowLayerPanel((p) => !p)}
        onEnterResize={handleEnterResize}
        onConfirmResize={handleConfirmResize}
        onCancelResize={handleCancelResize}
        onEnterCrop={handleEnterCrop}
        onConfirmCrop={handleConfirmCrop}
        onCancelCrop={handleCancelCrop}
        onEnterTextPlaceMode={handleEnterTextPlaceMode}
        onCancelTextPlace={handleCancelTextPlace}
        onEnterTextEdit={() => selectedNode?.type === 'text' && handleStartEditText(selectedNode.id)}
        onConfirmTextEdit={handleConfirmTextEdit}
        onCancelTextEdit={handleCancelTextEdit}
        onTextStyleStart={() => pushHistory()}
        onTextStyleChange={(updates) => selectedNode && updateNode(selectedNode.id, updates)}
        editingNode={nodes.find((n) => n.id === editingNodeId) ?? null}
        onFontChange={(fontFamily) => editingNodeId && updateNode(editingNodeId, { fontFamily })}
        drawMode={drawMode}
        drawTool={drawTool}
        brushColor={brushColor}
        brushSize={brushSize}
        onEnterDraw={() => setDrawMode(true)}
        onExitDraw={() => setDrawMode(false)}
        onDrawToolChange={setDrawTool}
        onBrushColorChange={setBrushColor}
        onBrushSizeChange={setBrushSize}
      />

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Leave warning dialog — shown when back button is pressed with content */}
      {showLeaveWarning && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
          onClick={() => setShowLeaveWarning(false)}
        >
          <div
            className="bg-[#2d3139] rounded-xl p-6 max-w-sm w-full mx-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-white font-semibold text-base mb-2">Leave Cropt?</h2>
            <p className="text-white/40 text-sm mb-6">Your canvas hasn&apos;t been exported yet. Unsaved changes may be lost.</p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowLeaveWarning(false)}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-[#363b44] text-white hover:bg-[#424850] transition-colors"
              >
                Stay
              </button>
              <button
                onClick={confirmLeave}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-red-600 text-white hover:bg-red-500 transition-colors"
              >
                Leave Anyway
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Share result dialog */}
      {(uploadStatus === 'success' || uploadStatus === 'error') && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
          onClick={resetUpload}
        >
          <div
            className="bg-[#2d3139] rounded-xl p-6 max-w-sm w-full mx-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {uploadStatus === 'success' ? (
              <>
                <h2 className="text-white font-semibold text-base mb-1">Meme uploaded!</h2>
                <p className="text-white/40 text-sm mb-4">Share this link with anyone.</p>
                <div className="flex gap-2 mb-4">
                  <input
                    readOnly
                    value={shareUrl}
                    className="flex-1 bg-[#363b44] text-white/80 text-xs px-3 py-2 rounded-lg outline-none select-all"
                    onFocus={(e) => e.target.select()}
                  />
                  <button
                    onClick={() => navigator.clipboard?.writeText(shareUrl)}
                    className="px-3 py-2 rounded-lg text-xs font-medium bg-[#5865f2] text-white hover:bg-[#4752c4] transition-colors"
                  >
                    Copy
                  </button>
                </div>
                <div className="flex gap-3 justify-end">
                  <button
                    onClick={resetUpload}
                    className="px-4 py-2 rounded-lg text-sm font-medium bg-[#363b44] text-white hover:bg-[#424850] transition-colors"
                  >
                    Close
                  </button>
                  <a
                    href={shareUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 rounded-lg text-sm font-medium bg-[#0fff95] text-[#24272f] hover:bg-[#0de882] transition-colors"
                  >
                    View page →
                  </a>
                </div>
              </>
            ) : (
              <>
                <h2 className="text-white font-semibold text-base mb-2">Upload failed</h2>
                <p className="text-white/40 text-sm mb-6">{uploadError}</p>
                <div className="flex gap-3 justify-end">
                  <button
                    onClick={resetUpload}
                    className="px-4 py-2 rounded-lg text-sm font-medium bg-[#363b44] text-white hover:bg-[#424850] transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={upload}
                    className="px-4 py-2 rounded-lg text-sm font-medium bg-[#5865f2] text-white hover:bg-[#4752c4] transition-colors"
                  >
                    Retry
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* New Document confirmation dialog */}
      {confirmingNew && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
          onClick={() => setConfirmingNew(false)}
        >
          <div
            className="bg-[#2d3139] rounded-xl p-6 max-w-sm w-full mx-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-white font-semibold text-base mb-2">Start a new document?</h2>
            <p className="text-white/40 text-sm mb-6">Your current document will be saved to History.</p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setConfirmingNew(false)}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-[#363b44] text-white hover:bg-[#424850] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={executeNewDocument}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-red-600 text-white hover:bg-red-500 transition-colors"
              >
                New Document
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
