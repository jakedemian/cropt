import { useState, useCallback } from 'react'

export function useUpload({ captureBlob }) {
  const [status, setStatus] = useState('idle') // idle | uploading | success | error
  const [shareUrl, setShareUrl] = useState(null)
  const [error, setError] = useState(null)

  const upload = useCallback(async () => {
    setStatus('uploading')
    setError(null)

    const blob = await captureBlob(1)
    if (!blob) {
      setStatus('error')
      setError('Failed to capture canvas.')
      return
    }

    const formData = new FormData()
    formData.append('image', blob, 'meme.png')

    try {
      const res = await fetch('/api/upload', { method: 'POST', body: formData })
      const data = await res.json()

      if (!res.ok) {
        setStatus('error')
        setError(data.error ?? 'Upload failed. Please try again.')
        return
      }

      setShareUrl(data.url)
      setStatus('success')
    } catch {
      setStatus('error')
      setError('Network error. Please try again.')
    }
  }, [captureBlob])

  const reset = useCallback(() => {
    setStatus('idle')
    setShareUrl(null)
    setError(null)
  }, [])

  return { status, shareUrl, error, upload, reset }
}
