import type { GameState, Inputs, Mode, Turtle, PowerUp, PowerUpKind } from "./types";
import {
  COMBO_THRESHOLD_2X,
  COMBO_THRESHOLD_3X,
  COMBO_TIMEOUT_SEC,
  GOLD_VALUE,
  HIT_INVULN_SEC,
  LETTUCE_INITIAL_COUNT,
  LETTUCE_RADIUS,
  LETTUCE_RESPAWN_SEC,
  MAGNET_FORCE,
  MAP_H,
  MAP_W,
  POWERUP_DURATION_SEC,
  POWERUP_INTERVAL_SEC,
  POWERUP_RADIUS_PICK,
  ROCK_INITIAL_COUNT,
  ROCK_MAX,
  ROCK_RADIUS,
  ROCK_RESPAWN_SEC,
  SOLO_DURATION_SEC,
  SOLO_TARGET,
  STAR_DURATION_SEC,
  STRAWBERRY_DURATION_SEC,
  TICK_DT,
  TICK_RATE,
  TOMATO_ENDLESS_COIN_BONUS,
  TOMATO_TIME_BONUS,
  TURTLE_BASE_SPEED,
  TURTLE_RADIUS,
} from "./constants";
import { clamp, dist2, mulberry32, randRange } from "./util";
import { CLASS_STATS, getClassStats, TURTLES_BY_ID } from "@/data/turtles";
import { getEventState } from "@/lib/events";

const POWERUP_KINDS: PowerUpKind[] = ["tomato", "star", "strawberry", "bomb"];

export function createState(
  mode: Mode,
  options: { selectedClassId?: string; p2ClassId?: string; p2Name?: string; seed?: number } = {},
): GameState {
  const seed = options.seed ?? (Date.now() & 0xffffffff);
  const rng = mulberry32(seed);
  const classId = options.selectedClassId ?? "normal";
  const stats = getClassStats(classId);
  const visual = TURTLES_BY_ID[classId]?.visual;
  const color = visual
    ? { body: visual.body, shell: visual.shell, accent: visual.accent }
    : { body: "#4ade80", shell: "#22c55e", accent: "#16a34a" };

  // Player 2 setup (duo only). If a friend is picked, use their selected class.
  // P2 always shown in amber/yellow tint to distinguish from P1, but stats follow chosen class.
  const p2ClassId = options.p2ClassId ?? "normal";
  const p2Stats = getClassStats(p2ClassId);

  // bonusTime: extra seconds for solo/duo
  const baseTime =
    mode === "endless"
      ? Infinity
      : SOLO_DURATION_SEC + (stats.bonusTime ?? 0);

  const turtles: Turtle[] = [
    {
      id: "p1",
      classId,
      color,
      pos: { x: mode === "duo" ? MAP_W / 2 - 80 : MAP_W / 2, y: MAP_H / 2 },
      vel: { x: 0, y: 0 },
      facing: "down",
      isMoving: false,
      score: 0,
      lives: stats.lives + (mode === "endless" ? 2 : 0),
      combo: 0,
      comboTimer: 0,
      invulnUntil: 0,
      magnetUntil: 0,
      maxCombo: 0,
      goldEaten: 0,
      powerupsPicked: 0,
      combo3Count: 0,
      gotHit: false,
    },
  ];
  if (mode === "duo") {
    // Always amber/yellow tint for P2 (so players can tell each other apart)
    // but stats come from the chosen class.
    turtles.push({
      id: "p2",
      classId: p2ClassId,
      color: { body: "#facc15", shell: "#eab308", accent: "#fde047" },
      pos: { x: MAP_W / 2 + 80, y: MAP_H / 2 },
      vel: { x: 0, y: 0 },
      facing: "down",
      isMoving: false,
      score: 0,
      lives: p2Stats.lives,
      combo: 0,
      comboTimer: 0,
      invulnUntil: 0,
      magnetUntil: 0,
      maxCombo: 0,
      goldEaten: 0,
      powerupsPicked: 0,
      combo3Count: 0,
      gotHit: false,
    });
  }

  // Read active event (admin-triggered) — boosts gold chance / points / spawn rate
  const eventState = getEventState();
  const eventDouble = eventState.active && eventState.type === "double";
  const eventRain = eventState.active && eventState.type === "rain";

  const state: GameState = {
    tick: 0,
    mode,
    turtles,
    lettuces: [],
    rocks: [],
    powerups: [],
    particles: [],
    timeLeftSec: baseTime,
    ended: false,
    result: null,
    nextLettuceId: 1,
    nextRockId: 1,
    nextPowerUpId: 1,
    spawnLettuceTimer: 0,
    spawnRockTimer: 0,
    // During salad rain, spawn power-ups slightly faster too
    spawnPowerUpTimer: eventRain ? -3 : 0,
    // Event 2× → 10% gold lettuce chance + 2× points
    goldLettuceChance: eventDouble ? 0.1 : 0,
    pointsMultiplier: eventDouble ? 2 : 1,
    rng,
    mapSeed: seed,
    events: [],
  };
  // Salad rain → start with more lettuces
  const initialLettuceCount = eventRain ? LETTUCE_INITIAL_COUNT * 2 : LETTUCE_INITIAL_COUNT;
  for (let i = 0; i < initialLettuceCount; i++) spawnLettuce(state);
  for (let i = 0; i < ROCK_INITIAL_COUNT; i++) spawnRock(state);
  return state;
}

