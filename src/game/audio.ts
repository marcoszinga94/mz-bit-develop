/**
 * Audio del juego, 100 % procedural con WebAudio (sin assets externos).
 *
 * - `sfx`: efectos cortos sintetizados (osciladores + ruido filtrado).
 * - `music`: secuenciador chiptune con bajo, arpegio, pad, batería y melodía.
 *
 * Nada de esto toca `window` al importarse, así que es seguro en SSR/tests.
 */

const MASTER_VOLUME = 0.72;
const MUSIC_VOLUME = 0.62;
const BPM = 96;
const STEPS_PER_BAR = 16;
const BARS = 8;
const TOTAL_STEPS = STEPS_PER_BAR * BARS;
const STEP_DURATION = 60 / BPM / 4;

type MusicNote = number | null;

let context: AudioContext | null = null;
let master: GainNode | null = null;
let sfxBus: GainNode | null = null;
let musicBus: GainNode | null = null;
let musicFilter: BiquadFilterNode | null = null;
let noiseBuffer: AudioBuffer | null = null;

let muted = false;
let musicMuted = false;
let musicIntensity = 0.4;
let musicDucked = false;
let musicPlaying = false;
let musicTimer: number | null = null;
let musicStep = 0;
let musicNextTime = 0;

let lastShoot = 0;
let lastHit = 0;
let lastSpawn = 0;
let lastEnemyHit = 0;

function now(): number {
  return typeof performance !== 'undefined' ? performance.now() : Date.now();
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function midiToFreq(note: number): number {
  return 440 * Math.pow(2, (note - 69) / 12);
}

function getNoiseBuffer(audio: AudioContext): AudioBuffer {
  if (noiseBuffer) return noiseBuffer;
  const length = Math.floor(audio.sampleRate * 1.2);
  const buffer = audio.createBuffer(1, length, audio.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
  noiseBuffer = buffer;
  return buffer;
}

export function unlockAudio(): void {
  if (typeof window === 'undefined') return;

  if (!context) {
    const AudioCtor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioCtor) return;

    context = new AudioCtor();

    const compressor = context.createDynamicsCompressor();
    compressor.threshold.value = -18;
    compressor.knee.value = 24;
    compressor.ratio.value = 4;
    compressor.attack.value = 0.004;
    compressor.release.value = 0.25;

    master = context.createGain();
    master.gain.value = muted ? 0.0001 : MASTER_VOLUME;
    master.connect(compressor);
    compressor.connect(context.destination);

    sfxBus = context.createGain();
    sfxBus.gain.value = 0.9;
    sfxBus.connect(master);

    musicBus = context.createGain();
    musicBus.gain.value = 0.0001;
    musicFilter = context.createBiquadFilter();
    musicFilter.type = 'lowpass';
    musicFilter.frequency.value = 5600;
    musicFilter.Q.value = 0.4;
    musicBus.connect(musicFilter);
    musicFilter.connect(master);

    if (musicPlaying) applyMusicGain(0.12);
  }

  if (context.state === 'suspended') void context.resume();
}

export function setMuted(value: boolean): void {
  muted = value;
  if (!context || !master) return;
  const target = muted ? 0.0001 : MASTER_VOLUME;
  master.gain.cancelScheduledValues(context.currentTime);
  master.gain.setTargetAtTime(target, context.currentTime, 0.035);
}

export function isMuted(): boolean {
  return muted;
}

export function setMusicMuted(value: boolean): void {
  musicMuted = value;
  applyMusicGain(0.12);
}

export function isMusicMuted(): boolean {
  return musicMuted;
}

function musicTargetGain(): number {
  if (musicMuted) return 0.0001;
  const duck = musicDucked ? 0.32 : 1;
  return Math.max(0.0001, MUSIC_VOLUME * duck);
}

function applyMusicGain(timeConstant = 0.2): void {
  if (!context || !musicBus) return;
  musicBus.gain.cancelScheduledValues(context.currentTime);
  musicBus.gain.setTargetAtTime(musicTargetGain(), context.currentTime, timeConstant);
}

/** Envuelve un oscilador con un envelope percusivo. */
function tone(
  frequency: number,
  duration: number,
  type: OscillatorType,
  gain: number,
  options: {
    slideTo?: number;
    delay?: number;
    bus?: GainNode | null;
    attack?: number;
    detune?: number;
  } = {},
): void {
  if (!context) return;
  const bus = options.bus ?? sfxBus;
  if (!bus) return;

  const start = context.currentTime + (options.delay ?? 0);
  const attack = options.attack ?? 0.012;
  const osc = context.createOscillator();
  const envelope = context.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(Math.max(20, frequency), start);
  if (options.slideTo) {
    osc.frequency.exponentialRampToValueAtTime(
      Math.max(20, options.slideTo),
      start + duration,
    );
  }
  if (options.detune) osc.detune.value = options.detune;

  envelope.gain.setValueAtTime(0.0001, start);
  envelope.gain.exponentialRampToValueAtTime(
    Math.max(0.0002, gain),
    start + Math.max(0.005, attack),
  );
  envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration);

  osc.connect(envelope);
  envelope.connect(bus);
  osc.start(start);
  osc.stop(start + duration + 0.04);
}

