import { useState, useCallback, useRef } from 'react'

const DEFAULT_CANVAS_SIZE = { width: 1080, height: 1080 }

export function useCanvasState() {
  const [canvasSize, setCanvasSize] = useState(DEFAULT_CANVAS_SIZE)
  const [canvasBackground, setCanvasBackground] = useState('transparent')
  const [canvasResizeMode, setCanvasResizeMode] = useState(false)
  const [nodes, setNodes] = useState([])
  const [selectedNodeId, setSelectedNodeId] = useState(null)
  const [stageViewport, setStageViewport] = useState({ x: 0, y: 0, scale: 1 })

  // ── History ─────────────────────────────────────────────────────────────────
  // Stored in refs so pushes don't trigger re-renders; only canUndo/canRedo
  // are state so buttons react to changes.
  const historyRef = useRef([])  // past snapshots (oldest → newest)
  const futureRef  = useRef([])  // redo stack (next → furthest)
  const [canUndo, setCanUndo] = useState(false)
  const [canRedo, setCanRedo] = useState(false)

  // Capture current state before a mutation (call this BEFORE the change).
  const pushHistory = useCallback(() => {
    historyRef.current = [...historyRef.current.slice(-49), { nodes, canvasSize, canvasBackground }]
    futureRef.current = []
    setCanUndo(true)
    setCanRedo(false)
  }, [nodes, canvasSize, canvasBackground])

  // Like pushHistory but accepts an explicit snapshot — used when the caller
  // already knows the pre-mutation state (e.g. resize-confirm needs the
  // original canvas size, not the one that changed via drag handles).
  const pushSnapshot = useCallback((snapshot) => {
    historyRef.current = [...historyRef.current.slice(-49), snapshot]
    futureRef.current = []
    setCanUndo(true)
    setCanRedo(false)
  }, [])

  const undo = useCallback(() => {
    if (historyRef.current.length === 0) return
    const snapshot = historyRef.current[historyRef.current.length - 1]
    historyRef.current = historyRef.current.slice(0, -1)
    futureRef.current = [{ nodes, canvasSize, canvasBackground }, ...futureRef.current]
    setNodes(snapshot.nodes)
    setCanvasSize(snapshot.canvasSize)
    setCanvasBackground(snapshot.canvasBackground)
    setCanUndo(historyRef.current.length > 0)
    setCanRedo(true)
  }, [nodes, canvasSize, canvasBackground])

  const redo = useCallback(() => {
    if (futureRef.current.length === 0) return
    const snapshot = futureRef.current[0]
    futureRef.current = futureRef.current.slice(1)
    historyRef.current = [...historyRef.current, { nodes, canvasSize, canvasBackground }]
    setNodes(snapshot.nodes)
    setCanvasSize(snapshot.canvasSize)
    setCanvasBackground(snapshot.canvasBackground)
    setCanUndo(true)
    setCanRedo(futureRef.current.length > 0)
  }, [nodes, canvasSize, canvasBackground])

  const addNode = useCallback((node) => {
    setNodes((prev) => [...prev, node])
    setSelectedNodeId(node.id)
  }, [])

  const updateNode = useCallback((id, updates) => {
    setNodes((prev) => prev.map((n) => (n.id === id ? { ...n, ...updates } : n)))
  }, [])

  const removeNode = useCallback((id) => {
    setNodes((prev) => prev.filter((n) => n.id !== id))
    setSelectedNodeId((prev) => (prev === id ? null : prev))
  }, [])

  const reorderNodes = useCallback((newNodes) => {
    setNodes(newNodes)
  }, [])

  // Replace the entire node array atomically (used by canvas resize to shift all nodes)
  const replaceNodes = useCallback((newNodes) => {
    setNodes(newNodes)
  }, [])

  const selectNode = useCallback((id) => {
    setSelectedNodeId(id)
  }, [])

  const toggleResizeMode = useCallback(() => {
    setCanvasResizeMode((prev) => !prev)
    setSelectedNodeId(null)
  }, [])

  // Hard-reset the entire document to defaults and wipe undo/redo history.
  const resetDocument = useCallback(() => {
    setNodes([])
    setCanvasSize(DEFAULT_CANVAS_SIZE)
    setCanvasBackground('transparent')
    setSelectedNodeId(null)
    setCanvasResizeMode(false)
    historyRef.current = []
    futureRef.current  = []
    setCanUndo(false)
    setCanRedo(false)
  }, [])

  return {
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
    // history
    pushHistory,
    pushSnapshot,
    undo,
    redo,
    canUndo,
    canRedo,
    resetDocument,
  }
}
