let context: AudioContext | null = null;
let master: GainNode | null = null;
let muted = false;
let lastShoot = 0;
let lastHit = 0;

function now(): number {
  return typeof performance !== 'undefined' ? performance.now() : Date.now();
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
    master = context.createGain();
    master.gain.value = 0.55;
    master.connect(context.destination);
  }
  if (context.state === 'suspended') {
    void context.resume();
  }
}

export function setMuted(value: boolean): void {
  muted = value;
}

export function isMuted(): boolean {
  return muted;
}

function note(
  frequency: number,
  duration: number,
  type: OscillatorType,
  gain: number,
  slideTo?: number,
  delay = 0,
): void {
  if (muted || !context || !master) return;
  const start = context.currentTime + delay;
  const osc = context.createOscillator();
  const envelope = context.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(Math.max(20, frequency), start);
  if (slideTo) {
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), start + duration);
  }

  envelope.gain.setValueAtTime(0.0001, start);
  envelope.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), start + 0.012);
  envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration);

  osc.connect(envelope);
  envelope.connect(master);
  osc.start(start);
  osc.stop(start + duration + 0.03);
}

export const sfx = {
  click(): void {
    note(420, 0.05, 'triangle', 0.02);
  },
  shoot(): void {
    const t = now();
    if (t - lastShoot < 55) return;
    lastShoot = t;
    note(340, 0.07, 'square', 0.014, 220);
  },
  hit(): void {
    const t = now();
    if (t - lastHit < 45) return;
    lastHit = t;
    note(180, 0.05, 'triangle', 0.02, 120);
  },
  kill(): void {
    note(420, 0.08, 'sine', 0.03, 620);
    note(620, 0.1, 'sine', 0.02, 780, 0.04);
  },
  heroHit(): void {
    note(130, 0.18, 'sawtooth', 0.04, 70);
  },
  correct(): void {
    [523.25, 659.25, 783.99].forEach((freq, i) => {
      note(freq, 0.18, 'sine', 0.05, undefined, i * 0.075);
    });
  },
  wrong(): void {
    note(220, 0.28, 'sawtooth', 0.04, 110);
    note(150, 0.3, 'triangle', 0.03, 90, 0.08);
  },
  levelUp(): void {
    [440, 554.37, 659.25, 880].forEach((freq, i) => {
      note(freq, 0.22, 'triangle', 0.04, undefined, i * 0.07);
    });
  },
  merge(): void {
    [660, 880, 1174.66].forEach((freq, i) => {
      note(freq, 0.16, 'sine', 0.035, undefined, i * 0.06);
    });
  },
  death(): void {
    note(200, 0.5, 'sawtooth', 0.05, 70);
    note(140, 0.7, 'triangle', 0.04, 50, 0.1);
  },
};