/** Golpe de ruido filtrado: impactos, platos, snares… */
function noise(
  duration: number,
  gain: number,
  options: {
    frequency?: number;
    type?: BiquadFilterType;
    q?: number;
    delay?: number;
    bus?: GainNode | null;
  } = {},
): void {
  if (!context) return;
  const bus = options.bus ?? sfxBus;
  if (!bus) return;

  const start = context.currentTime + (options.delay ?? 0);
  const source = context.createBufferSource();
  source.buffer = getNoiseBuffer(context);

  const filter = context.createBiquadFilter();
  filter.type = options.type ?? 'highpass';
  filter.frequency.value = options.frequency ?? 1400;
  filter.Q.value = options.q ?? 0.8;

  const envelope = context.createGain();
  envelope.gain.setValueAtTime(0.0001, start);
  envelope.gain.exponentialRampToValueAtTime(
    Math.max(0.0002, gain),
    start + Math.min(0.01, duration * 0.3),
  );
  envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration);

  source.connect(filter);
  filter.connect(envelope);
  envelope.connect(bus);
  source.start(start);
  source.stop(start + duration + 0.03);
}

export type EnemySfxKind = 'bug' | 'virus' | 'trojan';

export const sfx = {
  click(): void {
    tone(520, 0.05, 'triangle', 0.02);
  },
  hover(): void {
    tone(760, 0.03, 'sine', 0.008);
  },
  shoot(): void {
    const t = now();
    if (t - lastShoot < 55) return;
    lastShoot = t;
    tone(680, 0.06, 'square', 0.012, { slideTo: 340 });
    noise(0.03, 0.008, { frequency: 2600 });
  },
  hit(): void {
    const t = now();
    if (t - lastHit < 45) return;
    lastHit = t;
    tone(210, 0.06, 'triangle', 0.022, { slideTo: 120 });
    noise(0.045, 0.018, { frequency: 1700, q: 0.6 });
  },
  crit(): void {
    tone(880, 0.06, 'square', 0.014, { slideTo: 1320 });
    tone(1760, 0.1, 'sine', 0.012);
    noise(0.04, 0.012, { frequency: 4200 });
  },
  kill(): void {
    tone(392, 0.08, 'sine', 0.03, { slideTo: 523.25 });
    tone(659.25, 0.11, 'sine', 0.022, { delay: 0.045 });
    noise(0.16, 0.02, { frequency: 900, type: 'bandpass', q: 0.7 });
    noise(0.09, 0.012, { frequency: 3200, delay: 0.02 });
  },
  heroHit(): void {
    tone(140, 0.2, 'sawtooth', 0.045, { slideTo: 70 });
    noise(0.13, 0.03, { frequency: 700, type: 'lowpass' });
  },
  enemyAttack(kind: EnemySfxKind): void {
    const t = now();
    if (t - lastEnemyHit < 70) return;
    lastEnemyHit = t;

    if (kind === 'virus') {
      tone(1180, 0.08, 'triangle', 0.014, { slideTo: 1680 });
      noise(0.05, 0.008, { frequency: 3000 });
    } else if (kind === 'trojan') {
      tone(92, 0.2, 'sawtooth', 0.04, { slideTo: 46 });
      noise(0.14, 0.025, { frequency: 420, type: 'lowpass' });
    } else {
      tone(260, 0.09, 'square', 0.016, { slideTo: 130 });
      noise(0.05, 0.01, { frequency: 1200 });
    }
  },
  spawn(): void {
    const t = now();
    if (t - lastSpawn < 90) return;
    lastSpawn = t;
    tone(240, 0.14, 'sine', 0.012, { slideTo: 520 });
    noise(0.11, 0.006, { frequency: 900, type: 'bandpass', q: 1.6 });
  },
  lowHp(): void {
    tone(64, 0.16, 'sine', 0.05, { slideTo: 52 });
    tone(58, 0.2, 'sine', 0.035, { delay: 0.17, slideTo: 48 });
  },
  correct(): void {
    [523.25, 659.25, 783.99].forEach((freq, i) => {
      tone(freq, 0.18, 'sine', 0.05, { delay: i * 0.075 });
    });
    tone(1046.5, 0.24, 'triangle', 0.02, { delay: 0.24 });
  },
  wrong(): void {
    tone(220, 0.28, 'sawtooth', 0.04, { slideTo: 110 });
    tone(150, 0.3, 'triangle', 0.03, { slideTo: 90, delay: 0.08 });
    noise(0.16, 0.014, { frequency: 500, type: 'lowpass' });
  },
  levelUp(): void {
    [440, 554.37, 659.25, 880].forEach((freq, i) => {
      tone(freq, 0.22, 'triangle', 0.042, { delay: i * 0.07 });
    });
    tone(1318.5, 0.3, 'sine', 0.018, { delay: 0.28 });
  },
  wave(): void {
    [392, 523.25, 659.25, 783.99].forEach((freq, i) => {
      tone(freq, 0.16, 'triangle', 0.035, { delay: i * 0.07 });
    });
    noise(0.18, 0.014, { frequency: 1600, type: 'bandpass' });
  },
  empower(): void {
    [392, 587.33, 783.99, 1174.66].forEach((freq, i) => {
      tone(freq, 0.3, 'sine', 0.032, { delay: i * 0.045, attack: 0.02 });
    });
    noise(0.3, 0.012, { frequency: 2200, type: 'bandpass', q: 0.8 });
  },
  merge(): void {
    [660, 880, 1174.66].forEach((freq, i) => {
      tone(freq, 0.18, 'sine', 0.035, { delay: i * 0.06 });
    });
    tone(1567.98, 0.26, 'triangle', 0.016, { delay: 0.2 });
  },
  death(): void {
    tone(200, 0.5, 'sawtooth', 0.05, { slideTo: 70 });
    tone(140, 0.7, 'triangle', 0.04, { slideTo: 50, delay: 0.1 });
    noise(0.6, 0.03, { frequency: 380, type: 'lowpass' });
  },
};