export function tick(state: GameState, inputs: Inputs) {
  if (state.ended) return;
  state.tick++;

  // Movement (with class speed)
  for (const t of state.turtles) {
    const input = inputs[t.id] ?? { dx: 0, dy: 0, action: false };
    applyTurtleMovement(t, input.dx, input.dy);
  }

  // Magnet pull (class-based + strawberry)
  applyMagnet(state);

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
  state.spawnPowerUpTimer += TICK_DT;
  if (state.spawnPowerUpTimer >= POWERUP_INTERVAL_SEC) {
    state.spawnPowerUpTimer = 0;
    spawnPowerUp(state);
  }
  // Power-up expiry
  state.powerups = state.powerups.filter((p) => state.tick < p.expiresAtTick);

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
      endGame(state, true);
    }
  }

  if (!state.ended) {
    const allDead = state.turtles.every((t) => t.lives <= 0);
    if (allDead) endGame(state, false);
  }
}

function applyTurtleMovement(t: Turtle, dx: number, dy: number) {
  const stats = getClassStats(t.classId);
  const speed = TURTLE_BASE_SPEED * stats.speed;
  let vx = 0, vy = 0;
  const len = Math.hypot(dx, dy);
  if (len > 0) {
    vx = (dx / len) * speed;
    vy = (dy / len) * speed;
    // Facing: vertical takes priority for diagonals (turtle "looks" up/down then left/right)
    if (Math.abs(dy) >= Math.abs(dx)) {
      t.facing = dy < 0 ? "up" : "down";
    } else {
      t.facing = dx < 0 ? "left" : "right";
    }
  }
  t.vel = { x: vx, y: vy };
  t.isMoving = vx !== 0 || vy !== 0;
  t.pos.x = clamp(t.pos.x + vx, TURTLE_RADIUS, MAP_W - TURTLE_RADIUS);
  t.pos.y = clamp(t.pos.y + vy, TURTLE_RADIUS, MAP_H - TURTLE_RADIUS);
}

function applyMagnet(state: GameState) {
  for (const t of state.turtles) {
    const stats = getClassStats(t.classId);
    let radius = stats.magnet ?? 0;
    if (state.tick < t.magnetUntil) radius = Math.max(radius, 9999);
    if (radius <= 0) continue;
    const r2 = radius * radius;
    for (const l of state.lettuces) {
      const dx = t.pos.x - l.pos.x;
      const dy = t.pos.y - l.pos.y;
      const d2 = dx * dx + dy * dy;
      if (d2 < r2 && d2 > 1) {
        const d = Math.sqrt(d2);
        l.pos.x += (dx / d) * MAGNET_FORCE * (d < 60 ? 6 : 3);
        l.pos.y += (dy / d) * MAGNET_FORCE * (d < 60 ? 6 : 3);
      }
    }
  }
}

