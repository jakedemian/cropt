# Editor — Plans & Notes

## Improvements & Features

| # | Description | Status |
|---|-------------|--------|
| 1 | **Landing experience** — Default blank canvas isn't the right first impression. Needs a second pass on what the editor looks like before the user has imported anything. | Open |
| 2 | **Image import & initial crop** — Cropping behavior immediately after importing an image feels awkward. Needs revisiting. | Open |
| 3 | **Color picker upgrade** — The custom color picker needs a significant upgrade (better UX, swatches, recent colors, etc.). | Open |
| 4 | **Marquee tool enhancements** — Move a marquee selection with the Move tool; delete just the selected area from the current layer; potentially more selection operations. | Done |
| 5 | **Bottom bar layout** — Split into two regions: dimensions pinned to the right, everything else in a scrollable horizontal overflow on the left. | Done |

---

## Known Bugs

| # | Description | Status |
|---|-------------|--------|
| 1 | **Flip + resize flip-flop** — If a node is flipped then resized via transform anchors, the image flips again on resize end. Resizing again flips it back. Toggles on every resize. | Open |
| 2 | **Mobile tool chevron direction** — Chevron pointed right (collapsed) / left (expanded) instead of down (collapsed) / right (expanded). | Fixed |
| 3 | **Mobile layer selection blocked by active tool** — On mobile, with certain tools active (e.g. brush), tapping a different layer in the layer panel does not select it. | Open |
| 5 | **Layer selection blocked by active tool (all platforms)** — Switching the active layer only works when the Move tool is selected. Tool choice should be irrelevant to layer selection. | Open |
| 7 | **Share link always points to production URL on dev** — After uploading from the dev environment, the copy link shows `cropt.app/m/[id]` instead of the current deployment's origin. The id exists only in the dev DB so the prod URL 404s. | Open |
| 6 | **Eraser tool on image layer creates new raster layer** — Selecting the eraser while an image node is the active layer creates a new raster layer and switches to it instead of staying on the current layer. | Open |
| 4 | **Marquee pixel ops auto-rasterize image nodes** — Marquee delete and move on image nodes now auto-rasterize the image into a full-canvas paint layer before performing the operation. The original image node is replaced by a raster layer (undoable). | Fixed |

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
