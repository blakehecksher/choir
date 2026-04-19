# 2026-04-19 Mobile and UX polish

## TL;DR
- What changed: full mobile layout (responsive viewBox, 4-row choir, orientation-aware mouth/conductor sizing), play/pause icon on conductor head, persistent song title, blur removed from conductor dots.
- Why: app was designed for desktop only; portrait phones showed a tiny letterboxed strip. User wanted to share with friends on phones.
- What didn't work: `preserveAspectRatio="xMidYMid slice"` was tried and reverted — it clips outer mouths and looks unfinished on portrait. Dynamic viewBox (matching viewport aspect ratio) was the correct fix.
- Next: further mobile feel tuning via portrait CONFIG values if needed.

---

## Full notes

### Mobile layout — dynamic viewBox

Root cause: SVG used a fixed `viewBox="0 0 1000 600"` (landscape). On portrait phone (390×844), `preserveAspectRatio="xMidYMid meet"` scaled content to fit width → rendered choir in a 390×234px strip centered in an 844px tall screen. 73% of the screen was empty background.

Fix: `updateLayout()` computes `vbH = 1000 * vh / vw` so the viewBox always matches the viewport aspect ratio exactly. With `meet`, this fills the screen perfectly with no letterboxing and no clipping.

`updateLayout` runs on init and on `window.resize`. On orientation change, it also rebuilds the choir SVG elements with the correct row config for the new orientation.

### Touch target for conductor head

Added `<circle id="dot-hit">` — transparent, r=60 SVG units, overlaid on the conductor head. Catches touch events that miss the small visual head circle. Wired to same `onDotClick` handler. `r` is updated dynamically in `updateLayout` to 1.4× the head radius.

### 4-row choir (SATB split)

Expanded from 3 rows (soprano / alto-tenor / bass) to 4 rows (soprano / alto / tenor / bass). Two ROW_CONFIGS defined — one per orientation:

- **Landscape**: 7 / 8 / 9 / 8 mouths, spacing 80 SVG units
- **Portrait**: 3 / 4 / 5 / 4 mouths, spacing 187 SVG units

Row Y positions derived from user-provided design mockups (SVG files showing target desktop and iPhone layouts). Expressed as fractions of `vbH`:
- Landscape: 26.0%, 34.7%, 43.5%, 52.4%
- Portrait: 26.6%, 33.3%, 40.1%, 46.8%

Added `bandAlto` (220–1100 Hz) and `bandTenor` (130–550 Hz) to CONFIG. `updateBandAmplitudes` updated to use a `BAND_KEYS` map instead of the old ternary chain.

### Responsive mouth sizing

Mouth geometry matched to mockups:
- Landscape: rx=14, ryClosed=1, ryOpen=20, spacing=80 (20px visual on 1440px desktop)
- Portrait: rx=33, ryClosed=4, ryOpen=47, spacing=187 (13px visual on 393px phone)

`mouthRyClosed` was previously hardcoded in `updateLayout`, making user CONFIG edits ineffective. Fixed: landscape values are snapshotted into `_LANDSCAPE_MOUTH` at module load (capturing whatever the user set in CONFIG). `updateLayout` reads from the snapshot for landscape and from `CONFIG.portraitMouth*` fields for portrait. User edits `mouthRyClosed` in CONFIG → takes effect on desktop.

### Conductor sizing — physical pixel consistency

Conductor head and arm dots sized in physical pixels (not SVG units) so they appear the same size on all screens. CONFIG fields:
- `conductorHeadPx: 42` — head radius in screen pixels
- `conductorArmPx: 9` — arm dot radius in screen pixels
- `conductorPathRxPx: 90` — figure-8 horizontal reach in screen pixels
- `conductorPathRyPx: 30` — figure-8 vertical reach in screen pixels

`updateLayout` converts: `headR = CONFIG.conductorHeadPx / scale` where `scale = vw / vbW`.

Bug fixed: with the old fixed SVG path (rx=120, ry=40), the portrait conductor head was r=107 SVG units but the path only extended 120 horizontally and 40 vertically. Arms barely left the head. Pixel-based path radius fixes this — arms now extend consistently beyond the head on any screen size.

### Play/pause icon on conductor head

Added `<path id="conductor-play">` and `<g id="conductor-pause">` inside the conductor SVG group. Icons are filled `var(--bg)` (the page background color) creating a debossed cutout appearance on the white head.

Icon geometry computed in `updateLayout` relative to `headR`:
- Play triangle: right-pointing, inscribed in `ir = headR * 0.48`
- Pause bars: two rects, widths/heights/gap proportional to `ir`

State toggling via `updateConductorIcon()`:
- Shows ▶ when idle, ending, or paused
- Shows ⏸ while actively playing

Called from `enterState()` and `togglePause()`.

SVG z-order: arm dots rendered before the icons so icons always appear on top of the arms as they swing through.

### Blur removed from conductor dots

Removed `filter="url(#dot-soft)"` from `dot-single`, `dot-a`, `dot-b`. Gaussian blur was visually inconsistent with the crisp mouth style, and caused the play/pause icon fill to appear muddy at the blurred head edges.

### Song title persistent

Previously `showSongTitle` set a 4-second `setTimeout` to remove the `.visible` class. Removed the timer. Title now stays visible indefinitely once shown. Updates in place on shuffle/upload.

### Mobile CSS hardening

- `viewport-fit=cover` added for iPhone notch/home bar support
- `height: 100svh` fallback for iOS Safari 100vh bug
- `touch-action: none` on SVG stage
- `touch-action: manipulation` and `-webkit-tap-highlight-color: transparent` on buttons
- `@media (pointer: coarse)` — 44px min touch targets, safe-area insets, higher base opacity (buttons visible without hover state)