function spawnLettuce(state: GameState) {
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

function spawnPowerUp(state: GameState) {
  for (let attempt = 0; attempt < 30; attempt++) {
    const pos = {
      x: randRange(state.rng, 80, MAP_W - 80),
      y: randRange(state.rng, 80, MAP_H - 80),
    };
    if (state.turtles.some((t) => dist2(t.pos, pos) < 100 ** 2)) continue;
    if (state.rocks.some((r) => dist2(r.pos, pos) < (ROCK_RADIUS + 20) ** 2)) continue;
    state.powerups.push({
      id: state.nextPowerUpId++,
      pos,
      kind: POWERUP_KINDS[Math.floor(state.rng() * POWERUP_KINDS.length)],
      expiresAtTick: state.tick + Math.floor(POWERUP_DURATION_SEC * TICK_RATE),
    });
    return;
  }
}

function handleCollisions(state: GameState) {
  for (const t of state.turtles) {
    const stats = getClassStats(t.classId);

    // Lettuce
    for (let i = state.lettuces.length - 1; i >= 0; i--) {
      const l = state.lettuces[i];
      if (dist2(t.pos, l.pos) < (TURTLE_RADIUS + LETTUCE_RADIUS) ** 2) {
        const base = l.isGold ? GOLD_VALUE : 1;
        const mult = state.pointsMultiplier;
        const classPoints = stats.points;
        let comboMult = 1;
        if (t.combo + 1 >= COMBO_THRESHOLD_3X) comboMult = 3;
        else if (t.combo + 1 >= COMBO_THRESHOLD_2X) comboMult = 2;
        t.score += Math.round(base * mult * classPoints * comboMult);
        t.combo++;
        t.comboTimer = 0;
        if (t.combo > t.maxCombo) t.maxCombo = t.combo;
        if (l.isGold) t.goldEaten++;
        // combo3Count: fire on each new combo3+ chain (i.e. each time we cross threshold)
        if (t.combo === COMBO_THRESHOLD_2X) t.combo3Count++;
        spawnEatParticles(state, l.pos, l.isGold);
        state.events.push({ type: "eat", combo: t.combo, isGold: l.isGold });
        if (t.combo === COMBO_THRESHOLD_2X || t.combo === COMBO_THRESHOLD_3X) {
          state.events.push({ type: "combo" });
        }
        state.lettuces.splice(i, 1);
        // Reaching SOLO_TARGET doesn't end the round — keep playing for high score.
      }
    }

    // Power-ups
    for (let i = state.powerups.length - 1; i >= 0; i--) {
      const p = state.powerups[i];
      if (dist2(t.pos, p.pos) < (TURTLE_RADIUS + POWERUP_RADIUS_PICK) ** 2) {
        applyPowerUp(state, t, p);
        t.powerupsPicked++;
        state.events.push({ type: "powerup", kind: p.kind });
        state.powerups.splice(i, 1);
      }
    }

    // Rocks
    if (state.tick >= t.invulnUntil && !stats.freezeRocks) {
      for (let i = 0; i < state.rocks.length; i++) {
        const r = state.rocks[i];
        if (dist2(t.pos, r.pos) < (TURTLE_RADIUS + ROCK_RADIUS - 4) ** 2) {
          // Dodge?
          if (stats.dodge && state.rng() < stats.dodge) {
            t.invulnUntil = state.tick + Math.floor(0.5 * TICK_RATE);
            break;
          }
          // Bounce? — Skoczek (bouncy) springs off the rock instead of taking damage.
          if (stats.bounce) {
            const dx = t.pos.x - r.pos.x;
            const dy = t.pos.y - r.pos.y;
            const d = Math.sqrt(dx * dx + dy * dy) || 1;
            // Big punchy push so the bounce feels real
            t.pos.x = clamp(t.pos.x + (dx / d) * 90, TURTLE_RADIUS, MAP_W - TURTLE_RADIUS);
            t.pos.y = clamp(t.pos.y + (dy / d) * 90, TURTLE_RADIUS, MAP_H - TURTLE_RADIUS);
            t.invulnUntil = state.tick + Math.floor(0.4 * TICK_RATE);
            // Visual + audio feedback
            for (let p = 0; p < 8; p++) {
              state.particles.push({
                pos: { ...t.pos },
                vel: {
                  x: (state.rng() - 0.5) * 6,
                  y: (state.rng() - 0.5) * 6,
                },
                life: 22,
                maxLife: 22,
                color: ["#fbbf24", "#fde047", "#f97316"][Math.floor(state.rng() * 3)],
                size: 3 + state.rng() * 3,
              });
            }
            state.events.push({ type: "powerup", kind: "tomato" }); // re-use the boing-y SFX
            break;
          }
          // Damage
          t.lives--;
          t.gotHit = true;
          t.invulnUntil = state.tick + Math.floor(HIT_INVULN_SEC * TICK_RATE);
          t.combo = 0;
          spawnHitParticles(state, t.pos);
          state.events.push({ type: "hit" });
          break;
        }
      }
    }
  }
}

function applyPowerUp(state: GameState, t: Turtle, p: PowerUp) {
  if (p.kind === "tomato") {
    if (state.mode === "endless") t.score += TOMATO_ENDLESS_COIN_BONUS;
    else state.timeLeftSec += TOMATO_TIME_BONUS;
  } else if (p.kind === "star") {
    t.invulnUntil = Math.max(t.invulnUntil, state.tick + Math.floor(STAR_DURATION_SEC * TICK_RATE));
  } else if (p.kind === "strawberry") {
    t.magnetUntil = Math.max(t.magnetUntil, state.tick + Math.floor(STRAWBERRY_DURATION_SEC * TICK_RATE));
  } else if (p.kind === "bomb") {
    state.rocks = [];
    state.events.push({ type: "bomb" });
  }
}

function spawnEatParticles(state: GameState, pos: { x: number; y: number }, isGold: boolean) {
  const colors = isGold ? ["#fde047", "#fbbf24"] : ["#86efac", "#22c55e", "#bef264"];
  for (let i = 0; i < (isGold ? 14 : 8); i++) {
    state.particles.push({
      pos: { ...pos },
      vel: { x: (state.rng() - 0.5) * 4, y: (state.rng() - 0.5) * 4 },
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
      vel: { x: (state.rng() - 0.5) * 6, y: (state.rng() - 0.5) * 6 },
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
  const score = Math.max(...state.turtles.map((t) => t.score), 0);
  const survivedSec = state.mode === "endless" ? Math.floor(state.tick / TICK_RATE) : undefined;
  let won: boolean;
  if (state.mode === "solo") won = score >= SOLO_TARGET;
  else if (state.mode === "duo") won = !timeOut;
  else won = false;
  // Aggregate per-round counters from the leading turtle
  const lead = state.turtles.reduce((a, b) => (a.score >= b.score ? a : b));
  state.result = {
    score,
    survivedSec,
    won,
    lettuces: score,
    maxCombo: lead.maxCombo,
    goldEaten: lead.goldEaten,
    powerupsPicked: lead.powerupsPicked,
    combo3Count: lead.combo3Count,
    gotHit: lead.gotHit,
    durationSec: state.tick / TICK_RATE,
  };
  state.events.push({ type: won ? "win" : "lose" });
}

export type { GameState, Inputs, Mode } from "./types";
// Suppress unused import warning for CLASS_STATS (re-exported via getClassStats)
export { CLASS_STATS };
