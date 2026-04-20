// Choir Visualizer
// See docs/spec/ for the source-of-truth spec.

// =====================================================================
// CONFIG — all tunable values live here
// =====================================================================
const CONFIG = {

  // --- Mouth shape — landscape (desktop) ---------------------------
  // mouthWidthClosed / mouthWidthOpen:
  //   horizontal half-width of the mouth ellipse in SVG units.
  //   (Old naming: mouthRx / mouthRxOpen.)
  mouthWidthClosed: 14,
  mouthWidthOpen:   11,
  // mouthHeightClosed / mouthHeightOpen:
  //   vertical half-height of the mouth ellipse in SVG units.
  //   Keep mouthHeightClosed near 1 for a dash-like closed mouth.
  //   (Old naming: mouthRyClosed / mouthRyOpen.)
  mouthHeightClosed: 1,
  mouthHeightOpen:   28,
  // singerSpacing: center-to-center X distance between singers.
  //   (Old naming: mouthSpacing.)
  singerSpacing: 80,

  // --- Mouth shape — portrait (phone) ------------------------------
  // Same parameters as above, scaled for the narrow portrait viewport.
  portraitMouthWidthClosed:  33,
  portraitMouthWidthOpen:    26,
  portraitMouthHeightClosed:  2,
  portraitMouthHeightOpen:   100,
  portraitSingerSpacing:    180,

  // --- Conductor ---------------------------------------------------
  // conductorHeadPx:    radius of the head dot in physical screen pixels
  conductorHeadPx:    42,
  // conductorArmPx:     radius of each hand dot in physical screen pixels
  conductorArmPx:      9,
  // conductorPathRxPx:  figure-8 horizontal half-span (screen pixels)
  conductorPathRxPx: 90,
  // conductorPathRyPx:  figure-8 vertical half-span (screen pixels)
  conductorPathRyPx:  30,

  // --- Mouth animation ----------------------------------------------
  // mouthOpenResponseMs / mouthCloseResponseMs:
  //   how quickly mouths react when opening or closing.
  //   Lower = faster response. "Tau" is the technical term for this smoothing time.
  mouthOpenResponseMs:        32,
  //   Jitter adds slight per-singer timing variation. Set to 0 for unison.
  //   Real choirs never attack in perfect unison — a few ms of spread reads as human.
  mouthOpenResponseJitterMs:  14,
  mouthCloseResponseMs:      185,
  mouthCloseResponseJitterMs: 55,

  // --- Per-mouth shimmer (idle noise) ------------------------------
  // maxRippleDelayFrames:
  //   max frame delay before one singer copies the row loudness,
  //   which creates the ripple effect across the row.
  //   Small non-zero values give a subtle phrase ripple without looking like a wave.
  maxRippleDelayFrames: 2,
  // idleWobbleAmount1 / idleWobbleAmount2:
  //   amount of subtle idle movement added even when the choir is quiet.
  //   Simulates breath, jaw micro-settling, and singers not being statues.
  idleWobbleAmount1: 0.055,
  idleWobbleAmount2: 0.035,
  // idleWobbleSpeed1 / 2 and their Jitter values:
  //   speed of those idle wobble waves.
  //   Speed 1 ≈ slow breath cycle (~0.4 Hz). Speed 2 ≈ faster jaw flutter (~1 Hz).
  idleWobbleSpeed1:       0.0026,
  idleWobbleSpeed1Jitter: 0.0014,
  idleWobbleSpeed2:       0.0062,
  idleWobbleSpeed2Jitter: 0.0028,

  // --- Strain shimmer (loud noise) ---------------------------------
  // Added on top of idle noise when amplitude is high — simulates vocal vibrato/strain.
  // strainStartLevel: loudness level (0-1) where strained wobble begins.
  strainStartLevel: 0.42,
  // strainWobbleAmount: max extra mouth wobble at full volume.
  strainWobbleAmount: 0.14,
  // strainWobbleSpeed / Jitter:
  //   speed of the strained wobble. ~0.028 ≈ 4.5 Hz, classic vocal vibrato rate.
  //   Jitter spreads singers across ~4–5.5 Hz so the row doesn't vibrate in lockstep.
  strainWobbleSpeed:       0.028,
  strainWobbleSpeedJitter: 0.008,

  // --- Audio response -----------------------------------------------
  // loudnessCurve:
  //   shapes the FFT loudness reading before it drives the mouths.
  //   Higher = quiet passages stay quieter, loud passages pop more.
  //   (Old naming: ampCurve.)
  loudnessCurve: 2.0,
  // inputBoost: overall loudness boost after curve shaping.
  //   (Old naming: ampGain.)
  inputBoost: 2.2,
  // minOpenLevel / fullOpenLevel:
  //   loudness level where mouths start opening and where they reach fully open.
  //   (Old naming: ampFloor / ampCeiling.)
  minOpenLevel:  0.30,
  fullOpenLevel: 1.0,
  // fftSmoothing: analyser smoothing amount from 0-1.
  //   Higher = smoother but slower to react.
  //   (Old naming: analyserSmoothing.)
  fftSmoothing: 0.8,

  // --- Frequency bands (Hz) ----------------------------------------
  // Each band defines the Hz range averaged for that voice section.
  // Soprano extends high to capture overtones that choral sopranos project.
  // Bands intentionally overlap so adjacent rows move sympathetically.
  bandSoprano: { min: 500, max: 1600 },
  bandAlto:    { min: 250, max: 1020  },
  bandTenor:   { min: 200, max: 900  },
  bandBass:    { min:  50, max: 750  },

  // --- Per-part audio response -------------------------------------
  // Each voice section can be tuned independently. These values control
  // when that row starts opening, when it reaches fully open, how much
  // loudness boost it gets, and when strained wobble begins.
  // Sopranos vibrato earlier (they sit at the top of their range more often).
  // Basses later (chest voice is steadier at moderate volume).
  bandTuning: {
    soprano: { minOpenLevel: 0.30, fullOpenLevel: 1.0, inputBoost: 2.7, strainStartLevel: 0.38 },
    alto:    { minOpenLevel: 0.30, fullOpenLevel: 1.0, inputBoost: 2.2, strainStartLevel: 0.42 },
    tenor:   { minOpenLevel: 0.30, fullOpenLevel: 1.0, inputBoost: 2.2, strainStartLevel: 0.44 },
    bass:    { minOpenLevel: 0.30, fullOpenLevel: 1.0, inputBoost: 2.2, strainStartLevel: 0.50 },
  },

  // --- Timing (ms) --------------------------------------------------
  // audioFadeMs:       duration of gain fade-out when stopping/shuffling.
  audioFadeMs:     300,
  // endingSettleMs:    how long mouths take to close after song ends.
  endingSettleMs:  2000,
  // mergeDurationMs:   how long conductor hands take to merge back to head.
  mergeDurationMs: 1200,
  // splitDurationMs:   (reserved) split-out animation duration.
  splitDurationMs: 800,
  // retractDurationMs: how long hands retract on pause / emerge on resume.
  retractDurationMs: 500,
  // conductorBeatsPerCycle: beats per full figure-8 loop.
  conductorBeatsPerCycle: 4,

  // --- Debug -------------------------------------------------------
  // debugPanel: set true to enable the live-tuning overlay (D key or debug button).
  debugPanel: true,

  // --- Layout (set dynamically) ------------------------------------
  // These are overwritten every layout pass — do not hand-tune.
  dotCenterX:    500,
  dotCenterY:    430,

};

