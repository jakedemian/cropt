# Editor — Plans & Notes

Bugs, features, and enhancements are tracked in [GitHub Issues](https://github.com/jakedemian/cropt/issues).

---

## Design Decisions

### Why Trim and Canvas Crop are separate operations
"Trim" (formerly called "Crop") operates on a single image node — it crops the image's pixels to a sub-region without changing the canvas size. "Canvas Crop" shrinks the canvas bounds itself, affecting all nodes. They look similar but are fundamentally different operations. The naming was chosen to make the distinction clear to users: Trim = trim an image, Crop = crop the canvas.

### Why Trim is disabled on rotated images
Trim works by reading pixel coordinates in canvas space and using them to slice the image's source data. When a node is rotated, its bounding box in canvas space no longer aligns with its pixel axes, making the coordinate math incorrect. The Konva layer clip handles visual cropping for rotated nodes already. A proper fix would require rotating the crop rect into node-local space before slicing.

### Why raster canvases are managed in CanvasStage, not lifted to App
Brush drawing requires updating pixels on every pointermove event — many times per second. React state updates (and the resulting re-renders) are too slow for this. The HTMLCanvas elements are kept in `CanvasStage` and mutated directly. Only on pointer-up is the result serialized to a data URL and stored on the node via `updateNode`, at which point it enters the normal React/undo-history flow.

### Why canvas crop bounds cannot expand beyond the initial selection
The canvas crop tool is intended to shrink the canvas, not grow it. If a user wants to add canvas space, they use the Resize tool. This keeps the two tools' responsibilities clearly separated and prevents accidental canvas expansion during a crop operation.

### Why document history is capped at 5 entries
IndexedDB storage of full canvas states (with base64-encoded image data) can be large. Each entry is gzip-compressed, but 5 was chosen as a balance between usefulness and storage impact. The oldest entry is evicted when a 6th is added.

### Why `pushSnapshot` exists alongside `pushHistory`
`pushHistory` captures the current React state at the moment it's called — which means it must be called *before* the mutation. But some operations (like resize confirm) mutate state via drag handles *before* the confirm button is clicked, so by the time confirm runs, the "before" state is already gone. `pushSnapshot` lets the caller supply an explicit snapshot captured earlier (e.g. at resize-mode entry).
