# Choir Visualizer — Spec

A stupid lil web app. Loads a public-domain choral recording, draws the choir as rows of mouths (ovals), and opens/closes them in response to the music. A pair of white dots traces a conductor's beat pattern overhead. That's it.

**Hosting:** GitHub Pages. Static only. No backend, no build step required (though Vite is fine if preferred).

**Guiding principle:** err toward simplicity. If something is tempting to add and isn't in this spec, it's not in scope.

---

## 1. Experience Walkthrough

### 1.1 First load

User lands on a beige page. Three rows of small black ovals sit in the upper third of the screen — closed mouths, static. Centered below the choir is one medium-sized white dot, gently pulsing. No UI chrome, no buttons visible, no text instructions. The page feels like an art piece, not a tool.

In the bottom corner (small, muted) is a single icon — a shuffle/dice glyph — for picking a different song. Next to it, an upload glyph for loading your own file. Both are low-contrast and easy to miss on first glance. That's intentional.

### 1.2 Starting the song

User clicks the white dot. The dot splits into two smaller dots, which begin tracing a slow figure — the conductor's hands. Audio starts. Mouths begin opening and closing.

### 1.3 During playback

The three rows of mouths correspond to choir sections (top to bottom: soprano, alto/tenor combined, bass — see §2.3). As each frequency band's energy rises, the mouths in that row open wider. At full volume, mouths are round-ish circles. Silent, they're flat horizontal lines (the default dashes).

Within a row, mouths don't move perfectly in sync. Each has a small per-mouth offset and lag so the row shimmers rather than pulses as one unit. This is what sells the organism feel.

The two white dots above the choir trace a conductor's pattern synced to an estimated BPM (see §2.5). Fluid, floaty movement — ease-in-out, never linear.

### 1.4 Ending / switching

When the song ends, the two dots merge back into one pulsing dot. Mouths settle to closed. User can click the dot to replay, or click shuffle for a new song.

### 1.5 Uploading

Clicking the upload glyph opens a file picker. User picks an mp3/wav/ogg. App returns to the "single dot pulsing" state with the new song loaded. Click to play.

---

## 2. System Spec

### 2.1 Stack

