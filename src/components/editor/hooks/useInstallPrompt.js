import { useState, useEffect } from 'react'

// Captures the browser's beforeinstallprompt event so we can trigger the
// PWA install dialog on demand. Returns:
//   canInstall  — true when a deferred prompt is waiting (Chrome / Android)
//   promptInstall — call this to show the native install dialog
//
// On iOS Safari there is no install API; users must use the Share → Add to
// Home Screen flow manually, so canInstall stays false there.
export function useInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const canInstall = deferredPrompt !== null

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault()          // stop the mini-infobar from auto-appearing
      setDeferredPrompt(e)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  // Clear the prompt once the app is installed (e.g. from another surface)
  useEffect(() => {
    const handler = () => setDeferredPrompt(null)
    window.addEventListener('appinstalled', handler)
    return () => window.removeEventListener('appinstalled', handler)
  }, [])

  const promptInstall = async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') setDeferredPrompt(null)
  }

  return { canInstall, promptInstall }
}
