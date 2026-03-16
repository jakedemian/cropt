import { useRef, useState, useEffect, useCallback } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { X, Clock, Check, Undo2, Redo2 } from 'lucide-react'
import { version } from '../../../package.json'
import { useCanvasState } from './hooks/useCanvasState'
import { useImageImport } from './hooks/useImageImport'
import { useExport } from './hooks/useExport'
import { useUpload } from './hooks/useUpload'
import { useInstallPrompt } from './hooks/useInstallPrompt'
import { useSessionPersistence } from './hooks/useSessionPersistence'
import { useBackGuard } from './hooks/useBackGuard'
import { useDocumentHistory } from './hooks/useDocumentHistory'
import { cropNodeToCanvas, cropRasterToCanvas, cropImageToRect } from './utils/canvasUtils'
import CanvasStage from './Canvas/CanvasStage'
import TopBar from './Toolbar/TopBar'
import BottomToolbar from './Toolbar/BottomToolbar'
import LayerPanel from './LayerPanel/LayerPanel'
import DesktopSidebar from './Sidebar/DesktopSidebar'
import HistoryPanel from './Sidebar/HistoryPanel'

export default function App() {
  const stageRef = useRef(null)
  const [showLayerPanel, setShowLayerPanel] = useState(() => window.innerWidth < 640)
  const [showMobileHistory, setShowMobileHistory] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    try { return localStorage.getItem('cropt_sidebar') !== 'false' } catch { return true }
  })
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    try { return parseInt(localStorage.getItem('cropt_sidebar_width')) || 336 } catch { return 336 }
  })
  const [historyEntries, setHistoryEntries] = useState([])

  // ── Sidebar drag-to-resize ─────────────────────────────────────────────────
  const sidebarDragActive  = useRef(false)
  const sidebarDragStartX  = useRef(0)
  const sidebarDragStartW  = useRef(0)
  const sidebarCurrentW    = useRef(sidebarWidth)

  const handleSidebarDragStart = useCallback((e) => {
    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId)
    sidebarDragActive.current = true
    sidebarDragStartX.current = e.clientX
    sidebarDragStartW.current = sidebarCurrentW.current
  }, [])

  const handleSidebarDragMove = useCallback((e) => {
    if (!sidebarDragActive.current) return
    const delta    = sidebarDragStartX.current - e.clientX  // left = wider
    const newWidth = Math.max(150, Math.min(480, sidebarDragStartW.current + delta))
    sidebarCurrentW.current = newWidth
    setSidebarWidth(newWidth)
    if (!sidebarOpen && newWidth > 150) setSidebarOpen(true)
  }, [sidebarOpen])

  const handleSidebarDragEnd = useCallback(() => {
    if (!sidebarDragActive.current) return
    sidebarDragActive.current = false
    const w = sidebarCurrentW.current
    if (w < 150) {
      setSidebarOpen(false)
      // Reset to default so next open starts at a sensible width
      setSidebarWidth(336)
      sidebarCurrentW.current = 336
    }
    try { localStorage.setItem('cropt_sidebar_width', String(sidebarCurrentW.current)) } catch { /* ignore */ }
  }, [])
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
  const { saveToHistory, loadHistory, loadDocument, touchEntry } = useDocumentHistory()

  // Tracks which history entry the current document came from (null = fresh doc).
  // When saving back to history, we update this entry in place rather than
  // creating a new one, so repeatedly opening and switching documents doesn't
  // flood the history list.
  const currentHistoryIdRef = useRef(null)

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
  useEffect(() => { sidebarCurrentW.current = sidebarWidth }, [sidebarWidth])

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
  const updateNodeWithHistory = useCallback((id, updates) => {
    pushHistory()
    updateNode(id, updates)
  }, [pushHistory, updateNode])
  const [pixelRatio, setPixelRatio] = useState(1)
  const { exportCanvas, copyCanvas, captureBlob } = useExport({ stageRef, canvasBackground, canvasSize, pixelRatio })
  const { status: uploadStatus, shareUrl, error: uploadError, upload, reset: resetUpload } = useUpload({ captureBlob })
  const [linkCopied, setLinkCopied] = useState(false)
  const linkCopyTimer = useRef(null)
  useEffect(() => { if (uploadStatus !== 'success') setLinkCopied(false) }, [uploadStatus])

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
    if (!canvasResizeMode) setCommittedCanvasSize(canvasSize)
  }, [canvasSize, canvasResizeMode])

  const selectedNode = nodes.find((n) => n.id === selectedNodeId) ?? null

  // ── Crop mode ──────────────────────────────────────────────────────────────
  const [cropMode, setCropMode] = useState(false)
  const [cropRect, setCropRect] = useState(null) // { x, y, width, height } canvas coords

  // ── Unified tool state ─────────────────────────────────────────────────────
  const [activeTool, setActiveTool] = useState('select') // 'select' | 'brush' | 'eraser' | 'text'
  const [brushColor, setBrushColor] = useState('#000000')
  const [brushSize, setBrushSize] = useState(20)

  // Derived — passed to CanvasStage (no changes needed there)
  const drawMode = activeTool === 'brush' || activeTool === 'eraser'
  const drawTool = activeTool === 'eraser' ? 'eraser' : 'brush'
  const textPlaceMode = activeTool === 'text'

  // ── Transform activation ────────────────────────────────────────────────────
  // Clicking a layer in the panel just "targets" it for pixel ops.
  // The transformer only appears when the user explicitly activates it via
  // the Move button in the layer panel or by clicking a node on the canvas.
  const [transformEnabled, setTransformEnabled] = useState(false)

  // Deactivate transformer when switching tools
  useEffect(() => {
    setTransformEnabled(false)
  }, [activeTool])

  // Called by canvas node clicks and the layer-panel Move button.
  // When id is null (e.g. stage background click) only deactivate the
  // transformer — keep the current selected layer so there is always a
  // targeted layer while nodes exist.
  const handleActivateTransform = useCallback((id) => {
    if (id !== null) selectNode(id)
    setTransformEnabled(id !== null)
    if (id !== null) setActiveTool('select')
  }, [selectNode])

  // Invariant: if nodes exist, one must always be selected.
  // This acts as a safety net after deletes, session restores, canvas crops, etc.
  // Text placement mode is exempt — it intentionally has no targeted layer while
  // the user is choosing where to place a new text node.
  useEffect(() => {
    if (activeTool === 'text') return
    if (nodes.length === 0) return
    if (nodes.find((n) => n.id === selectedNodeId)) return
    selectNode(nodes[nodes.length - 1].id)
  }, [nodes, selectedNodeId, activeTool, selectNode])

  // ── Text mode ──────────────────────────────────────────────────────────────
  const [editingNodeId, setEditingNodeId] = useState(null)
  // Snapshot of state (nodes, canvasSize, canvasBackground) taken before editing
  // started — used to push history on confirm, or restore on cancel.
  const [editingOrigState, setEditingOrigState] = useState(null)

  // ── Marquee selection (canvas-level crop target) ───────────────────────────
  const [marqueeSelection, setMarqueeSelection] = useState(null) // { x, y, width, height } | null
  const [marqueeDeleteTrigger, setMarqueeDeleteTrigger] = useState(0)

  // Clear when switching away from the marquee tool.
  // Keep the selection when switching to Move (select) tool so marching ants
  // remain visible and the user can still move / delete the selected area.
  useEffect(() => {
    if (activeTool !== 'marquee' && activeTool !== 'select') setMarqueeSelection(null)
  }, [activeTool])

  // ── Canvas crop mode ────────────────────────────────────────────────────────
  const [canvasCropMode, setCanvasCropMode] = useState(false)
  const [canvasCropRect, setCanvasCropRect] = useState(null)   // { x, y, width, height } canvas coords
  const [canvasCropBounds, setCanvasCropBounds] = useState(null) // max allowed area (initial selection)

  const handleEnterCanvasCrop = useCallback(() => {
    let bounds
    if (marqueeSelection) {
      const mx = Math.max(0, marqueeSelection.x)
      const my = Math.max(0, marqueeSelection.y)
      const mr = Math.min(canvasSize.width,  marqueeSelection.x + marqueeSelection.width)
      const mb = Math.min(canvasSize.height, marqueeSelection.y + marqueeSelection.height)
      if (mr <= mx || mb <= my) return
      bounds = { x: Math.round(mx), y: Math.round(my), width: Math.round(mr - mx), height: Math.round(mb - my) }
    } else if (selectedNode) {
      const absScaleX = Math.abs(selectedNode.scaleX ?? 1)
      const absScaleY = Math.abs(selectedNode.scaleY ?? 1)
      const nw = selectedNode.width  * absScaleX
      const nh = selectedNode.height * absScaleY
      const nx = Math.max(0, selectedNode.x)
      const ny = Math.max(0, selectedNode.y)
      const nr = Math.min(canvasSize.width,  selectedNode.x + nw)
      const nb = Math.min(canvasSize.height, selectedNode.y + nh)
      if (nr <= nx || nb <= ny) {
        bounds = { x: 0, y: 0, width: canvasSize.width, height: canvasSize.height }
      } else {
        bounds = { x: Math.round(nx), y: Math.round(ny), width: Math.round(nr - nx), height: Math.round(nb - ny) }
      }
    } else {
      return
    }
    if (bounds.width < 1 || bounds.height < 1) return
    setCanvasCropBounds(bounds)
    setCanvasCropRect({ ...bounds })
    setCanvasCropMode(true)
    setShowLayerPanel(false)
  }, [marqueeSelection, selectedNode, canvasSize])

  const handleConfirmCanvasCrop = useCallback(async () => {
    if (!canvasCropRect) return
    const { x: sx, y: sy, width: sw, height: sh } = canvasCropRect
    const newW = Math.round(sw)
    const newH = Math.round(sh)
    if (newW < 1 || newH < 1) return

    pushSnapshot({ nodes, canvasSize, canvasBackground })

    const shifted = nodes.map((n) => ({ ...n, x: n.x - sx, y: n.y - sy }))
    const results = await Promise.all(
      shifted.map((n) => {
        if (n.type === 'image')  return cropNodeToCanvas(n, newW, newH)
        if (n.type === 'raster') return cropRasterToCanvas(n, newW, newH)
        return n
      })
    )
    const valid = results.filter(Boolean)
    setCanvasSize({ width: newW, height: newH })
    replaceNodes(valid)
    if (selectedNodeId && !valid.find((n) => n.id === selectedNodeId)) selectNode(null)
    setCanvasCropMode(false)
    setCanvasCropRect(null)
    setCanvasCropBounds(null)
    setMarqueeSelection(null)
    setActiveTool('select')
  }, [canvasCropRect, nodes, canvasSize, canvasBackground, pushSnapshot, setCanvasSize, replaceNodes, selectedNodeId, selectNode])

  const handleCancelCanvasCrop = useCallback(() => {
    setCanvasCropMode(false)
    setCanvasCropRect(null)
    setCanvasCropBounds(null)
  }, [])

  // ── New document ───────────────────────────────────────────────────────────
  const [confirmingNew, setConfirmingNew] = useState(false)

  const executeNewDocument = useCallback(async () => {
    try {
      // Save current document to history before clearing (only if there's content).
      // Pass the existing history ID so we update in place rather than duplicate.
      if (nodes.length > 0) {
        const thumbnail = await generateThumbnail()
        await saveToHistory({ nodes, canvasSize, canvasBackground }, thumbnail, currentHistoryIdRef.current)
        currentHistoryIdRef.current = null  // fresh doc has no associated history entry
        setHistoryEntries(await loadHistory())
      }
      // Exit any active sub-mode before wiping state
      setCropMode(false)
      setCropRect(null)
      setCanvasCropMode(false)
      setCanvasCropRect(null)
      setCanvasCropBounds(null)
      setActiveTool('select')
      setEditingNodeId(null)
      setEditingOrigState(null)
      setShowLayerPanel(window.innerWidth < 640)
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
    // Save current state to history first, updating in place if it came from history
    if (nodes.length > 0) {
      const thumbnail = await generateThumbnail()
      await saveToHistory({ nodes, canvasSize, canvasBackground }, thumbnail, currentHistoryIdRef.current)
    }
    // Restore the selected document and track which entry it came from.
    // Touch it so its savedAt becomes the newest — it sorts to the top above
    // the entry we just saved for the document we were on.
    replaceNodes(doc.nodes)
    setCanvasSize(doc.canvasSize)
    setCanvasBackground(doc.canvasBackground)
    setStageViewport({ x: 0, y: 0, scale: 1 })
    setShowMobileHistory(false)
    currentHistoryIdRef.current = id
    await touchEntry(id)
    setHistoryEntries(await loadHistory())
  }, [loadDocument, loadHistory, saveToHistory, touchEntry, generateThumbnail, nodes, canvasSize, canvasBackground, replaceNodes, setCanvasSize, setCanvasBackground, setStageViewport])

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

  // ── Rasterize text node ────────────────────────────────────────────────────
  const handleRasterizeTextNode = useCallback((nodeId) => {
    if (editingNodeId === nodeId) return
    const node = nodes.find((n) => n.id === nodeId)
    if (!node || node.type !== 'text') return

    const stage = stageRef.current
    if (!stage) return
    const konvaText = stage.findOne('#' + nodeId)
    if (!konvaText) return

    // Get the axis-aligned bounding box in canvas coordinates (includes stroke extent).
    // getClientRect({ relativeTo: layer }) gives canvas-space coords regardless of stage viewport.
    const nodesLayer = konvaText.getLayer()
    const rawRect = konvaText.getClientRect({ relativeTo: nodesLayer })
    const rect = {
      x: Math.floor(rawRect.x),
      y: Math.floor(rawRect.y),
      width: Math.ceil(rawRect.width),
      height: Math.ceil(rawRect.height),
    }
    if (rect.width < 1 || rect.height < 1) return

    // Capture using the same pattern as useExport: reset stage transform so
    // canvas px === screen px, hide everything except the target node, render.
    const container = stage.container()
    container.style.visibility = 'hidden'

    const origX = stage.x(), origY = stage.y()
    const origScaleX = stage.scaleX(), origScaleY = stage.scaleY()
    stage.x(0); stage.y(0); stage.scaleX(1); stage.scaleY(1)

    // Hide all nodes in the nodes layer except the target
    const children = nodesLayer.getChildren()
    const visMap = {}
    children.forEach((child) => {
      visMap[child.id()] = child.visible()
      child.visible(child.id() === nodeId)
    })

    // Capture just the text's bounding box from the nodes layer (transparent background)
    const src = nodesLayer.toDataURL({
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
      pixelRatio: 1,
    })

    // Restore
    children.forEach((child) => child.visible(visMap[child.id()] ?? true))
    stage.x(origX); stage.y(origY); stage.scaleX(origScaleX); stage.scaleY(origScaleY)
    stage.batchDraw()
    container.style.visibility = ''

    pushHistory()

    const rasterNode = {
      id: node.id,
      type: 'raster',
      name: node.name || 'Text',
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
      dataUrl: src,
      scaleX: 1,
      scaleY: 1,
      rotation: 0,
      opacity: node.opacity ?? 1,
      visible: node.visible ?? true,
    }
    replaceNodes(nodes.map((n) => (n.id === nodeId ? rasterNode : n)))
  }, [editingNodeId, nodes, pushHistory, replaceNodes, stageRef])

  // ── Unified tool switching ─────────────────────────────────────────────────
  const handleSetActiveTool = useCallback((tool) => {
    if (tool === 'brush' || tool === 'eraser') {
      // Ensure a raster node is selected to draw on
      if (selectedNode?.type !== 'raster') {
        const existingRaster = nodes.findLast((n) => n.type === 'raster')
        if (existingRaster) {
          selectNode(existingRaster.id)
        } else {
          const id = uuidv4()
          const count = nodes.filter((n) => n.type === 'raster').length + 1
          pushHistory()
          addNode({
            id,
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
          selectNode(id)
        }
      }
      setActiveTool(tool)
    } else if (tool === 'marquee') {
      setActiveTool('marquee')
    } else if (tool === 'text') {
      setActiveTool('text')
      selectNode(null)
    } else {
      setActiveTool('select')
    }
  }, [selectedNode, nodes, canvasSize, pushHistory, addNode, selectNode])

  // Reset to select when a non-raster node is clicked during draw mode
  useEffect(() => {
    if ((activeTool === 'brush' || activeTool === 'eraser') && selectedNode?.type !== 'raster') {
      setActiveTool('select')
    }
  }, [selectedNodeId]) // eslint-disable-line react-hooks/exhaustive-deps -- intentional: only react to selection changes

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

  // ── Keyboard shortcuts ─────────────────────────────────────────────────────
  // Placed after resize/crop handler declarations to avoid temporal dead zone.
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape' && drawMode) { setActiveTool('select'); return }
      if (canvasResizeMode || cropMode || canvasCropMode || editingNodeId) return
      // Tool hotkeys — no modifier keys
      if (!e.metaKey && !e.ctrlKey && !e.altKey) {
        if (e.key === 'v') { handleSetActiveTool('select');  return }
        if (e.key === 'm') { handleSetActiveTool('marquee'); return }
        if (e.key === 'b') { handleSetActiveTool('brush');   return }
        if (e.key === 'e') { handleSetActiveTool('eraser');  return }
        if (e.key === 't') { handleSetActiveTool('text');    return }
        if (e.key === 'r') { handleEnterResize(); return }
        if (e.key === 'c' && ((selectedNode?.type !== 'text' && selectedNode) || marqueeSelection)) { handleEnterCanvasCrop(); return }
      }
      if (drawMode) return
      if (!(e.metaKey || e.ctrlKey)) return
      if (e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo() }
      if (e.key === 'z' &&  e.shiftKey) { e.preventDefault(); redo() }
      if (e.key === 'y')                { e.preventDefault(); redo() }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [undo, redo, canvasResizeMode, cropMode, canvasCropMode, editingNodeId, drawMode, handleSetActiveTool, handleEnterResize, handleEnterCanvasCrop, selectedNode, marqueeSelection])

  // ── Text placement handlers ────────────────────────────────────────────────

  // Called by CanvasStage when the user clicks or drags in text placement mode.
  // width is provided only when the user dragged to define a bounding box.
  const handlePlaceText = (canvasX, canvasY, width) => {
    const id = uuidv4()
    const textNode = {
      id,
      type: 'text',
      name: 'Text',
      text: '',
      x: canvasX,
      y: canvasY,
      width: width ?? 0,  // 0 = auto-width (single-line, expands with content)
      fontSize: 36,
      fontFamily: 'Anton',
      fontStyle: 'normal',
      fill: '#ffffff',
      stroke: '#000000',
      strokeWidth: 6,
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
    setActiveTool('select')
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
        cropMode={cropMode}
        canvasCropMode={canvasCropMode}
        canvasSize={committedCanvasSize}
        onAddImage={openPicker}
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

          {/* Mobile floating undo/redo */}
          <div className="sm:hidden absolute top-3 inset-x-0 flex justify-center z-20 pointer-events-none">
            <div className="flex items-center gap-2 pointer-events-auto">
              <button
                onClick={undo}
                disabled={!canUndo || canvasResizeMode}
                title="Undo (Cmd+Z)"
                className="w-11 h-11 flex items-center justify-center rounded-full bg-[#363b44]/90 backdrop-blur-sm text-white shadow-lg transition-colors hover:bg-[#424850]/90 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <Undo2 size={18} />
              </button>
              <button
                onClick={redo}
                disabled={!canRedo || canvasResizeMode}
                title="Redo (Cmd+Shift+Z)"
                className="w-11 h-11 flex items-center justify-center rounded-full bg-[#363b44]/90 backdrop-blur-sm text-white shadow-lg transition-colors hover:bg-[#424850]/90 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <Redo2 size={18} />
              </button>
            </div>
          </div>

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
            transformEnabled={transformEnabled}
            onActivateTransform={handleActivateTransform}
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
            marqueeMode={activeTool === 'marquee'}
            marqueeNodeId={activeTool === 'marquee' && (selectedNode?.type === 'raster' || selectedNode?.type === 'image') ? selectedNodeId : null}
            onConvertToRaster={(id) => {
              const node = nodes.find((n) => n.id === id)
              if (!node || node.type !== 'image') return
              // History was already pushed by onMarqueeStart — use raw updateNode
              updateNode(id, {
                type: 'raster',
                x: 0,
                y: 0,
                width: canvasSize.width,
                height: canvasSize.height,
                dataUrl: null,
                src: undefined,
                flipX: undefined,
              })
            }}
            isSelectToolActive={activeTool === 'select'}
            onMarqueeStart={pushHistory}
            onMarqueeEnd={(id, dataUrl) => updateNode(id, { dataUrl })}
            onMarqueeReady={setMarqueeSelection}
            marqueeDeleteTrigger={marqueeDeleteTrigger}
            canvasCropMode={canvasCropMode}
            canvasCropRect={canvasCropRect}
            canvasCropBounds={canvasCropBounds}
            onCanvasCropRectChange={setCanvasCropRect}
          />

          {/* Mobile layer panel overlay (desktop uses sidebar) */}
          {showLayerPanel && (
            <div className="sm:hidden">
              <LayerPanel
                nodes={nodes}
                selectedNodeId={selectedNodeId}
                transformEnabled={transformEnabled}
                onSelectNode={selectNode}
                onActivateTransform={handleActivateTransform}
                onToggleVisible={(id) => {
                  const node = nodes.find((n) => n.id === id)
                  if (node) { pushHistory(); updateNode(id, { visible: !node.visible }) }
                }}
                onReorder={(newNodes) => { pushHistory(); reorderNodes(newNodes) }}
                onNewLayer={handleNewRasterLayer}
                onClose={() => setShowLayerPanel(false)}
                onOpacityStart={() => pushHistory()}
                onOpacityChange={(id, v) => updateNode(id, { opacity: v })}
                onDelete={(id) => { pushHistory(); removeNode(id) }}
                onRasterizeText={handleRasterizeTextNode}
                editingNodeId={editingNodeId}
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

        {/* Sidebar drag strip — always visible on desktop */}
        <div
          className="hidden sm:block w-1 shrink-0 cursor-col-resize hover:bg-white/20 active:bg-white/30 transition-colors touch-none select-none"
          onPointerDown={handleSidebarDragStart}
          onPointerMove={handleSidebarDragMove}
          onPointerUp={handleSidebarDragEnd}
          onPointerCancel={handleSidebarDragEnd}
        />

        {/* Desktop sidebar */}
        {sidebarOpen && (
          <DesktopSidebar
            width={sidebarWidth}
            nodes={nodes}
            selectedNodeId={selectedNodeId}
            transformEnabled={transformEnabled}
            onSelectNode={selectNode}
            onActivateTransform={handleActivateTransform}
            onToggleVisible={(id) => {
              const node = nodes.find((n) => n.id === id)
              if (node) { pushHistory(); updateNode(id, { visible: !node.visible }) }
            }}
            onReorder={(newNodes) => { pushHistory(); reorderNodes(newNodes) }}
            onNewLayer={handleNewRasterLayer}
            onOpacityStart={() => pushHistory()}
            onOpacityChange={(id, v) => updateNode(id, { opacity: v })}
            onDelete={(id) => { pushHistory(); removeNode(id) }}
            onRasterizeText={handleRasterizeTextNode}
            editingNodeId={editingNodeId}
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
        onFlip={() => { if (selectedNode) { pushHistory(); updateNode(selectedNode.id, { flipX: !selectedNode.flipX }) } }}
        onSetBackground={(bg) => { pushHistory(); setCanvasBackground(bg) }}
        onToggleLayerPanel={() => setShowLayerPanel((p) => !p)}
        marqueeSelection={marqueeSelection}
        onDeleteMarqueeArea={() => setMarqueeDeleteTrigger((t) => t + 1)}
        canvasCropMode={canvasCropMode}
        onEnterCanvasCrop={handleEnterCanvasCrop}
        onConfirmCanvasCrop={handleConfirmCanvasCrop}
        onCancelCanvasCrop={handleCancelCanvasCrop}
        onEnterResize={handleEnterResize}
        onConfirmResize={handleConfirmResize}
        onCancelResize={handleCancelResize}
        onEnterCrop={handleEnterCrop}
        onConfirmCrop={handleConfirmCrop}
        onCancelCrop={handleCancelCrop}
        activeTool={activeTool}
        onSetActiveTool={handleSetActiveTool}
        onEnterTextEdit={() => selectedNode?.type === 'text' && handleStartEditText(selectedNode.id)}
        onConfirmTextEdit={handleConfirmTextEdit}
        onCancelTextEdit={handleCancelTextEdit}
        onTextStyleStart={() => pushHistory()}
        onTextStyleChange={(updates) => selectedNode && updateNode(selectedNode.id, updates)}
        editingNode={nodes.find((n) => n.id === editingNodeId) ?? null}
        onFontChange={(fontFamily) => editingNodeId && updateNode(editingNodeId, { fontFamily })}
        brushColor={brushColor}
        brushSize={brushSize}
        onBrushColorChange={setBrushColor}
        onBrushSizeChange={setBrushSize}
        stageScale={stageViewport.scale}
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
                className="px-4 py-2 rounded-lg text-sm font-medium bg-[#0fff95] text-[#24272f] hover:bg-[#0de882] transition-colors"
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
                    onClick={() => {
                      navigator.clipboard?.writeText(shareUrl)
                      setLinkCopied(true)
                      clearTimeout(linkCopyTimer.current)
                      linkCopyTimer.current = setTimeout(() => setLinkCopied(false), 2000)
                    }}
                    className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
                      linkCopied ? 'bg-[#0fff95] text-[#24272f]' : 'bg-[#5865f2] text-white hover:bg-[#4752c4]'
                    }`}
                  >
                    {linkCopied ? <><Check size={12} /> Copied!</> : 'Copy'}
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
                className="px-4 py-2 rounded-lg text-sm font-medium bg-[#0fff95] text-[#24272f] hover:bg-[#0de882] transition-colors"
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
