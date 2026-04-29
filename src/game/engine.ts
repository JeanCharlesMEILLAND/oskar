import type { GameState, Inputs, Mode, Turtle, Lettuce, Rock } from "./types";
import {
  COMBO_THRESHOLD_2X,
  COMBO_THRESHOLD_3X,
  COMBO_TIMEOUT_SEC,
  GOLD_VALUE,
  HIT_INVULN_SEC,
  LETTUCE_INITIAL_COUNT,
  LETTUCE_RADIUS,
  LETTUCE_RESPAWN_SEC,
  MAP_H,
  MAP_W,
  ROCK_INITIAL_COUNT,
  ROCK_MAX,
  ROCK_RADIUS,
  ROCK_RESPAWN_SEC,
  SOLO_DURATION_SEC,
  SOLO_TARGET,
  TICK_DT,
  TICK_RATE,
  TURTLE_BASE_SPEED,
  TURTLE_RADIUS,
} from "./constants";
import { clamp, dist2, mulberry32, randRange } from "./util";

export function createState(mode: Mode, seed = Date.now() & 0xffffffff): GameState {
  const rng = mulberry32(seed);
  const turtles = [
    {
      id: "p1",
      classId: "normal",
      color: { body: "#4ade80", shell: "#22c55e", accent: "#16a34a" },
      pos: { x: mode === "duo" ? MAP_W / 2 - 80 : MAP_W / 2, y: MAP_H / 2 },
      vel: { x: 0, y: 0 },
      facing: "down" as const,
      isMoving: false,
      score: 0,
      lives: mode === "endless" ? 3 : 1,
      combo: 0,
      comboTimer: 0,
      invulnUntil: 0,
      magnetUntil: 0,
    },
  ];
  if (mode === "duo") {
    turtles.push({
      id: "p2",
      classId: "normal",
      color: { body: "#facc15", shell: "#eab308", accent: "#fde047" },
      pos: { x: MAP_W / 2 + 80, y: MAP_H / 2 },
      vel: { x: 0, y: 0 },
      facing: "down" as const,
      isMoving: false,
      score: 0,
      lives: 1,
      combo: 0,
      comboTimer: 0,
      invulnUntil: 0,
      magnetUntil: 0,
    });
  }
  const state: GameState = {
    tick: 0,
    mode,
    turtles,
    lettuces: [],
    rocks: [],
    powerups: [],
    particles: [],
    timeLeftSec: mode === "endless" ? Infinity : SOLO_DURATION_SEC,
    ended: false,
    result: null,
    nextLettuceId: 1,
    nextRockId: 1,
    nextPowerUpId: 1,
    spawnLettuceTimer: 0,
    spawnRockTimer: 0,
    spawnPowerUpTimer: 0,
    goldLettuceChance: 0,
    pointsMultiplier: 1,
    rng,
    mapSeed: seed,
  };
  for (let i = 0; i < LETTUCE_INITIAL_COUNT; i++) spawnLettuce(state);
  for (let i = 0; i < ROCK_INITIAL_COUNT; i++) spawnRock(state);
  return state;
}

export function tick(state: GameState, inputs: Inputs) {
  if (state.ended) return;
  state.tick++;

  // Movement
  for (const t of state.turtles) {
    const input = inputs[t.id] ?? { dir: "idle", action: false };
    applyTurtleMovement(t, input.dir);
  }

  // Spawns
  state.spawnLettuceTimer += TICK_DT;
  if (state.spawnLettuceTimer >= LETTUCE_RESPAWN_SEC && state.lettuces.length < LETTUCE_INITIAL_COUNT) {
    state.spawnLettuceTimer = 0;
    spawnLettuce(state);
  }
  state.spawnRockTimer += TICK_DT;
  if (state.spawnRockTimer >= ROCK_RESPAWN_SEC && state.rocks.length < ROCK_MAX) {
    state.spawnRockTimer = 0;
    spawnRock(state);
  }

  // Collisions
  handleCollisions(state);

  // Combo timer decay
  for (const t of state.turtles) {
    if (t.combo > 0) {
      t.comboTimer += TICK_DT;
      if (t.comboTimer >= COMBO_TIMEOUT_SEC) {
        t.combo = 0;
        t.comboTimer = 0;
      }
    }
  }

  // Particles
  for (const p of state.particles) {
    p.pos.x += p.vel.x;
    p.pos.y += p.vel.y;
    p.vel.x *= 0.92;
    p.vel.y *= 0.92;
    p.life--;
  }
  state.particles = state.particles.filter((p) => p.life > 0);

  // Lettuce bob
  for (const l of state.lettuces) l.bobPhase += 0.08;

  // Clock
  if (state.mode !== "endless") {
    state.timeLeftSec -= TICK_DT;
    if (state.timeLeftSec <= 0) {
      state.timeLeftSec = 0;
      endGame(state, /*timeOut=*/ true);
    }
  }

  // Lose conditions
  if (!state.ended) {
    const allDead = state.turtles.every((t) => t.lives <= 0);
    if (allDead) endGame(state, /*timeOut=*/ false);
  }
}

function applyTurtleMovement(t: Turtle, dir: import("./types").Dir) {
  const speed = TURTLE_BASE_SPEED;
  let vx = 0, vy = 0;
  if (dir === "up") { vy = -speed; t.facing = "up"; }
  else if (dir === "down") { vy = speed; t.facing = "down"; }
  else if (dir === "left") { vx = -speed; t.facing = "left"; }
  else if (dir === "right") { vx = speed; t.facing = "right"; }
  t.vel = { x: vx, y: vy };
  t.isMoving = vx !== 0 || vy !== 0;
  t.pos.x = clamp(t.pos.x + vx, TURTLE_RADIUS, MAP_W - TURTLE_RADIUS);
  t.pos.y = clamp(t.pos.y + vy, TURTLE_RADIUS, MAP_H - TURTLE_RADIUS);
}