// Snapshot landscape mouth values so updateLayout can restore them
// when switching back from portrait. Captured once at load time.
const _LANDSCAPE_MOUTH = Object.freeze({
  widthClosed:  CONFIG.mouthWidthClosed,
  widthOpen:    CONFIG.mouthWidthOpen,
  heightClosed: CONFIG.mouthHeightClosed,
  heightOpen:   CONFIG.mouthHeightOpen,
  spacing:      CONFIG.singerSpacing,
});
// =====================================================================

const SVG_NS = 'http://www.w3.org/2000/svg';

// Row counts and band assignments per orientation.
// Y positions computed dynamically in updateLayout().
const ROW_CONFIGS = {
  landscape: [
    { id: 'row1', elementId: 'row-1', count: 7, band: 'soprano' },
    { id: 'row2', elementId: 'row-2', count: 8, band: 'alto'    },
    { id: 'row3', elementId: 'row-3', count: 9, band: 'tenor'   },
    { id: 'row4', elementId: 'row-4', count: 8, band: 'bass'    },
  ],
  portrait: [
    { id: 'row1', elementId: 'row-1', count: 3, band: 'soprano' },
    { id: 'row2', elementId: 'row-2', count: 4, band: 'alto'    },
    { id: 'row3', elementId: 'row-3', count: 5, band: 'tenor'   },
    { id: 'row4', elementId: 'row-4', count: 4, band: 'bass'    },
  ],
};

const BAND_KEYS = {
  soprano: 'bandSoprano',
  alto:    'bandAlto',
  tenor:   'bandTenor',
  bass:    'bandBass',
};

const rng = (() => {
  let s = 0x9E3779B9;
  return () => {
    s ^= s << 13; s >>>= 0;
    s ^= s >>> 17; s >>>= 0;
    s ^= s << 5;  s >>>= 0;
    return (s >>> 0) / 0xFFFFFFFF;
  };
})();

// -------------------- State --------------------

const State = Object.freeze({
  LOADING: 'LOADING',
  IDLE:    'IDLE',
  PLAYING: 'PLAYING',
  ENDING:  'ENDING',
  ERROR:   'ERROR',
});

const app = {
  state: State.LOADING,
  songs: [],
  currentSong: null,
  audio: null,
  audioCtx: null,
  analyser: null,
  freqData: null,
  source: null,
  gain: null,
  rows: [],
  mouths: [],
  paused: false,
  pauseStartTime: 0,
  resumeTime: 0,
  conductorPhaseOffset: 0,
  pausedDotA: { x: 0, y: 0 },
  pausedDotB: { x: 0, y: 0 },
  conductorPath: null,
  conductorLength: 0,
  stateEnteredAt: 0,
  dots: { single: null, a: null, b: null },
  songTitleEl: null,
  lastRafTime: 0,
  failureStreak: 0,
  conductorHeadR: 14,
  conductorArmR:  10,
};

// -------------------- Bootstrap --------------------

document.addEventListener('DOMContentLoaded', init);

async function init() {
  cacheElements();
  updateLayout();
  window.addEventListener('resize', updateLayout);

  app.audio = document.getElementById('audio');
  app.audio.addEventListener('ended', onSongEnded);
  app.audio.addEventListener('error', onAudioError);
  app.audio.addEventListener('playing', () => { app.failureStreak = 0; });

  wireInputs();

  requestAnimationFrame(tick);

  try {
    const resp = await fetch('songs.json', { cache: 'no-store' });
    if (!resp.ok) throw new Error(`songs.json ${resp.status}`);
    app.songs = await resp.json();
  } catch (err) {
    console.warn('songs.json failed to load; only uploads will be available', err);
    app.songs = [];
  }

  if (app.songs.length > 0) {
    pickRandomSong();
  }

  enterState(State.IDLE);
}

// -------------------- Layout --------------------

let _currentOrientation = null;

