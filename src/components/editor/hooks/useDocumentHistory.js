import { useCallback } from 'react'

const DB_NAME    = 'cropt_db'
const DB_VERSION = 1
const STORE_NAME = 'documents'
const MAX_ENTRIES = 5

// ── IndexedDB helpers ────────────────────────────────────────────────────────

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = (e) => {
      e.target.result.createObjectStore(STORE_NAME, { keyPath: 'id' })
    }
    req.onsuccess = (e) => resolve(e.target.result)
    req.onerror  = (e) => reject(e.target.error)
  })
}

async function compress(str) {
  const stream = new Blob([str]).stream().pipeThrough(new CompressionStream('gzip'))
  return new Response(stream).arrayBuffer()
}

async function decompress(buffer) {
  const stream = new Blob([buffer]).stream().pipeThrough(new DecompressionStream('gzip'))
  return new Response(stream).text()
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useDocumentHistory() {

  // Save current canvas state as a history entry.
  // - existingId: if set, updates that entry in place (same ID, new timestamp/content)
  //   rather than creating a new entry. Callers use this so restoring and re-saving
  //   a document doesn't create duplicate entries.
  // Returns the id of the saved entry (existing or newly created).
  const saveToHistory = useCallback(async ({ nodes, canvasSize, canvasBackground }, thumbnail = null, existingId = null) => {
    try {
      const db = await openDB()
      const compressed = await compress(JSON.stringify({ version: 1, canvasSize, canvasBackground, nodes }))

      const id = existingId || Date.now().toString()
      const entry = {
        id,
        savedAt:   Date.now(),
        thumbnail,
        canvasSize,
        nodeCount: nodes.length,
        state:     compressed,
      }

      await new Promise((resolve, reject) => {
        const tx    = db.transaction(STORE_NAME, 'readwrite')
        const store = tx.objectStore(STORE_NAME)

        if (existingId) {
          // Update in place — store.put upserts, so this works even if the entry
          // was somehow evicted. No need to enforce MAX_ENTRIES (count unchanged).
          store.put(entry)
        } else {
          const getAllReq = store.getAll()
          getAllReq.onsuccess = () => {
            const all = getAllReq.result
            if (all.length >= MAX_ENTRIES) {
              const oldest = all.sort((a, b) => a.savedAt - b.savedAt)[0]
              store.delete(oldest.id)
            }
            store.put(entry)
          }
        }

        tx.oncomplete = resolve
        tx.onerror    = () => reject(tx.error)
      })

      return id
    } catch (err) {
      console.warn('[history] save failed:', err)
      return null
    }
  }, [])

  // Returns an array of history entries sorted newest-first.
  // Each entry has: { id, savedAt, thumbnail, canvasSize, nodeCount }
  // (state/compressed bytes are not included — call loadDocument for those)
  const loadHistory = useCallback(async () => {
    try {
      const db  = await openDB()
      const all = await new Promise((resolve, reject) => {
        const tx  = db.transaction(STORE_NAME, 'readonly')
        const req = tx.objectStore(STORE_NAME).getAll()
        req.onsuccess = () => resolve(req.result)
        req.onerror   = () => reject(req.error)
      })
      return all
        .sort((a, b) => b.savedAt - a.savedAt)
        .map(({ id, savedAt, thumbnail, canvasSize, nodeCount }) => ({ id, savedAt, thumbnail, canvasSize, nodeCount }))
    } catch (err) {
      console.warn('[history] load failed:', err)
      return []
    }
  }, [])

  // Loads and decompresses a single document state by id.
  // Returns { version, canvasSize, canvasBackground, nodes } or null on error.
  const loadDocument = useCallback(async (id) => {
    try {
      const db    = await openDB()
      const entry = await new Promise((resolve, reject) => {
        const tx  = db.transaction(STORE_NAME, 'readonly')
        const req = tx.objectStore(STORE_NAME).get(id)
        req.onsuccess = () => resolve(req.result)
        req.onerror   = () => reject(req.error)
      })
      if (!entry) return null
      const json = await decompress(entry.state)
      return JSON.parse(json)
    } catch (err) {
      console.warn('[history] load document failed:', err)
      return null
    }
  }, [])

  // Update only the savedAt timestamp of an existing entry (moves it to the top
  // of the list without changing its content). Used when restoring a document
  // so the restored entry sorts above the one that was just saved.
  const touchEntry = useCallback(async (id) => {
    try {
      const db = await openDB()
      await new Promise((resolve, reject) => {
        const tx    = db.transaction(STORE_NAME, 'readwrite')
        const store = tx.objectStore(STORE_NAME)
        const req   = store.get(id)
        req.onsuccess = () => {
          if (req.result) store.put({ ...req.result, savedAt: Date.now() })
        }
        tx.oncomplete = resolve
        tx.onerror    = () => reject(tx.error)
      })
    } catch (err) {
      console.warn('[history] touch failed:', err)
    }
  }, [])

  return { saveToHistory, loadHistory, loadDocument, touchEntry }
}
