# MemeCanvas — TODO

Running list of bugs, improvements, and future features discovered post-launch.

---

## 🐛 Known Bugs

- **Export / Copy canvas blink (minor)** — The canvas briefly flashes when Export or Copy is triggered. Root cause: resetting the Konva stage transform to identity triggers a layer redraw that the browser can paint before the restore runs. A `visibility: hidden` guard was added but doesn't fully eliminate it. Proper fix: capture via an offscreen canvas drawn from each layer's raw buffer, bypassing the stage transform entirely.

- **Desktop PWA Cmd+Q doesn't trigger leave warning** — On macOS, Cmd+Q force-quits Chrome/Edge before `beforeunload` can fire, so the unsaved-work dialog never appears for desktop PWA users who quit via the keyboard. The History API back-button guard only covers browser navigation, not process-level termination. Possible workaround: `visibilitychange` + `pagehide` heuristic, but this may be an unfixable OS-level limitation.

---

---

## 🗓 Future Features (v2+)

- **Multi-document tabs** — multiple canvases open at once; one document at a time for MVP
- **Drawing / brush tools**
- **Filters and color adjustments**
- **Cloud save / sync**
- **Collaboration**
- **Undo history beyond 50 steps**
- **Android / iOS native app wrapper**

---

## ✅ Recently Resolved

- **Session persistence (auto-save)** — Canvas state (nodes, canvas size, background) is auto-saved to `localStorage` on every meaningful change (debounced 1500ms) and silently restored on next load. Blob URLs are serialised to data URLs before storage. New Document wipes the saved state.

- **Back-button leave warning** — `useBackGuard` hook pushes a history guard state on mount; pressing back with canvas content shows a "Leave MemeCanvas?" dialog (Stay / Leave Anyway). Covers browser back button and Android PWA back gesture. iOS PWA swipe-close is an OS-level limitation and cannot be intercepted.

- **Version number (SemVer)** — `package.json` set to `1.0.0`; version string displayed as `v{version}` at the bottom of the ⋯ overflow menu. Bump patch for fixes, minor for new features.

- **Resize button moved to bottom toolbar** — Removed from the ⋯ overflow menu and placed as a permanent `⤢ Resize` button in the main bottom toolbar alongside + Image, T+ Text, and Layers.

- **Bold / Italic tap targets widened** — B and I buttons increased from `w-9` (36px) to `w-11` (44px) to meet the minimum recommended touch target size on mobile.