function updateLayout() {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const vbW = 1000;
  const vbH = vbW * vh / vw;
  const isPortrait = vh > vw;
  const orientation = isPortrait ? 'portrait' : 'landscape';
  const scale = vw / vbW;

  document.getElementById('stage').setAttribute('viewBox', `0 0 ${vbW} ${vbH}`);

  // Apply mouth config from CONFIG (landscape values) or portrait overrides
  if (isPortrait) {
    CONFIG.mouthWidthClosed  = CONFIG.portraitMouthWidthClosed;
    CONFIG.mouthWidthOpen    = CONFIG.portraitMouthWidthOpen;
    CONFIG.mouthHeightClosed = CONFIG.portraitMouthHeightClosed;
    CONFIG.mouthHeightOpen   = CONFIG.portraitMouthHeightOpen;
    CONFIG.singerSpacing     = CONFIG.portraitSingerSpacing;
  } else {
    CONFIG.mouthWidthClosed  = _LANDSCAPE_MOUTH.widthClosed;
    CONFIG.mouthWidthOpen    = _LANDSCAPE_MOUTH.widthOpen;
    CONFIG.mouthHeightClosed = _LANDSCAPE_MOUTH.heightClosed;
    CONFIG.mouthHeightOpen   = _LANDSCAPE_MOUTH.heightOpen;
    CONFIG.singerSpacing     = _LANDSCAPE_MOUTH.spacing;
  }

  // Rebuild SVG mouths on orientation change
  if (orientation !== _currentOrientation) {
    _currentOrientation = orientation;
    buildChoir(ROW_CONFIGS[orientation]);
  }

  // Row Y positions as fraction of vbH — from design mockups
  const rowFractions = isPortrait
    ? [0.266, 0.333, 0.401, 0.468]
    : [0.260, 0.347, 0.435, 0.524];

  for (let r = 0; r < app.rows.length; r++) {
    const newY = rowFractions[r] * vbH;
    for (const mouth of app.rows[r].mouths) {
      mouth.el.setAttribute('cy', newY);
      mouth.el.setAttribute('rx', CONFIG.mouthWidthClosed);
      mouth.el.setAttribute('ry', CONFIG.mouthHeightClosed);
    }
  }

  // Conductor — all sizes from CONFIG in physical pixels, converted to SVG units
  const headR  = CONFIG.conductorHeadPx    / scale;
  const armR   = CONFIG.conductorArmPx     / scale;
  const pathRx = CONFIG.conductorPathRxPx  / scale;
  const pathRy = CONFIG.conductorPathRyPx  / scale;

  app.conductorHeadR = headR;
  app.conductorArmR  = armR;
  app.dots.single.setAttribute('r', headR);
  app.dots.a.setAttribute('r', armR);
  app.dots.b.setAttribute('r', armR);

  const cx = vbW / 2;
  const cy = vbH * (isPortrait ? 0.793 : 0.822);
  CONFIG.dotCenterX = cx;
  CONFIG.dotCenterY = cy;

  const d = `M ${cx} ${cy} ` +
    `C ${cx} ${cy - pathRy}, ${cx + pathRx} ${cy - pathRy}, ${cx + pathRx} ${cy} ` +
    `C ${cx + pathRx} ${cy + pathRy}, ${cx} ${cy + pathRy}, ${cx} ${cy} ` +
    `C ${cx} ${cy - pathRy}, ${cx - pathRx} ${cy - pathRy}, ${cx - pathRx} ${cy} ` +
    `C ${cx - pathRx} ${cy + pathRy}, ${cx} ${cy + pathRy}, ${cx} ${cy} Z`;
  app.conductorPath.setAttribute('d', d);
  app.conductorLength = app.conductorPath.getTotalLength();

  const hitEl = document.getElementById('dot-hit');
  hitEl.setAttribute('cx', cx);
  hitEl.setAttribute('cy', cy);
  hitEl.setAttribute('r', headR * 1.4);

  setDotPosition(app.dots.single, cx, cy);

  // Size and position the play/pause icons
  const ir = headR * 0.48;  // icon inner radius
  const playEl = document.getElementById('conductor-play');
  playEl.setAttribute('d',
    `M ${cx - ir * 0.42} ${cy - ir * 0.82} ` +
    `L ${cx + ir * 0.72} ${cy} ` +
    `L ${cx - ir * 0.42} ${cy + ir * 0.82} Z`
  );

  const bw = ir * 0.38;
  const bh = ir * 1.55;
  const bg = ir * 0.36;
  const by = cy - bh / 2;
  const plEl = document.getElementById('pause-bar-l');
  const prEl = document.getElementById('pause-bar-r');
  plEl.setAttribute('x',      cx - bg / 2 - bw); plEl.setAttribute('y', by);
  plEl.setAttribute('width',  bw);                plEl.setAttribute('height', bh);
  prEl.setAttribute('x',      cx + bg / 2);       prEl.setAttribute('y', by);
  prEl.setAttribute('width',  bw);                prEl.setAttribute('height', bh);
}

// -------------------- DOM/SVG setup --------------------

function refreshLiveMouthMotion() {
  for (const mouth of app.mouths) {
    mouth.lagFrames = Math.floor(rng() * (CONFIG.maxRippleDelayFrames + 1));
    mouth.noiseFreqA = CONFIG.idleWobbleSpeed1 + rng() * CONFIG.idleWobbleSpeed1Jitter;
    mouth.noiseFreqB = CONFIG.idleWobbleSpeed2 + rng() * CONFIG.idleWobbleSpeed2Jitter;
    mouth.strainFreq = CONFIG.strainWobbleSpeed + rng() * CONFIG.strainWobbleSpeedJitter;
    mouth.openResponseMs = CONFIG.mouthOpenResponseMs + rng() * CONFIG.mouthOpenResponseJitterMs;
    mouth.closeResponseMs = CONFIG.mouthCloseResponseMs + rng() * CONFIG.mouthCloseResponseJitterMs;
  }
}

function buildChoir(rowConfigs) {
  for (const cfg of rowConfigs) {
    const el = document.getElementById(cfg.elementId);
    while (el.firstChild) el.removeChild(el.firstChild);
  }
  app.rows = [];
  app.mouths = [];

  for (const cfg of rowConfigs) {
    const rowEl = document.getElementById(cfg.elementId);
    const totalSpan = (cfg.count - 1) * CONFIG.singerSpacing;
    const startX = 500 - totalSpan / 2;

    const mouthsInRow = [];
    for (let i = 0; i < cfg.count; i++) {
      const ellipse = document.createElementNS(SVG_NS, 'ellipse');
      ellipse.setAttribute('cx', startX + i * CONFIG.singerSpacing);
      ellipse.setAttribute('cy', 0);
      ellipse.setAttribute('rx', CONFIG.mouthWidthClosed);
      ellipse.setAttribute('ry', CONFIG.mouthHeightClosed);
      ellipse.classList.add('mouth');
      rowEl.appendChild(ellipse);

      const mouth = {
        el: ellipse,
        rowId: cfg.id,
        index: i,
        lagFrames: Math.floor(rng() * (CONFIG.maxRippleDelayFrames + 1)),
        noisePhaseA: rng() * Math.PI * 2,
        noisePhaseB: rng() * Math.PI * 2,
        noiseFreqA: CONFIG.idleWobbleSpeed1 + rng() * CONFIG.idleWobbleSpeed1Jitter,
        noiseFreqB: CONFIG.idleWobbleSpeed2 + rng() * CONFIG.idleWobbleSpeed2Jitter,
        strainFreq: CONFIG.strainWobbleSpeed + rng() * CONFIG.strainWobbleSpeedJitter,
        current: 0,
        openResponseMs:  CONFIG.mouthOpenResponseMs  + rng() * CONFIG.mouthOpenResponseJitterMs,
        closeResponseMs: CONFIG.mouthCloseResponseMs + rng() * CONFIG.mouthCloseResponseJitterMs,
      };
      mouthsInRow.push(mouth);
      app.mouths.push(mouth);
    }

    app.rows.push({
      id: cfg.id,
      band: cfg.band,
      mouths: mouthsInRow,
      history: new Float32Array(30),
      historyIdx: 0,
      latestRawLevel: 0,
      latestAmp: 0,
    });
  }
}

