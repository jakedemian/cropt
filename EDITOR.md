# Editor — Plans & Notes

## UX Improvements

### Landing Experience
The default blank 1000x1000 canvas isn't the right first impression. Need a second pass on what the editor looks like/does before the user has imported anything.

### Image Import & Initial Crop
The cropping behavior immediately after importing an image feels awkward. Needs revisiting.

---

## Known Bugs

| # | Description | Status |
|---|-------------|--------|
| 1 | **Flip + resize flip-flop** — If a node is flipped then resized via transform anchors, the image flips again on resize end. Resizing again flips it back. Toggles on every resize. | Open |
| 2 | **Mobile tool chevron direction** — Chevron pointed right (collapsed) / left (expanded) instead of down (collapsed) / right (expanded). | Fixed |
