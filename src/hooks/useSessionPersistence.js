import { useCallback, useRef } from 'react'

const STORAGE_KEY = 'memecanvas_session_v1'
const DEBOUNCE_MS = 1500

// ── Blob URL → data URL ───────────────────────────────────────────────────────
// blob: URLs are only valid within the session that created them — they become
// invalid on page unload. Convert to a self-contained data URL before storing.
// Uses JPEG 0.92 to match the downscale quality in useImageImport.js.
// Data URLs and any other non-blob src values pass through unchanged.
async function blobToDataUrl(src) {
  if (!src?.startsWith('blob:')) return src
  return new Promise((resolve, reject) => {
    const img = new window.Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width  = img.naturalWidth
      canvas.height = img.naturalHeight
      canvas.getContext('2d').drawImage(img, 0, 0)
      resolve(canvas.toDataURL('image/jpeg', 0.92))
    }
    img.onerror = reject
    img.src = src
  })
}

// Converts any blob: URLs in the nodes array to data: URLs.
// Text nodes are fully JSON-serialisable as-is and pass through unchanged.
async function serialiseNodes(nodes) {
  return Promise.all(
    nodes.map(async (node) => {
      if (node.type !== 'image') return node
      const src = await blobToDataUrl(node.src)
      return { ...node, src }
    })
  )
}

// ── Hook ─────────────────────────────────────────────────────────────────────
export function useSessionPersistence() {
  const debounceTimerRef = useRef(null)
  // Sentinel used to detect overlapping async saves. When a new save() call
  // fires while a prior serialisation is still awaiting, the prior one checks
  // this ref and aborts — only the most recent save's result gets written.
  const activeSaveRef = useRef(null)

  // ── save ────────────────────────────────────────────────────────────────────
  // Debounced at DEBOUNCE_MS. Accepts a plain state snapshot so the closure
  // always captures the values current at call time, not stale refs.
  const save = useCallback(({ nodes, canvasSize, canvasBackground }) => {
    clearTimeout(debounceTimerRef.current)

    debounceTimerRef.current = setTimeout(async () => {
      const thisSave = {}
      activeSaveRef.current = thisSave

      try {
        const serialisedNodes = await serialiseNodes(nodes)

        // Abort if a newer save has taken over
        if (activeSaveRef.current !== thisSave) return

        const payload = JSON.stringify({
          version: 1,
          canvasSize,
          canvasBackground,
          nodes: serialisedNodes,
        })

        try {
          localStorage.setItem(STORAGE_KEY, payload)
        } catch (storageErr) {
          // QuotaExceededError or private-browsing block — fail silently.
          // The in-memory session is unaffected; the user just won't have
          // persistence for this particular save cycle.
          console.warn('[session] save blocked:', storageErr.name)
        }
      } catch (err) {
        // Serialisation failure (e.g. CORS-tainted canvas) — fail silently.
        console.warn('[session] serialisation failed:', err)
      }
    }, DEBOUNCE_MS)
  }, []) // No reactive deps — closes over only constants and refs

  // ── loadSession ─────────────────────────────────────────────────────────────
  // Called once on mount. Returns { canvasSize, canvasBackground, nodes } or
  // null if no valid session exists. Any error or schema mismatch returns null
  // and removes the corrupt entry so it doesn't interfere on future loads.
  const loadSession = useCallback(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return null

      const parsed = JSON.parse(raw)

      // Validate schema — guards against partial writes and future version mismatches
      if (
        parsed?.version !== 1 ||
        !Array.isArray(parsed.nodes) ||
        typeof parsed.canvasSize?.width  !== 'number' ||
        typeof parsed.canvasSize?.height !== 'number' ||
        typeof parsed.canvasBackground   !== 'string'
      ) {
        console.warn('[session] invalid schema, clearing')
        localStorage.removeItem(STORAGE_KEY)
        return null
      }

      return {
        canvasSize:       parsed.canvasSize,
        canvasBackground: parsed.canvasBackground,
        nodes:            parsed.nodes,
      }
    } catch (err) {
      console.warn('[session] load failed:', err)
      return null
    }
  }, [])

  // ── clearSession ─────────────────────────────────────────────────────────────
  // Called by executeNewDocument. Cancels any pending debounce so a fast
  // "New → confirm" doesn't re-save the old state after the clear.
  const clearSession = useCallback(() => {
    clearTimeout(debounceTimerRef.current)
    debounceTimerRef.current = null
    activeSaveRef.current    = null   // abort any in-flight serialisation
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch (err) {
      console.warn('[session] clear failed:', err)
    }
  }, [])

  return { save, loadSession, clearSession }
}