function cacheElements() {
  app.dots.single = document.getElementById('dot-single');
  app.dots.a = document.getElementById('dot-a');
  app.dots.b = document.getElementById('dot-b');
  app.songTitleEl = document.getElementById('song-title');

  const pathEl = document.getElementById('conductor-path');
  app.conductorPath = pathEl;
  app.conductorLength = pathEl.getTotalLength();
}

function wireInputs() {
  app.dots.single.addEventListener('click', onDotClick);
  document.getElementById('dot-hit').addEventListener('click', onDotClick);

  document.getElementById('shuffle-btn').addEventListener('click', onShuffle);
  document.getElementById('upload-btn').addEventListener('click', () => {
    document.getElementById('upload-input').click();
  });
  document.getElementById('upload-input').addEventListener('change', onUpload);
}

// -------------------- Audio pipeline --------------------

function ensureAudioGraph() {
  if (app.audioCtx) return;
  const AC = window.AudioContext || window.webkitAudioContext;
  app.audioCtx = new AC();
  app.analyser = app.audioCtx.createAnalyser();
  app.analyser.fftSize = 2048;
  app.analyser.smoothingTimeConstant = CONFIG.fftSmoothing;
  app.freqData = new Uint8Array(app.analyser.frequencyBinCount);

  app.gain = app.audioCtx.createGain();
  app.gain.gain.value = 1;

  app.source = app.audioCtx.createMediaElementSource(app.audio);
  app.source.connect(app.analyser);
  app.analyser.connect(app.gain);
  app.gain.connect(app.audioCtx.destination);
}

async function startPlayback() {
  ensureAudioGraph();
  if (app.audioCtx.state === 'suspended') {
    try { await app.audioCtx.resume(); } catch (_) {}
  }
  if (app.gain) app.gain.gain.cancelScheduledValues(app.audioCtx.currentTime);
  if (app.gain) app.gain.gain.setValueAtTime(1, app.audioCtx.currentTime);

  if (!app.currentSong) return;
  try {
    app.audio.src = app.currentSong.url;
    await app.audio.play();
    showSongTitle(app.currentSong);
    enterState(State.PLAYING);
  } catch (err) {
    console.warn('Playback failed for', app.currentSong, err);
    skipToNextSong();
  }
}

function fadeAudioOut(ms = CONFIG.audioFadeMs) {
  return new Promise((resolve) => {
    if (!app.audioCtx || !app.gain) {
      try { app.audio.pause(); } catch (_) {}
      resolve();
      return;
    }
    const now = app.audioCtx.currentTime;
    app.gain.gain.cancelScheduledValues(now);
    app.gain.gain.setValueAtTime(app.gain.gain.value, now);
    app.gain.gain.linearRampToValueAtTime(0.0001, now + ms / 1000);
    setTimeout(() => {
      try { app.audio.pause(); } catch (_) {}
      resolve();
    }, ms + 10);
  });
}

function onAudioError(e) {
  console.warn('audio error', e);
  if (app.state === State.PLAYING) {
    skipToNextSong();
  }
}

function skipToNextSong() {
  if (app.songs.length === 0) {
    enterState(State.IDLE);
    return;
  }
  app.failureStreak++;
  if (app.failureStreak >= app.songs.length) {
    app.failureStreak = 0;
    enterState(State.IDLE);
    return;
  }
  pickRandomSong();
  startPlayback();
}

function pickRandomSong() {
  if (app.songs.length === 0) { app.currentSong = null; return; }
  let pick;
  if (app.songs.length === 1) {
    pick = app.songs[0];
  } else {
    do {
      pick = app.songs[Math.floor(Math.random() * app.songs.length)];
    } while (app.currentSong && pick.url === app.currentSong.url);
  }
  app.currentSong = pick;
}

// -------------------- Conductor icon --------------------

function updateConductorIcon() {
  const showPlay = app.state !== State.PLAYING || app.paused;
  document.getElementById('conductor-play').classList.toggle('hidden', !showPlay);
  document.getElementById('conductor-pause').classList.toggle('hidden', showPlay);
}

// -------------------- State transitions --------------------

function enterState(next) {
  app.state = next;
  app.stateEnteredAt = performance.now();

  if (next === State.IDLE) {
    app.dots.single.classList.remove('conducting');
    app.dots.a.classList.add('hidden');
    app.dots.b.classList.add('hidden');
    setDotPosition(app.dots.single, CONFIG.dotCenterX, CONFIG.dotCenterY);
    app.dots.single.setAttribute('r', app.conductorHeadR);
    app.paused = false;
    app.conductorPhaseOffset = 0;
  } else if (next === State.PLAYING) {
    app.dots.single.classList.add('conducting');
    app.dots.a.classList.remove('hidden');
    app.dots.b.classList.remove('hidden');
    app.paused = false;
    app.resumeTime = performance.now();
  } else if (next === State.ENDING) {
    app.dots.single.classList.remove('conducting');
    app.paused = false;
  }

  updateConductorIcon();
}

// -------------------- Event handlers --------------------

async function onDotClick() {
  if (app.state === State.IDLE) {
    if (!app.currentSong && app.songs.length > 0) pickRandomSong();
    if (!app.currentSong) return;
    startPlayback();
  } else if (app.state === State.PLAYING) {
    togglePause();
  }
}

