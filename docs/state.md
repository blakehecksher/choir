# State
_Last updated: 2026-04-19 0155_

## Current focus

Post-launch tuning. App is working end-to-end. Iterating on feel.

## What's working

- 18 verified archive.org songs load and play (Renaissance polyphony / choral / Gregorian chant).
- Conductor head (single dot) stays on screen always. Hands emerge on play, retract on pause. Click head to toggle pause/resume. Click in IDLE to start.
- All tunable values in one `CONFIG` block at top of `main.js`.
- Mouths respond to music with smooth, sustained motion (`analyserSmoothing: 0.72`). Quiet passages mostly closed; loud passages open. Per-mouth shimmer subtle, not jittery.
- Shuffle / upload fade audio and settle back to IDLE with new song loaded.
- Upload any local audio file; plays immediately without CORS concern.

## In progress

Nothing active.

## Known issues

- Soprano row (350–3500 Hz) responds less than middle row — inherent to SATB choral recordings where most energy lives in 160–800 Hz. Adjusting `CONFIG.bandSoprano` lower limit or `ampCurve` can shift this.
- Mobile layout untuned (out of scope per spec).
- No favicon.

## Next actions
1. Further feel tuning via CONFIG if needed (`ampCurve`, `ampGain`, band limits).
2. Verify all 18 song URLs still resolve and have CORS headers.

## Active plan
docs/plans/2026-04-18 2259 Plan - Initial implementation.md

## How to verify

```bash
cd Choir
python -m http.server 8000
# open http://localhost:8000
```

## Recent logs
- docs/log/2026-04-19 0155 Tuning and UX fixes.md — songs, CONFIG refactor, conductor head/pause, click bugs, mouth tuning
- docs/log/2026-04-18 2309 Kickoff.md — initial implementation, all 5 spec phases
