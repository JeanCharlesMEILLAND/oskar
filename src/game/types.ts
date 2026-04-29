// Core game types — pure data, no DOM, no React.
// Designed to be replayable on a server (deterministic tick + serializable state).

export type Vec2 = { x: number; y: number };
export type Dir = "up" | "down" | "left" | "right" | "idle";
export type Facing = Exclude<Dir, "idle">;
export type Mode = "solo" | "duo" | "endless";

export type Turtle = {
  id: string;
  classId: string;
  color: { body: string; shell: string; accent: string };
  pos: Vec2;
  vel: Vec2;
  facing: Facing;
  isMoving: boolean;
  score: number;
  lives: number;
  combo: number;
  comboTimer: number; // seconds since last eat
  invulnUntil: number; // tick number
  magnetUntil: number; // tick number
};

export type Lettuce = {
  id: number;
  pos: Vec2;
  isGold: boolean;
  bobPhase: number; // 0..2π
};

export type Rock = {
  id: number;
  pos: Vec2;
  size: number;
  rot: number;
};

export type PowerUpKind = "tomato" | "star" | "strawberry" | "bomb";
export type PowerUp = {
  id: number;
  pos: Vec2;
  kind: PowerUpKind;
  expiresAtTick: number;
};

export type Particle = {
  pos: Vec2;
  vel: Vec2;
  life: number; // ticks remaining
  maxLife: number;
  color: string;
  size: number;
};

export type GameEvent =
  | { type: "eat"; combo: number; isGold: boolean }
  | { type: "hit" }
  | { type: "win" }
  | { type: "lose" }
  | { type: "combo" }
  | { type: "powerup"; kind: PowerUpKind }
  | { type: "bomb" };

export type GameState = {
  tick: number;
  mode: Mode;
  turtles: Turtle[];
  lettuces: Lettuce[];
  rocks: Rock[];
  powerups: PowerUp[];
  particles: Particle[];
  timeLeftSec: number;
  ended: boolean;
  result: null | { score: number; survivedSec?: number; won: boolean; lettuces: number };
  nextLettuceId: number;
  nextRockId: number;
  nextPowerUpId: number;
  spawnLettuceTimer: number;
  spawnRockTimer: number;
  spawnPowerUpTimer: number;
  goldLettuceChance: number; // 0..1
  pointsMultiplier: number; // for events
  rng: () => number; // deterministic random
  mapSeed: number;
  events: GameEvent[]; // drained by host each frame
};

// Vector input: dx/dy in {-1, 0, 1}. Allows diagonals naturally.
export type Input = { dx: -1 | 0 | 1; dy: -1 | 0 | 1; action: boolean };
export type Inputs = Record<string, Input>;
