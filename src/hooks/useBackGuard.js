import { useEffect, useRef, useCallback } from 'react'

/**
 * Intercepts the browser / Android-PWA back button by pushing a history guard
 * state on mount. When the user navigates back while there is canvas content,
 * the guard is re-pushed (keeping the app visible) and onLeaveRequested() is
 * called so the parent can show a confirmation dialog.
 *
 * iOS Safari PWA limitation: the swipe-up-to-home and left-edge-swipe-to-Safari
 * gestures are handled at the OS level. popstate, pagehide, and beforeunload are
 * never fired in time to show UI, so iOS close gestures cannot be intercepted.
 * This hook only helps on Android PWA and standard desktop/mobile browsers.
 *
 * @param {object} params
 * @param {boolean} params.hasContent       - Whether the canvas has unsaved content
 * @param {function} params.onLeaveRequested - Called when back is pressed with content
 * @param {React.MutableRefObject<boolean>} params.suppressBeforeUnloadRef
 *   Shared ref that, when set true, tells the beforeunload handler to stand down.
 *   Required to prevent a double-dialog when confirmLeave() → history.back()
 *   triggers a real page unload.
 */
export function useBackGuard({ hasContent, onLeaveRequested, suppressBeforeUnloadRef }) {
  // Keep a stable ref to the latest values so the popstate handler (created
  // once on mount) always sees fresh state without needing to re-register.
  const hasContentRef = useRef(hasContent)
  hasContentRef.current = hasContent

  const onLeaveRequestedRef = useRef(onLeaveRequested)
  onLeaveRequestedRef.current = onLeaveRequested

  useEffect(() => {
    // Push a guard entry so the back gesture/button has something to pop
    // before actually leaving the app.
    history.pushState({ mcBackGuard: true }, '')

    const handler = () => {
      if (hasContentRef.current) {
        // Re-push immediately so the user stays in the app while the dialog
        // is visible. Another back press while the dialog is open will fire
        // this handler again — setShowLeaveWarning(true) is a no-op on repeat.
        history.pushState({ mcBackGuard: true }, '')
        onLeaveRequestedRef.current()
      }
      // No content → back navigation proceeds naturally (guard was already
      // popped by the browser; nothing to re-push).
    }

    window.addEventListener('popstate', handler)
    return () => window.removeEventListener('popstate', handler)
  }, []) // intentionally empty — registers once on mount

  /**
   * Call this when the user confirms they want to leave. Clears the guard so
   * the subsequent popstate from history.back() doesn't re-show the dialog,
   * and suppresses the beforeunload handler to avoid a second native dialog.
   */
  const confirmLeave = useCallback(() => {
    // Prevent the popstate that history.back() is about to fire from showing
    // the dialog again.
    hasContentRef.current = false
    // Prevent the native beforeunload dialog from appearing if history.back()
    // causes a full page unload (e.g. navigating out of a browser tab).
    if (suppressBeforeUnloadRef) {
      suppressBeforeUnloadRef.current = true
    }
    history.back()
  }, [suppressBeforeUnloadRef])

  return { confirmLeave }
}
