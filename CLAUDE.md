# MemeCanvas — Claude Code Context

## Project Overview

MemeCanvas is a **mobile-first Progressive Web App (PWA)** for creating memes and image compositions. Users can import images, add text overlays, resize/crop/flip content, and export the final result. The app is designed to work seamlessly as an installed PWA on Android and iOS, with full desktop browser support.

**Live URL:** https://meme-canvas-gamma.vercel.app

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Build | Vite 7 |
| Framework | React 19 |
| Styling | Tailwind CSS v4 (via `@tailwindcss/vite`) |
| Canvas | Konva.js + react-konva |
| PWA | vite-plugin-pwa |
| Hosting | Vercel |

---

## Key Features

- **Image import** — Paste from clipboard, drag-and-drop, or file picker
- **Text nodes** — Place text anywhere, style with bold/italic, color, outline, font size
- **Transform controls** — Drag, resize, rotate any node via Konva Transformer
- **Crop tool** — Crop images to a rectangular region (rotation must be 0)
- **Canvas resize** — Drag edge/corner handles to resize the canvas bounds
- **Layer panel** — Reorder nodes via drag-and-drop; select/delete from panel
- **Undo/Redo** — Up to 50 steps of history
- **Export** — Save as PNG or copy to clipboard
- **Session persistence** — Auto-saves to localStorage; restores on reload
- **Leave warning** — Prompts before losing unsaved work (back button, browser close)
- **PWA** — Installable, standalone display, portrait orientation

---

## Domain Language

| Term | Meaning |
|------|---------|
| **Node** | A canvas element — either `image` or `text` type |
| **Stage** | The Konva Stage; the zoomable/pannable viewport |
| **Canvas** | The logical document bounds (white/black/transparent background) |
| **Transformer** | Konva's resize/rotate handles shown on selected node |
| **Crop mode** | UI state where user drags a rectangle to crop an image |
| **Resize mode** | UI state where canvas edge handles are shown |
| **Text place mode** | UI state where next tap places a new text node |
| **Text edit mode** | Inline editing a text node via HTML textarea overlay |

---

## Project Structure

```
src/
├── App.jsx                  # Main component; orchestrates all state and UI
├── main.jsx                 # React entry point
├── index.css                # Tailwind imports + global styles
├── components/
│   ├── Canvas/
│   │   ├── CanvasStage.jsx      # Konva Stage + Layer; handles pan/zoom
│   │   ├── ImageNode.jsx        # Renders an image node
│   │   ├── TextNode.jsx         # Renders a text node
│   │   ├── TransformWrapper.jsx # Wraps node with Transformer when selected
│   │   ├── CropOverlay.jsx      # Crop rectangle UI
│   │   ├── CanvasResizeHandles.jsx # Edge/corner drag handles for canvas resize
│   │   └── TextEditOverlay.jsx  # HTML textarea overlay for inline text editing
│   ├── Toolbar/
│   │   ├── TopBar.jsx           # Header with title, undo/redo, export, overflow menu
│   │   └── BottomToolbar.jsx    # Context-sensitive bottom bar (add image, text, layers, etc.)
│   └── LayerPanel/
│       ├── LayerPanel.jsx       # Slide-out layer list
│       └── LayerItem.jsx        # Individual layer row (thumbnail, name, actions)
└── hooks/
    ├── useCanvasState.js        # Core state: nodes, canvas size, background, history
    ├── useImageImport.js        # Paste, drop, file picker handlers
    ├── useExport.js             # Export to PNG / copy to clipboard
    ├── useInstallPrompt.js      # PWA install banner logic
    ├── useSessionPersistence.js # Auto-save/restore to localStorage
    └── useBackGuard.js          # History API back-button leave warning
```

---

## Development Commands

```bash
npm run dev      # Start Vite dev server (hot reload)
npm run build    # Production build to dist/
npm run preview  # Preview production build locally
npm run lint     # ESLint
```

---

## Deployment

**Automatic:** Merging a PR to `main` triggers a production deployment via Vercel's GitHub integration.

**Manual:** Deploy from CLI with:

```bash
vercel --prod
```

**Production URL:** https://meme-canvas-gamma.vercel.app

**Note:** The commit author email must be verified in both your GitHub account (Settings → Emails) and Vercel account (Settings → Emails) for automatic deployments to work.

---

## Versioning

The project uses **SemVer** (MAJOR.MINOR.PATCH):
- **PATCH** — Bug fixes
- **MINOR** — New features (backwards compatible)
- **MAJOR** — Breaking changes

Current version is in `package.json` and displayed in the app's overflow menu (`v{version}`).

---

## Known Limitations

1. **Export canvas blink** — Brief flash when exporting due to transform reset; proper fix requires offscreen canvas rendering.

2. **Desktop PWA Cmd+Q** — macOS force-quit bypasses `beforeunload`, so leave warning doesn't appear. OS-level limitation.

3. **iOS PWA swipe-close** — Cannot intercept the swipe-to-close gesture on iOS PWA. OS-level limitation.

4. **Crop requires rotation=0** — Cropping a rotated image is disabled; user must flatten rotation first.

---

## Architecture Notes

### State Management
All canvas state lives in `useCanvasState` hook — nodes array, canvas size, background, selection, history stacks. No external state library.

### History
Undo/redo uses snapshot-based history stored in refs (to avoid re-renders). `pushHistory()` captures state before mutations; `pushSnapshot()` accepts explicit snapshots for cases where the pre-mutation state is already known.

### Coordinate System
- **Stage coordinates** — Pan/zoom transformed; what the user sees
- **Canvas coordinates** — Logical 1:1 coordinates; where nodes actually live
- Conversion: `stageToCanvas(point, stageViewport)`

### Session Persistence
`useSessionPersistence` debounces saves (1500ms) to localStorage. Blob URLs are converted to data URLs before storage. New Document clears saved state.

### Back-Button Guard
`useBackGuard` pushes a guard state via History API. On `popstate`, if content exists, it re-pushes the guard and shows a custom "Leave MemeCanvas?" dialog. `confirmLeave()` sets flags and calls `history.back()` to actually leave.

---

## Testing Notes

- No automated test suite yet
- Manual testing on: Chrome (desktop), Safari (iOS PWA), Chrome (Android PWA)
- Konva canvas interactions cannot be automated via typical DOM testing

---

## Future Considerations

See `TODO.md` for the full backlog.
