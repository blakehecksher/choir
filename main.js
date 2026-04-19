// Choir Visualizer
// See docs/spec/ for the source-of-truth spec.

// =====================================================================
// CONFIG — all tunable values live here
// =====================================================================
const CONFIG = {

  // --- Mouth shape — landscape (desktop) ---------------------------
  // mouthRx:       horizontal half-width of closed mouth ellipse (SVG units)
  mouthRx:       14,
  // mouthRxOpen:   horizontal half-width when fully open — smaller = rounder
  mouthRxOpen:   11,
  // mouthRyClosed: vertical half-height when closed — keep near 1 for dash look
  mouthRyClosed:  1,
  // mouthRyOpen:   vertical half-height at peak amplitude — bigger = wider gape
  mouthRyOpen:   28,
  // mouthSpacing:  center-to-center X distance between singer dots
  mouthSpacing:  80,

  // --- Mouth shape — portrait (phone) ------------------------------
  // Same parameters as above, scaled for the narrow portrait viewport.
  portraitMouthRx:       33,
  portraitMouthRxOpen:   26,
  portraitMouthRyClosed:  2,
  portraitMouthRyOpen:   100,
  portraitMouthSpacing: 180,

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
  // attackTauBase/Jitter:  exponential-smoothing time-constant (ms) for opening.
  //   Lower = snappier attack. Jitter randomises each singer slightly.
  attackTauBase:    18,
  attackTauJitter:  12,
  // releaseTauBase/Jitter: same for closing. Higher = slower decay.
  releaseTauBase:   110,
  releaseTauJitter:  50,

  // --- Per-mouth shimmer (idle noise) ------------------------------
  // lagFramesMax:       max frames a mouth can lag behind the band reading,
  //   creating a ripple effect across the row.
  lagFramesMax:    6,
  // noiseAmp / noiseAmp2: amplitude of two sine-based noise oscillators
  //   added to the mouth's target value — subtle organic movement at rest.
  noiseAmp:       0.06,
  noiseAmp2:      0.03,
  // noiseFreqA/BBase:   base oscillator frequency (radians/ms) — keep tiny.
  // noiseFreqA/BRange:  per-mouth random spread on top of the base frequency.
  noiseFreqABase: 0.0004,
  noiseFreqARange:0.0002,
  noiseFreqBBase: 0.0002,
  noiseFreqBRange:0.0001,

  // --- Strain shimmer (loud noise) ---------------------------------
  // Added on top of idle noise when amplitude is high — simulates vocal strain.
  // strainThreshold:  amplitude (0–1) below which strain shimmer is zero.
  strainThreshold: 0.55,
  // strainAmp:        max extra noise amplitude at full volume.
  strainAmp:       0.18,
  // strainFreqBase:   base frequency of the strain oscillator (radians/ms).
  //   Higher than idle noise = faster, more jittery vibration.
  strainFreqBase:  0.0018,
  // strainFreqRange:  per-mouth random spread on strain frequency.
  strainFreqRange: 0.0008,

  // --- Audio response -----------------------------------------------
  // ampCurve: power-law exponent applied to raw FFT average before scaling.
  //   Higher = quieter passages stay quiet, loud passages pop more.
  ampCurve: 2.0,
  // ampGain:  linear multiplier applied after the curve — boost overall sensitivity.
  ampGain:  2.2,
  // ampFloor: shaped amplitude below this is treated as silence (mouth stays closed).
  //   Raise to ignore soft background noise; lower to open mouths on quieter passages.
  ampFloor: 0.30,
  // ampCeiling: shaped amplitude at which the mouth reaches fully open (1.0 → target).
  //   Lower = mouth hits wide-open sooner; 0.7 means "loud but not max" = full open.
  ampCeiling: 1.0,
  // analyserSmoothing: Web Audio AnalyserNode smoothingTimeConstant (0–1).
  //   Higher = smoother but slower to react; 0.72 is a good mid-point.
  analyserSmoothing: 0.8,

  // --- Frequency bands (Hz) ----------------------------------------
  // Each band defines the Hz range averaged for that voice section.
  // Soprano extends high to capture overtones that choral sopranos project.
  // Bands intentionally overlap so adjacent rows move sympathetically.
  bandSoprano: { min: 300, max: 1400 },
  bandAlto:    { min: 220, max: 800  },
  bandTenor:   { min: 180, max: 600  },
  bandBass:    { min:  80, max: 500  },

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
  debugPanel: false,

  // --- Layout (set dynamically) ------------------------------------
  // These are overwritten every layout pass — do not hand-tune.
  dotCenterX:    500,
  dotCenterY:    430,

};