async function togglePause() {
  const now = performance.now();
  if (!app.paused) {
    app.paused = true;
    app.pauseStartTime = now;
    app.pausedDotA.x = parseFloat(app.dots.a.getAttribute('cx')) || CONFIG.dotCenterX;
    app.pausedDotA.y = parseFloat(app.dots.a.getAttribute('cy')) || CONFIG.dotCenterY;
    app.pausedDotB.x = parseFloat(app.dots.b.getAttribute('cx')) || CONFIG.dotCenterX;
    app.pausedDotB.y = parseFloat(app.dots.b.getAttribute('cy')) || CONFIG.dotCenterY;
    app.audio.pause();
  } else {
    app.conductorPhaseOffset += now - app.pauseStartTime;
    app.resumeTime = now;
    app.paused = false;
    if (app.audioCtx && app.audioCtx.state === 'suspended') {
      await app.audioCtx.resume();
    }
    await app.audio.play().catch(err => console.warn('resume failed', err));
  }
  updateConductorIcon();
}

async function onShuffle() {
  if (app.songs.length === 0) return;
  const wasPlaying = app.state === State.PLAYING;
  if (wasPlaying) await fadeAudioOut();
  pickRandomSong();
  showSongTitle(app.currentSong);
  if (wasPlaying) enterState(State.ENDING);
}

async function onUpload(ev) {
  const file = ev.target.files && ev.target.files[0];
  ev.target.value = '';
  if (!file) return;
  if (!file.type.startsWith('audio/')) {
    flashIcon('upload-btn');
    return;
  }
  const wasPlaying = app.state === State.PLAYING;
  if (wasPlaying) await fadeAudioOut();
  const url = URL.createObjectURL(file);
  app.currentSong = {
    title: file.name.replace(/\.[^.]+$/, ''),
    composer: '',
    url,
    bpm: 80,
    isUpload: true,
  };
  showSongTitle(app.currentSong);
  if (wasPlaying) enterState(State.ENDING);
}

function flashIcon(id) {
  const el = document.getElementById(id);
  el.classList.remove('flash-reject');
  void el.offsetWidth;
  el.classList.add('flash-reject');
}

function onSongEnded() {
  if (app.state !== State.PLAYING) return;
  enterState(State.ENDING);
}

// -------------------- Title --------------------

function showSongTitle(song) {
  if (!song) return;
  const el = app.songTitleEl;
  const label = song.composer
    ? `<em>${escapeHtml(song.title)}</em> — ${escapeHtml(song.composer)}`
    : `<em>${escapeHtml(song.title)}</em>`;
  el.innerHTML = label;
  el.classList.add('visible');
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

// -------------------- Animation --------------------

function tick(time) {
  const dt = Math.min(50, time - (app.lastRafTime || time));
  app.lastRafTime = time;

  if (app.state === State.PLAYING || app.state === State.ENDING) {
    updateBandAmplitudes();
  }

  updateMouths(time, dt);
  updateConductor(time);
  drawVisualizerCanvases();

  if (app.state === State.ENDING) {
    const elapsed = time - app.stateEnteredAt;
    if (elapsed >= CONFIG.endingSettleMs) {
      enterState(State.IDLE);
    }
  }

  requestAnimationFrame(tick);
}

function updateBandAmplitudes() {
  if (!app.analyser) return;
  app.analyser.getByteFrequencyData(app.freqData);
  const nyquist = app.audioCtx.sampleRate / 2;
  const binCount = app.freqData.length;

  for (const row of app.rows) {
    const b = CONFIG[BAND_KEYS[row.band]];
    const minBin = Math.max(0, Math.floor(b.min / nyquist * binCount));
    const maxBin = Math.min(binCount - 1, Math.ceil(b.max / nyquist * binCount));
    let sum = 0;
    let count = 0;
    for (let i = minBin; i <= maxBin; i++) {
      sum += app.freqData[i];
      count++;
    }
    const avg = count > 0 ? (sum / count) / 255 : 0;
    const tuning = CONFIG.bandTuning[row.band];
    const raw = Math.min(1, Math.pow(avg, CONFIG.loudnessCurve) * tuning.inputBoost);
    // Remap so minOpenLevel = silent (0) and fullOpenLevel = fully open (1)
    const shaped = Math.min(1, Math.max(0, (raw - tuning.minOpenLevel) / (tuning.fullOpenLevel - tuning.minOpenLevel)));
    row.latestRawLevel = raw;
    row.latestAmp = shaped;
    row.historyIdx = (row.historyIdx + 1) % row.history.length;
    row.history[row.historyIdx] = shaped;
  }
}

function getLaggedAmp(row, lagFrames) {
  const idx = (row.historyIdx - lagFrames + row.history.length) % row.history.length;
  return row.history[idx];
}

function updateMouths(time, dt) {
  // Smooth closing during ENDING so mouths settle to dashes
  const ending = app.state === State.ENDING;
  const idle = app.state === State.IDLE || app.state === State.LOADING;

  for (const row of app.rows) {
    for (const mouth of row.mouths) {
      let target;
      if (idle) {
        target = 0;
      } else {
        const bandAmp = getLaggedAmp(row, mouth.lagFrames);
        const noise = Math.sin(time * mouth.noiseFreqA + mouth.noisePhaseA) * CONFIG.idleWobbleAmount1
                    + Math.sin(time * mouth.noiseFreqB + mouth.noisePhaseB) * CONFIG.idleWobbleAmount2;
        // Strain shimmer: fast vibration that grows when amplitude exceeds per-part threshold
        const strainThr = CONFIG.bandTuning[row.band].strainStartLevel;
        const strainFactor = Math.max(0, (bandAmp - strainThr) / (1 - strainThr));
        const strain = Math.sin(time * mouth.strainFreq + mouth.noisePhaseA * 3.7)
                     * CONFIG.strainWobbleAmount * strainFactor;
        target = Math.max(0, Math.min(1.1, bandAmp * (1 + noise + strain)));
        if (ending) {
          const fadeT = Math.min(1, (time - app.stateEnteredAt) / CONFIG.endingSettleMs);
          target *= (1 - fadeT);
        }
      }

      const diff = target - mouth.current;
      const responseMs = diff > 0 ? mouth.openResponseMs : mouth.closeResponseMs;
      const rate = 1 - Math.exp(-dt / responseMs);
      mouth.current += diff * rate;

      const a = Math.max(0, Math.min(1, mouth.current));
      const ry = CONFIG.mouthHeightClosed + (CONFIG.mouthHeightOpen - CONFIG.mouthHeightClosed) * a;
      const rx = CONFIG.mouthWidthClosed - (CONFIG.mouthWidthClosed - CONFIG.mouthWidthOpen) * a;
      mouth.el.setAttribute('ry', ry.toFixed(2));
      mouth.el.setAttribute('rx', rx.toFixed(2));
    }
  }
}

function updateConductor(time) {
  const { single, a, b } = app.dots;

  if (app.state === State.IDLE || app.state === State.LOADING) {
    // Single dot, CSS breathe animation does the work
    return;
  }

  if (app.state === State.PLAYING) {
    const bpm = (app.currentSong && app.currentSong.bpm) || 80;
    const beatMs = 60000 / bpm;
    const cycleMs = beatMs * CONFIG.conductorBeatsPerCycle;
    const cx = CONFIG.dotCenterX;
    const cy = CONFIG.dotCenterY;

    if (app.paused) {
      // Hands retract toward head over retractDurationMs
      const retractT = Math.min(1, (time - app.pauseStartTime) / CONFIG.retractDurationMs);
      const retractEased = easeInOutCubic(retractT);
      const ax = app.pausedDotA.x + (cx - app.pausedDotA.x) * retractEased;
      const ay = app.pausedDotA.y + (cy - app.pausedDotA.y) * retractEased;
      const bx = app.pausedDotB.x + (cx - app.pausedDotB.x) * retractEased;
      const by = app.pausedDotB.y + (cy - app.pausedDotB.y) * retractEased;
      setDotPosition(a, ax, ay);
      setDotPosition(b, bx, by);
    } else {
      // Phase time excludes time spent paused
      const phaseTime = time - app.conductorPhaseOffset;
      const baseT = (phaseTime % cycleMs) / cycleMs;
      const tA = pathEased(baseT);
      const tB = pathEased((baseT + 0.5) % 1);
      const ptA = app.conductorPath.getPointAtLength(app.conductorLength * tA);
      const ptB = app.conductorPath.getPointAtLength(app.conductorLength * tB);

      // Emerge from center: split on first play, re-emerge after pause
      const emergeOrigin = time - app.resumeTime;
      const emergeT = Math.min(1, emergeOrigin / CONFIG.retractDurationMs);
      const emerge = emergeT < 1 ? easeOutElastic(emergeT) : 1;

      setDotPosition(a, cx + (ptA.x - cx) * emerge, cy + (ptA.y - cy) * emerge);
      setDotPosition(b, cx + (ptB.x - cx) * emerge, cy + (ptB.y - cy) * emerge);
    }
  }

  if (app.state === State.ENDING) {
    const sinceEnd = time - app.stateEnteredAt;
    const t = Math.min(1, sinceEnd / CONFIG.mergeDurationMs);
    const eased = easeInOutCubic(t);
    const ax = parseFloat(a.getAttribute('data-x') || CONFIG.dotCenterX);
    const ay = parseFloat(a.getAttribute('data-y') || CONFIG.dotCenterY);
    const bx = parseFloat(b.getAttribute('data-x') || CONFIG.dotCenterX);
    const by = parseFloat(b.getAttribute('data-y') || CONFIG.dotCenterY);
    const targetX = CONFIG.dotCenterX;
    const targetY = CONFIG.dotCenterY;

    a.setAttribute('cx', ax + (targetX - ax) * eased);
    a.setAttribute('cy', ay + (targetY - ay) * eased);
    b.setAttribute('cx', bx + (targetX - bx) * eased);
    b.setAttribute('cy', by + (targetY - by) * eased);

    if (t >= 1) {
      app.dots.a.classList.add('hidden');
      app.dots.b.classList.add('hidden');
    }
  }
}

function setDotPosition(el, x, y) {
  el.setAttribute('cx', x);
  el.setAttribute('cy', y);
  el.setAttribute('data-x', x);
  el.setAttribute('data-y', y);
}

// -------------------- Easing --------------------

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function easeOutElastic(t) {
  if (t === 0) return 0;
  if (t === 1) return 1;
  const c = (2 * Math.PI) / 3;
  return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c) + 1;
}