// ---------------------------------------------------------------------------
// Música procedural
// ---------------------------------------------------------------------------

/** Acordes: Am, F, C, G, Am, F, Dm, E (La menor). */
const CHORDS: number[][] = [
  [57, 60, 64, 69],
  [53, 57, 60, 65],
  [48, 52, 55, 60],
  [55, 59, 62, 67],
  [57, 60, 64, 69],
  [53, 57, 60, 65],
  [50, 53, 57, 62],
  [52, 56, 59, 64],
];

const BASS_ROOTS = [45, 41, 48, 43, 45, 41, 50, 40];

/** Melodía en corcheas: 8 notas por compás, 8 compases. */
const MELODY: MusicNote[] = [
  // Am
  69, 72, 76, 74, 72, 76, 81, 79,
  // F
  77, 76, 72, 69, 72, 74, 77, 76,
  // C
  76, 79, 72, 76, 79, 76, 74, 72,
  // G
  74, 71, 67, 71, 74, 79, 77, 74,
  // Am
  69, 72, 76, 81, 79, 76, 72, 74,
  // F
  77, 76, 72, 69, 65, 69, 72, 74,
  // Dm
  74, 77, 81, 79, 77, 74, 72, 69,
  // E
  71, 68, 64, 68, 71, 74, 71, 68,
];

const ARP_PATTERN = [0, 2, 1, 3, 2, 3, 1, 2];

