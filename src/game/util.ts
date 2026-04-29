import type { Vec2 } from "./types";

export const clamp = (v: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const dist2 = (a: Vec2, b: Vec2) => {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
};
export const dist = (a: Vec2, b: Vec2) => Math.sqrt(dist2(a, b));

// Mulberry32 — seeded PRNG, deterministic between client/server.
export function mulberry32(seed: number) {
  let s = seed | 0;
  return function rng() {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const randRange = (rng: () => number, lo: number, hi: number) =>
  lo + rng() * (hi - lo);
export const randInt = (rng: () => number, lo: number, hi: number) =>
  Math.floor(randRange(rng, lo, hi + 1));