- Vanilla HTML + CSS + JS (or TS if needed?), or Vite + vanilla JS if a build step is wanted
- No frameworks. No React. No libraries beyond what the browser provides.
- Web Audio API for analysis (`AudioContext`, `AnalyserNode`)
- SVG for the choir and conductor dots (not canvas — SVG animates more naturally for this scale and we're not pushing pixels)
- Deploys as static files to GitHub Pages

### 2.2 Audio pipeline

```
<audio> element → MediaElementSource → AnalyserNode → destination
                                    ↓
                              getByteFrequencyData() @ 60fps
```

One `AnalyserNode` with `fftSize = 2048`. Every animation frame, pull frequency data, bucket it into bands, feed amplitude values to the mouth renderer.

### 2.3 Choir layout

Three rows, top to bottom:

| Row | Section | Frequency band | Mouth count |
|-----|---------|----------------|-------------|
| Top | Soprano | 300–1100 Hz | 9 |
| Middle | Alto + Tenor | 200–500 Hz | 10 |
| Bottom | Bass | 80–250 Hz | 10 |

Bands overlap intentionally — real voices do too, and the overlap produces the "whole organism" effect. Mouth counts match the reference screenshots. Rows are horizontally offset (staggered) like the images.

### 2.4 Mouth rendering

Each mouth is an SVG ellipse with a fixed center. Two values animate:

- `ry` (vertical radius) — drives openness. Range: ~1px (closed, appears as a dash) to ~14px (fully open circle).
- `rx` (horizontal radius) — stays ~14px but can shrink slightly at max openness so the mouth reads as round rather than wide-open.

Per-mouth amplitude is computed as:

```
mouth.amplitude = band.amplitude * (1 + noise(mouth.id, time) * 0.3)
                                 with a per-mouth lag of 0–150ms
```

The noise term is a cheap sine or Perlin offset keyed off the mouth's index so the variation is stable per mouth, not random per frame. Lag is a per-mouth constant.

Rendering runs at 60fps via `requestAnimationFrame`.

### 2.5 Conductor dots

Two white dots tracing a pattern. Keep it simple — a figure-eight or a 4-beat conductor pattern (down-left-right-up). Path is SVG, position animated along the path with easing.

**BPM estimation:** don't overthink it. Options in order of preference:

1. **Hardcode BPM per curated song.** Since the library is small and curated, just store the BPM with each entry. Zero runtime cost, always correct.
2. If uploaded file: run a simple onset-detection BPM estimate once at load, or fall back to a default 80 BPM if estimation fails.

Pick option 1 for curated songs. For uploads, default to 80 BPM — good enough for the floaty feel.

### 2.6 Song library

A small JSON file (`songs.json`) with curated public-domain choral recordings:

```json
[
  {
    "title": "...",
    "composer": "...",
    "url": "https://archive.org/download/...",
    "bpm": 72
  },
  ...
]
```

Target 15–20 entries. Sources: Internet Archive, Musopen, CPDL recordings. All CORS-friendly direct audio URLs. Verify CORS headers before including — some Internet Archive items work, some don't.

### 2.7 File structure

```
index.html
style.css
main.js
songs.json
/assets
  (favicon, nothing else)
```

That's the whole app.

---

## 3. State Machine

Five states. Transitions only via explicit triggers.

```
        ┌─────────────┐
        │   LOADING   │  (initial fetch of songs.json)
        └──────┬──────┘
               ↓
        ┌─────────────┐
   ┌───▶│    IDLE     │◀─── song ends, or user stops
   │    │ (one dot    │
   │    │  pulsing)   │
   │    └──────┬──────┘
   │           │ click dot
   │           ↓
   │    ┌─────────────┐
   │    │   PLAYING   │
   │    │ (two dots,  │
   │    │  mouths     │
   │    │  moving)    │
   │    └──────┬──────┘
   │           │ song ends
   │           ↓
   │    ┌─────────────┐
   └────│   ENDING    │  (2s settle: dots merge, mouths close)
        └─────────────┘

        ┌─────────────┐
        │   ERROR     │  (audio fails to load)
        └──────┬──────┘
               │ auto-retry or fall back to next song
               ↓
              IDLE
```

### Edge cases

- **CORS failure on a curated song:** log, skip to next song in library, don't surface error to user.
- **User clicks shuffle mid-playback:** fade audio out over 300ms, return to IDLE with new song loaded.
- **User clicks upload mid-playback:** same as shuffle.
- **User clicks the two dots mid-playback:** pause. Click again to resume. (Optional — skip if it complicates things.)
- **Tab backgrounded:** browsers throttle `requestAnimationFrame` to ~1fps. That's fine; let it look frozen. Audio keeps playing.
- **AudioContext suspended (autoplay policy):** AudioContext must be resumed on user gesture. Starting via click on the dot handles this naturally — no separate "unlock audio" step needed.
- **Upload of non-audio file:** show nothing, silently reject. Or flash the upload icon red briefly. Err toward silent.
- **Very quiet section of song:** mouths mostly closed. This is correct behavior, not a bug.

---

## 4. Feel Spec

The whole point. If this section is wrong, the app is wrong regardless of how the mechanics work.

### 4.1 Visual

- **Background:** warm beige, matching the reference. Something like `#E8CFA0`. Flat, no gradient, no texture.
- **Mouths:** solid black. No stroke. No shadow. When closed, they read as dashes, not dots.
- **Conductor dots:** pure white, soft edge (slight blur or 1px anti-alias). Never sharp.
- **No UI chrome** beyond the two corner icons. No title, no attribution overlay, no controls. Song title can appear briefly on change, fading in/out over ~2s, bottom-left, small, muted.

### 4.2 Motion

- **Every animation eases.** No linear interpolation anywhere. `ease-in-out` or a custom cubic-bezier. Floaty, not mechanical.
- **Mouth opening:** ~80ms attack, ~200ms release. Slightly asymmetric — opens faster than it closes, like a real mouth on a sustained note.
- **Per-mouth variation:** 0–150ms lag per mouth, stable (not randomized each frame). Small amplitude noise (±30%) per mouth, also stable. This breaks sync without breaking the section's overall shape.
- **Conductor dots:** path is continuous, velocity varies along the path — slower at extremes, faster through the middle of each beat. Like a real hand.
- **Single dot pulse (IDLE):** slow breathing, ~4 second cycle, scale 0.9 to 1.1, opacity 0.7 to 1.0.
- **Dot split (IDLE → PLAYING):** single dot grows, splits outward to two dot positions over ~800ms with elastic ease.
- **Dot merge (ENDING → IDLE):** reverse. Dots drift back together over ~1.2s.

### 4.3 What it should NOT feel like

- Not an equalizer visualizer (no bars, no spectrum)
- Not a music player (no progress bar, no time display, no track info UI)
- Not reactive-dance-party energy (no flashing, no color, no rapid movement)
- Not precise (this is not a singing tutorial, it's an impression)

### 4.4 What it SHOULD feel like

- A still image that breathes
- Watching a choir from the back of a church with your eyes slightly unfocused
- The feeling of a group of people becoming one thing

---

## 5. Implementation Plan

Five phases. Each ends in a working, viewable artifact. Don't advance until the current phase feels right.

### Phase 1 — Static choir

**Goal:** render the silent-choir screenshot exactly, in the browser.

- `index.html` with an inline SVG
- Three rows of ellipses, horizontally staggered
- Beige background, black mouths, correct counts per row
- Corner icons present but non-functional
- Single pulsing white dot centered below the choir (CSS animation only, no audio yet)

**Acceptance:** page matches screenshot 1. Dot pulses. Nothing else happens.

### Phase 2 — Audio loading and playback

**Goal:** click the dot, a song plays. No visualization yet.

- `songs.json` with 3–5 curated entries (small sample to start)
- On load, fetch `songs.json`, pick one at random
- Click dot → AudioContext created, song plays through `<audio>` element
- AnalyserNode wired up but not yet driving anything
- Shuffle icon works — picks a new random song, replaces current
- Upload icon works — loads a local file

**Acceptance:** click dot, hear music. Click shuffle, hear different music. Upload a file, hear that. No visual response yet.

### Phase 3 — Mouth reactivity

**Goal:** mouths open and close with the music.

- `getByteFrequencyData()` each frame
- Bucket into 3 bands per §2.3
- Drive `ry` on each mouth based on its row's band amplitude
- No per-mouth variation yet — whole row moves as one

**Acceptance:** mouths respond to music. Looks mechanical and too-synced. That's expected — next phase fixes it.

### Phase 4 — Per-mouth variation and easing

**Goal:** the row becomes an organism.

- Add per-mouth lag (stable, indexed)
- Add per-mouth amplitude noise (stable, indexed)
- Add easing to mouth openness (80ms attack, 200ms release)
- Ensure closed mouths render as dashes (low `ry`, full `rx`)

**Acceptance:** mouths shimmer. Row has cohesion but individual mouths have their own pulse. Matches screenshot 2 in feel.

### Phase 5 — Conductor dots

**Goal:** single dot splits, traces a beat pattern, merges back at end.

- Hardcode BPM in `songs.json` entries
- Build SVG path for conductor pattern
- Single-dot pulsing idle state
- Click → split animation (800ms elastic)
- During playback: two dots trace path, looping at BPM
- Song end → merge animation (1.2s)

**Acceptance:** the full experience works end to end. Feels floaty. Feels like a choir.

### Out of scope (explicitly)

- Mobile-specific tuning (works on desktop; mobile is a bonus if it works)
- Accessibility features beyond basic alt text (this is an art piece, not a product)
- Pause/resume (noted as optional in edge cases — skip unless trivial)
- Multiple visualizer modes
- Saving/sharing/embedding
- Any kind of settings panel
- Playlist or queue
- Stem-separated audio (explicitly rejected; use frequency bands)
- Spotify / YouTube / streaming service integration (technically impossible)