function spawnLettuce(state: GameState) {
  // Don't spawn on top of turtle or rocks
  for (let attempt = 0; attempt < 30; attempt++) {
    const pos = {
      x: randRange(state.rng, 50, MAP_W - 50),
      y: randRange(state.rng, 50, MAP_H - 50),
    };
    if (state.turtles.some((t) => dist2(t.pos, pos) < (TURTLE_RADIUS + LETTUCE_RADIUS + 30) ** 2)) continue;
    if (state.rocks.some((r) => dist2(r.pos, pos) < (ROCK_RADIUS + LETTUCE_RADIUS + 10) ** 2)) continue;
    state.lettuces.push({
      id: state.nextLettuceId++,
      pos,
      isGold: state.rng() < state.goldLettuceChance,
      bobPhase: state.rng() * Math.PI * 2,
    });
    return;
  }
}

function spawnRock(state: GameState) {
  for (let attempt = 0; attempt < 30; attempt++) {
    const pos = {
      x: randRange(state.rng, 50, MAP_W - 50),
      y: randRange(state.rng, 50, MAP_H - 50),
    };
    if (state.turtles.some((t) => dist2(t.pos, pos) < (TURTLE_RADIUS + ROCK_RADIUS + 80) ** 2)) continue;
    if (state.rocks.some((r) => dist2(r.pos, pos) < (ROCK_RADIUS * 2 + 20) ** 2)) continue;
    if (state.lettuces.some((l) => dist2(l.pos, pos) < (ROCK_RADIUS + LETTUCE_RADIUS + 10) ** 2)) continue;
    state.rocks.push({
      id: state.nextRockId++,
      pos,
      size: 0.85 + state.rng() * 0.4,
      rot: state.rng() * Math.PI * 2,
    });
    return;
  }
}

function handleCollisions(state: GameState) {
  for (const t of state.turtles) {
    // Lettuce
    for (let i = state.lettuces.length - 1; i >= 0; i--) {
      const l = state.lettuces[i];
      if (dist2(t.pos, l.pos) < (TURTLE_RADIUS + LETTUCE_RADIUS) ** 2) {
        // Eat
        const base = l.isGold ? GOLD_VALUE : 1;
        const mult = state.pointsMultiplier;
        let comboMult = 1;
        if (t.combo + 1 >= COMBO_THRESHOLD_3X) comboMult = 3;
        else if (t.combo + 1 >= COMBO_THRESHOLD_2X) comboMult = 2;
        t.score += base * mult * comboMult;
        t.combo++;
        t.comboTimer = 0;
        spawnEatParticles(state, l.pos, l.isGold);
        state.lettuces.splice(i, 1);
        // Win check
        if (state.mode === "solo" && t.score >= SOLO_TARGET) {
          endGame(state, /*timeOut=*/ false);
        }
        // In duo, first to reach target also ends the round
        if (state.mode === "duo" && t.score >= SOLO_TARGET) {
          endGame(state, /*timeOut=*/ false);
        }
      }
    }
    // Rock
    if (state.tick >= t.invulnUntil) {
      for (const r of state.rocks) {
        if (dist2(t.pos, r.pos) < (TURTLE_RADIUS + ROCK_RADIUS - 4) ** 2) {
          t.lives--;
          t.invulnUntil = state.tick + Math.floor(HIT_INVULN_SEC * TICK_RATE);
          t.combo = 0;
          spawnHitParticles(state, t.pos);
          break;
        }
      }
    }
  }
}

function spawnEatParticles(state: GameState, pos: { x: number; y: number }, isGold: boolean) {
  const colors = isGold ? ["#fde047", "#fbbf24"] : ["#86efac", "#22c55e", "#bef264"];
  for (let i = 0; i < (isGold ? 14 : 8); i++) {
    state.particles.push({
      pos: { ...pos },
      vel: {
        x: (state.rng() - 0.5) * 4,
        y: (state.rng() - 0.5) * 4,
      },
      life: 30,
      maxLife: 30,
      color: colors[Math.floor(state.rng() * colors.length)],
      size: 2 + state.rng() * 3,
    });
  }
}

function spawnHitParticles(state: GameState, pos: { x: number; y: number }) {
  for (let i = 0; i < 12; i++) {
    state.particles.push({
      pos: { ...pos },
      vel: {
        x: (state.rng() - 0.5) * 6,
        y: (state.rng() - 0.5) * 6,
      },
      life: 25,
      maxLife: 25,
      color: ["#94a3b8", "#475569", "#cbd5e1"][Math.floor(state.rng() * 3)],
      size: 2 + state.rng() * 4,
    });
  }
}

function endGame(state: GameState, timeOut: boolean) {
  if (state.ended) return;
  state.ended = true;
  // Score: max across players (duo = highest wins)
  const score = Math.max(...state.turtles.map((t) => t.score), 0);
  const survivedSec = state.mode === "endless" ? Math.floor(state.tick / TICK_RATE) : undefined;
  let won: boolean;
  if (state.mode === "solo") won = score >= SOLO_TARGET;
  else if (state.mode === "duo") won = !timeOut; // duo "wins" if they finish the timer
  else won = false; // endless never "wins"
  state.result = {
    score,
    survivedSec,
    won,
    lettuces: score,
  };
}

// Re-export for callers
export type { GameState, Inputs, Mode } from "./types";