function pathEased(t) {
  // Piecewise ease-in-out per beat: slower at the extremities of each beat.
  const beats = CONFIG.conductorBeatsPerCycle;
  const scaled = t * beats;
  const beatIdx = Math.floor(scaled);
  const beatT = scaled - beatIdx;
  const easedBeatT = (1 - Math.cos(beatT * Math.PI)) / 2;
  return ((beatIdx + easedBeatT) / beats) % 1;
}

function setPanelsVisible(visible) {
  const debugPanel = document.getElementById('debug-panel');
  const vizPanel = document.getElementById('viz-panel');
  if (debugPanel) debugPanel.style.display = visible ? 'block' : 'none';
  if (vizPanel) vizPanel.style.display = visible ? 'block' : 'none';
}

function togglePanels() {
  const debugPanel = document.getElementById('debug-panel');
  const vizPanel = document.getElementById('viz-panel');
  const isOpen = (debugPanel && debugPanel.style.display !== 'none')
    || (vizPanel && vizPanel.style.display !== 'none');
  setPanelsVisible(!isOpen);
}

// -------------------- Visualizer panel --------------------

const VIZ_BANDS  = ['soprano', 'alto', 'tenor', 'bass'];
const VIZ_COLORS = { soprano: '#f06090', alto: '#f0a030', tenor: '#30c080', bass: '#4090f0' };
const VIZ_LABELS = { soprano: 'Soprano',  alto: 'Alto',    tenor: 'Tenor',   bass: 'Bass'   };
const VIZ_FREQ_WINDOW = { min: 50, max: 2200 };

// Sliders exposed per-part in the viz panel
const VIZ_SLIDERS = [
  // label,     key,               min,  max,  step
  ['Open At',       'minOpenLevel',   0,    0.5,  0.01],
  ['Fully Open',    'fullOpenLevel',  0.2,  1.5,  0.01],
  ['Boost',         'inputBoost',     0.3,  6,    0.1 ],
  ['Strain Starts', 'strainStartLevel', 0,  1,    0.01],
];

const VIZ_BAND_SLIDERS = [
  ['Min', 'min', VIZ_FREQ_WINDOW.min, VIZ_FREQ_WINDOW.max, 10],
  ['Max', 'max', VIZ_FREQ_WINDOW.min, VIZ_FREQ_WINDOW.max, 10],
];

