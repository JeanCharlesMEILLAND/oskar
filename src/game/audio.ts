// Tiny WebAudio synth — no samples, just oscillators.
// AudioContext is lazy-init on first play (after user gesture).

const MUTE_KEY = "zolwie:muted";

let ctx: AudioContext | null = null;
let muted = false;

// Restore mute preference from localStorage on first load
if (typeof window !== "undefined") {
  try {
    muted = localStorage.getItem(MUTE_KEY) === "1";
  } catch {}
}

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (ctx) return ctx;
  try {
    const C = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    ctx = new C();
    return ctx;
  } catch {
    return null;
  }
}

export function setMuted(m: boolean) {
  muted = m;
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(MUTE_KEY, m ? "1" : "0");
    } catch {}
  }
}
export function isMuted() {
  return muted;
}
export function toggleMute(): boolean {
  setMuted(!muted);
  return muted;
}

function tone(freq: number, dur: number, type: OscillatorType = "sine", gain = 0.08, atOffset = 0) {
  if (muted) return;
  const c = getCtx();
  if (!c) return;
  const t = c.currentTime + atOffset;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(c.destination);
  o.start(t);
  o.stop(t + dur + 0.05);
}

function noise(dur: number, gain = 0.04) {
  if (muted) return;
  const c = getCtx();
  if (!c) return;
  const t = c.currentTime;
  const buffer = c.createBuffer(1, c.sampleRate * dur, c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  const src = c.createBufferSource();
  src.buffer = buffer;
  const g = c.createGain();
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(g).connect(c.destination);
  src.start(t);
}

export const SFX = {
  eat: (combo = 1) => {
    const base = 660 + Math.min(combo, 5) * 60;
    tone(base, 0.07, "triangle", 0.07);
    tone(base * 1.5, 0.07, "triangle", 0.06, 0.05);
  },
  eatGold: () => {
    tone(880, 0.06, "triangle", 0.08);
    tone(1320, 0.06, "triangle", 0.08, 0.05);
    tone(1760, 0.12, "triangle", 0.07, 0.1);
  },
  hit: () => {
    tone(180, 0.25, "sawtooth", 0.12);
    tone(80, 0.3, "square", 0.08, 0.02);
    noise(0.15, 0.05);
  },
  win: () => {
    tone(523, 0.13, "triangle", 0.09);
    tone(659, 0.13, "triangle", 0.09, 0.1);
    tone(784, 0.25, "triangle", 0.1, 0.2);
  },
  lose: () => {
    tone(392, 0.18, "sawtooth", 0.08);
    tone(294, 0.18, "sawtooth", 0.08, 0.15);
    tone(196, 0.3, "sawtooth", 0.08, 0.3);
  },
  combo: () => {
    tone(880, 0.05, "square", 0.06);
    tone(1100, 0.05, "square", 0.06, 0.05);
    tone(1320, 0.08, "square", 0.07, 0.1);
  },
  powerup: () => {
    tone(440, 0.05, "sine", 0.08);
    tone(660, 0.05, "sine", 0.08, 0.04);
    tone(880, 0.08, "sine", 0.09, 0.08);
  },
  bomb: () => {
    tone(120, 0.4, "sawtooth", 0.15);
    noise(0.3, 0.1);
  },
};
