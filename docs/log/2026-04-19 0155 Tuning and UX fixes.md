# 2026-04-19 0155 Tuning and UX fixes

## TL;DR
- What changed: replaced fake song URLs, refactored CONFIG, added conductor head/pause UX, fixed two click bugs, tuned mouth animation for realistic feel.
- Why: user tested the app and found songs not playing, values scattered, conductor UX wrong, mouths too open/jittery.
- What didn't work: per-band amplitude normalization caused all mouths to open immediately on song start (cold-start blowout). Reverted; fixed instead with higher ampCurve.
- Next: further feel tuning via CONFIG if needed; verify songs load reliably.

---

## Full notes

### songs.json — fake URLs replaced
Original 5 entries used guessed archive.org identifiers that 404'd. App cycled through all, hit failure cap, returned to IDLE silently. Replaced with 18 verified entries from three real collections:
- `OQuamGloriosum` — Victoria motet, Cantus Angelicus
- `20140518-Gregoriana-CC38` — Gregoriana choir concert, Praetorius / Purcell / Viadana / Josquin
- `mariam-matrem` — Ars Mvsica Renaissance polyphony concert
- `GregorianChant` — traditional chant collection

### CONFIG block
Pulled all tunable values out of scattered inline locations into a single `CONFIG` object at top of `main.js`. Sections: mouth shape, mouth animation, shimmer, audio response, frequency bands, timing, layout. Every field commented. User can edit one place to tune everything.

### Conductor head stays visible / pause-resume
Changed conductor behavior: single dot (head) stays on screen always. During PLAYING, pair dots (hands) emerge from it. Click head during PLAYING → pause; click again → resume.

Bugs found and fixed during this:
1. **Pair dots blocking clicks.** `.dot` CSS had `pointer-events: auto` on all dots. During pause, hands retract to center on top of head → ate every click → head never received mousedown. Fixed: `pointer-events: none` on `.dot-pair`, only `.dot-single` is interactive.
2. **Resume silent failure.** `togglePause` used synchronous `try { audio.play() } catch {}` which only catches synchronous throws. `audio.play()` returns a Promise; rejections are async → never caught → audio silently failed to resume. Fixed: made `togglePause` async, `await audio.play().catch(...)`, also resumes AudioContext if suspended.

### Mouth feel tuning
Multiple iterations:
- `analyserSmoothing` raised from 0.35 → 0.72. Lower smoothing caused jitter; real vowels sustain, not flicker.
- Noise amplitudes reduced from 0.18/0.12 → 0.06/0.03. High noise was causing per-mouth shimmer to look jittery rather than organic.
- `ampCurve` raised from 1.0 → 3.0. Linear response meant even background-level FFT energy held mouths open. Cubic curve: quiet passages nearly closed, loud passages wide open.
- `ampGain` 1.0 → 1.5. Boosts signals that pass the curve threshold so activated mouths actually open wide.
- Frequency bands adjusted for more distinct section character; soprano lower bound dropped to 350 Hz to catch more soprano fundamentals.
- Per-band normalization tried and reverted: tracked running peak per row and normalized `avg/peakAmp` so each row self-calibrated. Backfired because `peakFloor` was too low → first real signal massively exceeded floor → normalized to 5+ → always clamped to 1.0 → all mouths open. Simpler fix (higher ampCurve) worked better.