function formatVizValue(key, value) {
  return key === 'min' || key === 'max'
    ? `${Math.round(value)} Hz`
    : value.toFixed(2);
}

function syncVizCanvasSize(canvas) {
  const cssWidth = Math.max(180, Math.round(canvas.clientWidth || 248));
  const cssHeight = window.innerWidth <= 820 ? 84 : 70;
  const pixelRatio = window.devicePixelRatio || 1;
  const targetWidth = Math.round(cssWidth * pixelRatio);
  const targetHeight = Math.round(cssHeight * pixelRatio);

  if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
    canvas.width = targetWidth;
    canvas.height = targetHeight;
  }

  canvas.style.width = '100%';
  canvas.style.height = `${cssHeight}px`;
}

function createVizSliderRow({ label, value, min, max, step, color, valueKey, onInput }) {
  const row = document.createElement('div');
  row.style.cssText = 'margin-bottom:3px';

  const valSpan = document.createElement('span');
  valSpan.style.cssText = `float:right;color:${color};min-width:48px;text-align:right`;
  valSpan.textContent = formatVizValue(valueKey, value);

  const labelEl = document.createElement('div');
  labelEl.style.cssText = 'font-size:10px;margin-bottom:1px';
  labelEl.textContent = label;
  labelEl.appendChild(valSpan);

  const slider = document.createElement('input');
  slider.type  = 'range';
  slider.min   = min;
  slider.max   = max;
  slider.step  = step;
  slider.value = value;
  slider.style.cssText = `width:100%;accent-color:${color};cursor:pointer`;
  slider.addEventListener('input', () => {
    onInput(parseFloat(slider.value), { slider, valSpan });
  });

  row.appendChild(labelEl);
  row.appendChild(slider);

  return { row, slider, valSpan };
}

function buildVisualizerPanel() {
  const sectionsDiv = document.getElementById('viz-sections');

  for (const band of VIZ_BANDS) {
    const color = VIZ_COLORS[band];
    const tuning = CONFIG.bandTuning[band];
    const bandCfg = CONFIG[BAND_KEYS[band]];

    const section = document.createElement('div');
    section.style.cssText = 'margin-bottom:12px;padding-bottom:10px;border-bottom:1px solid #222';

    const lbl = document.createElement('div');
    lbl.style.cssText = `color:${color};font-size:11px;font-weight:bold;letter-spacing:1px;margin-bottom:4px;text-transform:uppercase`;
    lbl.textContent = VIZ_LABELS[band];
    section.appendChild(lbl);

    const cvs = document.createElement('canvas');
    cvs.id = `viz-cvs-${band}`;
    cvs.width  = 248;
    cvs.height = 70;
    cvs.style.cssText = 'width:100%;height:70px;display:block;margin-bottom:6px;border-radius:6px';
    section.appendChild(cvs);

    for (const [sliderLabel, key, min, max, step] of VIZ_SLIDERS) {
      const { row } = createVizSliderRow({
        label: sliderLabel,
        value: tuning[key],
        min,
        max,
        step,
        color,
        valueKey: key,
        onInput: (nextValue, { valSpan }) => {
          tuning[key] = nextValue;
          valSpan.textContent = formatVizValue(key, nextValue);
        },
      });
      section.appendChild(row);
    }

    const bandSliderRefs = {};
    for (const [sliderLabel, key, min, max, step] of VIZ_BAND_SLIDERS) {
      const { row, slider, valSpan } = createVizSliderRow({
        label: sliderLabel,
        value: bandCfg[key],
        min,
        max,
        step,
        color,
        valueKey: key,
        onInput: (nextValue) => {
          bandCfg[key] = nextValue;

          if (bandCfg.min > bandCfg.max) {
            if (key === 'min') {
              bandCfg.max = nextValue;
            } else {
              bandCfg.min = nextValue;
            }
          }

          for (const sliderKey of ['min', 'max']) {
            const ref = bandSliderRefs[sliderKey];
            if (!ref) continue;
            ref.slider.value = bandCfg[sliderKey];
            ref.valSpan.textContent = formatVizValue(sliderKey, bandCfg[sliderKey]);
          }
        },
      });

      bandSliderRefs[key] = { slider, valSpan };
      section.appendChild(row);
    }

    sectionsDiv.appendChild(section);
  }

  const panel = document.getElementById('viz-panel');
  document.getElementById('viz-close').addEventListener('click', () => {
    setPanelsVisible(false);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'v' && !e.ctrlKey && !e.metaKey && !e.altKey) {
      togglePanels();
    }
  });
}