function scheduleStep(step: number, time: number): void {
  if (!context || !musicBus || musicMuted) return;

  const bar = Math.floor(step / STEPS_PER_BAR);
  const beat = step % STEPS_PER_BAR;
  const chord = CHORDS[bar % CHORDS.length]!;
  const intensity = clamp(musicIntensity, 0, 1);
  const energy = 0.55 + intensity * 0.45;

  // Bajo: pulso en negras con un empujón a mitad de compás.
  if (beat === 0 || beat === 3 || beat === 8 || beat === 11) {
    const root = BASS_ROOTS[bar % BASS_ROOTS.length]!;
    const note = beat === 11 ? root + 7 : root;
    tone(midiToFreq(note), 0.34, 'triangle', 0.05 * energy, {
      bus: musicBus,
      attack: 0.01,
    });
    tone(midiToFreq(note), 0.3, 'square', 0.014 * energy, {
      bus: musicBus,
      attack: 0.012,
      detune: -4,
    });
  }

  // Arpegio de corcheas (dos pasos por nota).
  if (beat % 2 === 0) {
    const index = ARP_PATTERN[(step / 2) % ARP_PATTERN.length]!;
    const arpNote = chord[index % chord.length]! + 12;
    tone(midiToFreq(arpNote), 0.14, 'triangle', 0.018 * energy, {
      bus: musicBus,
      attack: 0.008,
    });
  }

  // Pad cálido al inicio de cada compás.
  if (beat === 0) {
    for (const note of chord) {
      tone(midiToFreq(note), STEP_DURATION * 15.2, 'sawtooth', 0.012, {
        bus: musicBus,
        attack: 0.28,
        detune: 3,
      });
      tone(midiToFreq(note + 12), STEP_DURATION * 15.2, 'sine', 0.006, {
        bus: musicBus,
        attack: 0.4,
      });
    }
  }

  // Melodía principal.
  if (beat % 2 === 0) {
    const melodyIndex = bar * 8 + beat / 2;
    const note = MELODY[melodyIndex];
    if (note != null) {
      tone(midiToFreq(note), 0.24, 'square', 0.016 * energy, {
        bus: musicBus,
        attack: 0.01,
      });
      tone(midiToFreq(note + 12), 0.16, 'sine', 0.005 * energy, {
        bus: musicBus,
        attack: 0.01,
        delay: 0.01,
      });
    }
  }

  // Batería.
  if (beat === 0 || beat === 8 || (intensity > 0.55 && (beat === 6 || beat === 14))) {
    tone(110, 0.11, 'sine', 0.06, {
      bus: musicBus,
      slideTo: 42,
      attack: 0.004,
    });
  }
  if (beat === 4 || beat === 12) {
    noise(0.09, 0.022, {
      frequency: 1900,
      type: 'bandpass',
      q: 0.9,
      bus: musicBus,
    });
    tone(190, 0.05, 'triangle', 0.016, { bus: musicBus, slideTo: 130 });
  }
  if (intensity > 0.15 && beat % 2 === 0) {
    noise(0.03, 0.008 * energy, {
      frequency: 7200,
      type: 'highpass',
      bus: musicBus,
    });
  }
  if (beat === 14) {
    noise(0.12, 0.009, {
      frequency: 6000,
      type: 'highpass',
      bus: musicBus,
    });
  }
}

function scheduler(): void {
  if (!context || !musicPlaying) return;

  if (muted) {
    musicNextTime = context.currentTime + 0.06;
    return;
  }

  while (musicNextTime < context.currentTime + 0.24) {
    scheduleStep(musicStep, musicNextTime);
    musicStep = (musicStep + 1) % TOTAL_STEPS;
    musicNextTime += STEP_DURATION;
  }
}

export const music = {
  /** Arranca el loop (idempotente). Requiere un gesto del usuario. */
  start(): void {
    if (typeof window === 'undefined') return;
    unlockAudio();
    if (!context) return;
    if (musicPlaying) {
      if (context.state === 'suspended') void context.resume();
      return;
    }
    musicPlaying = true;
    musicStep = 0;
    musicNextTime = context.currentTime + 0.08;
    applyMusicGain(0.2);
    musicTimer = window.setInterval(scheduler, 40);
  },

  stop(): void {
    musicPlaying = false;
    if (musicTimer !== null) {
      window.clearInterval(musicTimer);
      musicTimer = null;
    }
    if (context && musicBus) {
      musicBus.gain.cancelScheduledValues(context.currentTime);
      musicBus.gain.setTargetAtTime(0.0001, context.currentTime, 0.15);
    }
  },

  /** 0 = nivel 1 (tranquilo), 1 = combate a tope (más percusión). */
  setIntensity(value: number): void {
    musicIntensity = clamp(value, 0, 1);
  },

  /** Baja el volumen mientras hay un modal abierto. */
  duck(value: boolean): void {
    musicDucked = value;
    applyMusicGain(0.14);
  },

  isPlaying(): boolean {
    return musicPlaying;
  },
};