// Snapshot landscape mouth values so updateLayout can restore them
// when switching back from portrait. Captured once at load time.
const _LANDSCAPE_MOUTH = Object.freeze({
  rx:       CONFIG.mouthRx,
  rxOpen:   CONFIG.mouthRxOpen,
  ryClosed: CONFIG.mouthRyClosed,
  ryOpen:   CONFIG.mouthRyOpen,
  spacing:  CONFIG.mouthSpacing,
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
    CONFIG.mouthRx       = CONFIG.portraitMouthRx;
    CONFIG.mouthRxOpen   = CONFIG.portraitMouthRxOpen;
    CONFIG.mouthRyClosed = CONFIG.portraitMouthRyClosed;
    CONFIG.mouthRyOpen   = CONFIG.portraitMouthRyOpen;
    CONFIG.mouthSpacing  = CONFIG.portraitMouthSpacing;
  } else {
    CONFIG.mouthRx       = _LANDSCAPE_MOUTH.rx;
    CONFIG.mouthRxOpen   = _LANDSCAPE_MOUTH.rxOpen;
    CONFIG.mouthRyClosed = _LANDSCAPE_MOUTH.ryClosed;
    CONFIG.mouthRyOpen   = _LANDSCAPE_MOUTH.ryOpen;
    CONFIG.mouthSpacing  = _LANDSCAPE_MOUTH.spacing;
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
      mouth.el.setAttribute('rx', CONFIG.mouthRx);
      mouth.el.setAttribute('ry', CONFIG.mouthRyClosed);
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

function buildChoir(rowConfigs) {
  for (const cfg of rowConfigs) {
    const el = document.getElementById(cfg.elementId);
    while (el.firstChild) el.removeChild(el.firstChild);
  }
  app.rows = [];
  app.mouths = [];

  for (const cfg of rowConfigs) {
    const rowEl = document.getElementById(cfg.elementId);
    const totalSpan = (cfg.count - 1) * CONFIG.mouthSpacing;
    const startX = 500 - totalSpan / 2;

    const mouthsInRow = [];
    for (let i = 0; i < cfg.count; i++) {
      const ellipse = document.createElementNS(SVG_NS, 'ellipse');
      ellipse.setAttribute('cx', startX + i * CONFIG.mouthSpacing);
      ellipse.setAttribute('cy', 0);
      ellipse.setAttribute('rx', CONFIG.mouthRx);
      ellipse.setAttribute('ry', CONFIG.mouthRyClosed);
      ellipse.classList.add('mouth');
      rowEl.appendChild(ellipse);

      const mouth = {
        el: ellipse,
        rowId: cfg.id,
        index: i,
        lagFrames: Math.floor(rng() * CONFIG.lagFramesMax),
        noisePhaseA: rng() * Math.PI * 2,
        noisePhaseB: rng() * Math.PI * 2,
        noiseFreqA: CONFIG.noiseFreqABase + rng() * CONFIG.noiseFreqARange,
        noiseFreqB: CONFIG.noiseFreqBBase + rng() * CONFIG.noiseFreqBRange,
        strainFreq: CONFIG.strainFreqBase + rng() * CONFIG.strainFreqRange,
        current: 0,
        attackTau:  CONFIG.attackTauBase  + rng() * CONFIG.attackTauJitter,
        releaseTau: CONFIG.releaseTauBase + rng() * CONFIG.releaseTauJitter,
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
  app.analyser.smoothingTimeConstant = CONFIG.analyserSmoothing;
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
    const raw = Math.min(1, Math.pow(avg, CONFIG.ampCurve) * CONFIG.ampGain);
    // Remap so ampFloor = silent (0) and ampCeiling = fully open (1)
    const shaped = Math.min(1, Math.max(0, (raw - CONFIG.ampFloor) / (CONFIG.ampCeiling - CONFIG.ampFloor)));
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
        const noise = Math.sin(time * mouth.noiseFreqA + mouth.noisePhaseA) * CONFIG.noiseAmp
                    + Math.sin(time * mouth.noiseFreqB + mouth.noisePhaseB) * CONFIG.noiseAmp2;
        // Strain shimmer: fast vibration that grows when amplitude exceeds threshold
        const strainFactor = Math.max(0, (bandAmp - CONFIG.strainThreshold) / (1 - CONFIG.strainThreshold));
        const strain = Math.sin(time * mouth.strainFreq + mouth.noisePhaseA * 3.7)
                     * CONFIG.strainAmp * strainFactor;
        target = Math.max(0, Math.min(1.1, bandAmp * (1 + noise + strain)));
        if (ending) {
          const fadeT = Math.min(1, (time - app.stateEnteredAt) / CONFIG.endingSettleMs);
          target *= (1 - fadeT);
        }
      }

      const diff = target - mouth.current;
      const tau = diff > 0 ? mouth.attackTau : mouth.releaseTau;
      const rate = 1 - Math.exp(-dt / tau);
      mouth.current += diff * rate;

      const a = Math.max(0, Math.min(1, mouth.current));
      const ry = CONFIG.mouthRyClosed + (CONFIG.mouthRyOpen - CONFIG.mouthRyClosed) * a;
      const rx = CONFIG.mouthRx - (CONFIG.mouthRx - CONFIG.mouthRxOpen) * a;
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

// -------------------- Debug panel --------------------

const DEBUG_SLIDERS = [
  // label,              key,                  min,    max,    step
  ['Mouth ry open',      'mouthRyOpen',         5,      60,     0.5  ],
  ['Mouth rx closed',    'mouthRx',             4,      30,     0.5  ],
  ['Mouth rx open',      'mouthRxOpen',         4,      30,     0.5  ],
  ['Mouth spacing',      'mouthSpacing',        40,     150,    1    ],
  ['Attack tau',         'attackTauBase',       5,      80,     1    ],
  ['Release tau',        'releaseTauBase',      20,     300,    1    ],
  ['Amp curve',          'ampCurve',            0.5,    5,      0.1  ],
  ['Amp gain',           'ampGain',             0.5,    5,      0.1  ],
  ['Amp floor',          'ampFloor',            0,      0.4,    0.01 ],
  ['Amp ceiling',        'ampCeiling',          0.2,    1.5,    0.01 ],
  ['Noise amp',          'noiseAmp',            0,      0.3,    0.01 ],
  ['Strain threshold',   'strainThreshold',     0,      1,      0.01 ],
  ['Strain amp',         'strainAmp',           0,      0.5,    0.01 ],
  ['Strain freq base',   'strainFreqBase',      0.0001, 0.005,  0.0001],
  ['Analyser smoothing', 'analyserSmoothing',   0,      0.99,   0.01 ],
];

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
      if (key === 'analyserSmoothing' && app.analyser) {
        app.analyser.smoothingTimeConstant = v;
      }
    });

    row.appendChild(lbl);
    row.appendChild(slider);
    container.appendChild(row);
  }

  const panel = document.getElementById('debug-panel');
  document.getElementById('debug-toggle').addEventListener('click', () => {
    panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
  });
  document.getElementById('debug-close').addEventListener('click', () => {
    panel.style.display = 'none';
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'd' && !e.ctrlKey && !e.metaKey && !e.altKey) {
      panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  if (!CONFIG.debugPanel) {
    document.getElementById('debug-toggle').style.display = 'none';
    return;
  }
  buildDebugPanel();
});