function drawVisualizerCanvases() {
  const panel = document.getElementById('viz-panel');
  if (!panel || panel.style.display === 'none') return;

  // Frequency window to display across all canvases (Hz)
  const FREQ_MIN = VIZ_FREQ_WINDOW.min;
  const FREQ_MAX = VIZ_FREQ_WINDOW.max;

  for (const band of VIZ_BANDS) {
    const cvs = document.getElementById(`viz-cvs-${band}`);
    if (!cvs) continue;
    syncVizCanvasSize(cvs);
    const ctx   = cvs.getContext('2d');
    const W     = cvs.width;
    const H     = cvs.height;
    const color = VIZ_COLORS[band];
    const tuning = CONFIG.bandTuning[band];

    ctx.fillStyle = '#0e0e0e';
    ctx.fillRect(0, 0, W, H);

    if (!app.freqData || !app.audioCtx) continue;

    const nyquist  = app.audioCtx.sampleRate / 2;
    const binCount = app.freqData.length;

    const globalMin = Math.max(0, Math.floor(FREQ_MIN / nyquist * binCount));
    const globalMax = Math.min(binCount - 1, Math.ceil(FREQ_MAX / nyquist * binCount));
    const numBins   = globalMax - globalMin + 1;

    const bandCfg   = CONFIG[BAND_KEYS[band]];
    const bandMinBin = Math.floor(bandCfg.min / nyquist * binCount);
    const bandMaxBin = Math.ceil(bandCfg.max  / nyquist * binCount);

    const row = app.rows.find(r => r.band === band);
    const rawLevel = row ? row.latestRawLevel : 0;

    // Layout: FFT spectrum on left, amplitude meter on right
    const FFT_W   = W - 42;
    const METER_X = FFT_W + 4;
    const METER_W = W - METER_X;

    // FFT bars
    const barW = FFT_W / numBins;
    for (let i = 0; i < numBins; i++) {
      const binIdx = globalMin + i;
      const v      = app.freqData[binIdx] / 255;
      const barH   = Math.max(1, v * H);
      const inBand = binIdx >= bandMinBin && binIdx <= bandMaxBin;
      ctx.fillStyle = inBand ? color : '#252525';
      ctx.fillRect(i * barW, H - barH, Math.max(1, barW - 0.5), barH);
    }

    // Amplitude meter background
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(METER_X, 0, METER_W, H);

    // Use raw loudness here so the fill lines up with Open At / Fully Open guides.
    const floorLevel = Math.max(0, Math.min(1, tuning.minOpenLevel));
    const ceilingLevel = Math.max(0, Math.min(1, tuning.fullOpenLevel));
    const strainRawLevel = Math.max(
      0,
      Math.min(1, tuning.minOpenLevel + tuning.strainStartLevel * (tuning.fullOpenLevel - tuning.minOpenLevel))
    );

    // Amplitude fill — goes red when strained
    const ampH = rawLevel * H;
    ctx.fillStyle = rawLevel > strainRawLevel ? '#f84040' : color;
    ctx.fillRect(METER_X, H - ampH, METER_W, ampH);

    // Open At line
    const floorY = Math.round(H - floorLevel * H);
    ctx.save();
    ctx.strokeStyle = 'rgba(120, 220, 255, 0.8)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 2]);
    ctx.beginPath();
    ctx.moveTo(0, floorY);
    ctx.lineTo(W, floorY);
    ctx.stroke();
    ctx.restore();

    // Fully Open line
    const ceilingY = Math.round(H - ceilingLevel * H);
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.lineWidth = 1;
    ctx.setLineDash([6, 2]);
    ctx.beginPath();
    ctx.moveTo(0, ceilingY);
    ctx.lineTo(W, ceilingY);
    ctx.stroke();
    ctx.restore();

    // Strain threshold dashed line
    const strainY = Math.round(H - strainRawLevel * H);
    ctx.save();
    ctx.strokeStyle = 'rgba(255,240,80,0.75)';
    ctx.lineWidth   = 1;
    ctx.setLineDash([2, 2]);
    ctx.beginPath();
    ctx.moveTo(0, strainY);
    ctx.lineTo(W, strainY);
    ctx.stroke();
    ctx.restore();
  }
}

// -------------------- Debug panel --------------------

const DEBUG_SLIDERS = [
  // label,              key,                  min,    max,    step
  ['Open mouth height',   'mouthHeightOpen',      5,      60,     0.5   ],
  ['Closed mouth width',  'mouthWidthClosed',     4,      30,     0.5   ],
  ['Open mouth width',    'mouthWidthOpen',       4,      30,     0.5   ],
  ['Singer spacing',      'singerSpacing',        40,     150,    1     ],
  ['Row ripple delay',    'maxRippleDelayFrames', 0,      8,      1     ],
  ['Open response ms',    'mouthOpenResponseMs',  5,      80,     1     ],
  ['Open response jitter','mouthOpenResponseJitterMs', 0,  20,     1     ],
  ['Close response ms',   'mouthCloseResponseMs', 20,     300,    1     ],
  ['Close response jitter','mouthCloseResponseJitterMs', 0, 80,    1     ],
  ['Loudness curve',      'loudnessCurve',        0.5,    5,      0.1   ],
  ['Idle wobble 1',       'idleWobbleAmount1',    0,      0.3,    0.01  ],
  ['Idle wobble 2',       'idleWobbleAmount2',    0,      0.2,    0.01  ],
  ['Strain wobble',       'strainWobbleAmount',   0,      0.5,    0.01  ],
  ['Strain wobble speed', 'strainWobbleSpeed',    0.0001, 0.005,  0.0001],
  ['Strain speed jitter', 'strainWobbleSpeedJitter', 0,   0.003,  0.0001],
  ['FFT smoothing',       'fftSmoothing',         0,      0.99,   0.01  ],
];

const LIVE_MOUTH_MOTION_KEYS = new Set([
  'maxRippleDelayFrames',
  'mouthOpenResponseMs',
  'mouthOpenResponseJitterMs',
  'mouthCloseResponseMs',
  'mouthCloseResponseJitterMs',
  'idleWobbleSpeed1',
  'idleWobbleSpeed1Jitter',
  'idleWobbleSpeed2',
  'idleWobbleSpeed2Jitter',
  'strainWobbleSpeed',
  'strainWobbleSpeedJitter',
]);

function buildDebugPanel() {
  const container = document.getElementById('debug-sliders');

  for (const [label, key, min, max, step] of DEBUG_SLIDERS) {
    const row = document.createElement('div');
    row.style.cssText = 'margin-bottom:7px';

    const valSpan = document.createElement('span');
    valSpan.style.cssText = 'float:right;color:#ff9';
    valSpan.textContent = CONFIG[key];

    const lbl = document.createElement('div');
    lbl.style.cssText = 'margin-bottom:2px';
    lbl.textContent = label;
    lbl.appendChild(valSpan);

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = min;
    slider.max = max;
    slider.step = step;
    slider.value = CONFIG[key];
    slider.style.cssText = 'width:100%;accent-color:#ff9;cursor:pointer';

    slider.addEventListener('input', () => {
      const v = parseFloat(slider.value);
      CONFIG[key] = v;
      valSpan.textContent = v;
      // Propagate to live analyser if applicable
      if (key === 'fftSmoothing' && app.analyser) {
        app.analyser.smoothingTimeConstant = v;
      }
      if (LIVE_MOUTH_MOTION_KEYS.has(key)) {
        refreshLiveMouthMotion();
      }
    });

    row.appendChild(lbl);
    row.appendChild(slider);
    container.appendChild(row);
  }

  const panel = document.getElementById('debug-panel');
  document.getElementById('debug-toggle').addEventListener('click', () => {
    togglePanels();
  });
  document.getElementById('debug-close').addEventListener('click', () => {
    setPanelsVisible(false);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'd' && !e.ctrlKey && !e.metaKey && !e.altKey) {
      togglePanels();
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  buildVisualizerPanel();
  if (!CONFIG.debugPanel) {
    document.getElementById('debug-toggle').style.display = 'none';
    return;
  }
  buildDebugPanel();
});
