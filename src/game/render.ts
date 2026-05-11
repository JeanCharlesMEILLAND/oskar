// Pure rendering — given a state and a canvas context, draw everything.
// Map decorations are deterministic from `state.mapSeed`, drawn once to an offscreen canvas.

import type { GameState, Turtle, Lettuce, Rock, Particle, PowerUp } from "./types";
import { COLORS, MAP_H, MAP_W, ROCK_RADIUS, TURTLE_RADIUS } from "./constants";
import { clamp, lerp, mulberry32, randRange } from "./util";

type Camera = { x: number; y: number };
type Viewport = { w: number; h: number };

let mapCache: HTMLCanvasElement | null = null;
let cachedSeed: number | null = null;

function buildMapCache(seed: number): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = MAP_W;
  c.height = MAP_H;
  const ctx = c.getContext("2d")!;
  const rng = mulberry32(seed);

  // Base grass with subtle gradient
  const g = ctx.createLinearGradient(0, 0, 0, MAP_H);
  g.addColorStop(0, COLORS.grassLight);
  g.addColorStop(0.6, COLORS.grass);
  g.addColorStop(1, COLORS.grassDark);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, MAP_W, MAP_H);

  // Diagonal grass strokes (subtle texture)
  ctx.strokeStyle = "rgba(101, 163, 13, 0.18)";
  ctx.lineWidth = 1;
  for (let i = 0; i < 200; i++) {
    const x = rng() * MAP_W;
    const y = rng() * MAP_H;
    const len = 6 + rng() * 12;
    const angle = rng() * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(angle) * len, y + Math.sin(angle) * len);
    ctx.stroke();
  }

  // Dirt patches (irregular blobs)
  ctx.fillStyle = COLORS.dirt;
  for (let i = 0; i < 7; i++) {
    const cx = randRange(rng, 100, MAP_W - 100);
    const cy = randRange(rng, 100, MAP_H - 100);
    const r = randRange(rng, 35, 75);
    ctx.globalAlpha = 0.55;
    drawBlob(ctx, cx, cy, r, rng);
    ctx.globalAlpha = 1;
  }

  // Water pond (one or two)
  for (let i = 0; i < 2; i++) {
    const cx = randRange(rng, 150, MAP_W - 150);
    const cy = randRange(rng, 150, MAP_H - 150);
    const r = randRange(rng, 40, 60);
    ctx.fillStyle = COLORS.waterDeep;
    drawBlob(ctx, cx, cy, r * 1.05, rng);
    ctx.fillStyle = COLORS.water;
    drawBlob(ctx, cx, cy, r, rng);
    // sparkles
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    for (let j = 0; j < 4; j++) {
      const sx = cx + (rng() - 0.5) * r;
      const sy = cy + (rng() - 0.5) * r * 0.7;
      ctx.beginPath();
      ctx.ellipse(sx, sy, 4 + rng() * 3, 1.5, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Bushes around edges (dense at corners)
  ctx.fillStyle = COLORS.bush;
  const bushSpots: Array<[number, number]> = [];
  for (let i = 0; i < 18; i++) {
    let x: number, y: number;
    const corner = Math.floor(rng() * 4);
    if (corner === 0) { x = rng() * 200; y = rng() * 200; }
    else if (corner === 1) { x = MAP_W - rng() * 200; y = rng() * 200; }
    else if (corner === 2) { x = rng() * 200; y = MAP_H - rng() * 200; }
    else { x = MAP_W - rng() * 200; y = MAP_H - rng() * 200; }
    bushSpots.push([x, y]);
  }
  for (const [x, y] of bushSpots) {
    ctx.fillStyle = COLORS.bush;
    drawBush(ctx, x, y, 18 + rng() * 10, rng);
  }

  // Mushrooms (10)
  for (let i = 0; i < 10; i++) {
    const x = randRange(rng, 60, MAP_W - 60);
    const y = randRange(rng, 60, MAP_H - 60);
    drawMushroom(ctx, x, y, 0.8 + rng() * 0.5);
  }

  // Flowers (lots, scattered)
  for (let i = 0; i < 90; i++) {
    const x = randRange(rng, 30, MAP_W - 30);
    const y = randRange(rng, 30, MAP_H - 30);
    const c = COLORS.flower[Math.floor(rng() * COLORS.flower.length)];
    drawFlower(ctx, x, y, c, 0.7 + rng() * 0.7);
  }

  // Map border — soft inner ring
  ctx.strokeStyle = COLORS.bush;
  ctx.lineWidth = 8;
  ctx.globalAlpha = 0.18;
  ctx.strokeRect(4, 4, MAP_W - 8, MAP_H - 8);
  ctx.globalAlpha = 1;

  return c;
}

function drawBlob(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, rng: () => number) {
  ctx.beginPath();
  const steps = 14;
  for (let i = 0; i < steps; i++) {
    const angle = (Math.PI * 2 * i) / steps;
    const rr = r * (0.85 + rng() * 0.3);
    const x = cx + Math.cos(angle) * rr;
    const y = cy + Math.sin(angle) * rr * 0.78;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
}

function drawBush(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, rng: () => number) {
  // Three overlapping circles
  ctx.fillStyle = COLORS.bush;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.arc(x + r * 0.8, y - r * 0.2, r * 0.85, 0, Math.PI * 2);
  ctx.arc(x - r * 0.7, y - r * 0.1, r * 0.75, 0, Math.PI * 2);
  ctx.fill();
  // Highlights
  ctx.fillStyle = COLORS.bushHighlight;
  ctx.globalAlpha = 0.7;
  ctx.beginPath();
  ctx.arc(x - r * 0.3, y - r * 0.45, r * 0.3, 0, Math.PI * 2);
  ctx.arc(x + r * 0.5, y - r * 0.5, r * 0.25, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
}

function drawMushroom(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number) {
  // Stem
  ctx.fillStyle = COLORS.mushroomStem;
  ctx.beginPath();
  ctx.ellipse(x, y, 4 * scale, 7 * scale, 0, 0, Math.PI * 2);
  ctx.fill();
  // Cap
  ctx.fillStyle = COLORS.mushroomCap;
  ctx.beginPath();
  ctx.arc(x, y - 5 * scale, 9 * scale, Math.PI, 0);
  ctx.fill();
  // White spots
  ctx.fillStyle = "white";
  ctx.beginPath();
  ctx.arc(x - 3 * scale, y - 6 * scale, 1.5 * scale, 0, Math.PI * 2);
  ctx.arc(x + 3 * scale, y - 7 * scale, 1.2 * scale, 0, Math.PI * 2);
  ctx.fill();
}

function drawFlower(ctx: CanvasRenderingContext2D, x: number, y: number, color: string, scale: number) {
  // 5 petals
  ctx.fillStyle = color;
  for (let i = 0; i < 5; i++) {
    const a = (Math.PI * 2 * i) / 5;
    ctx.beginPath();
    ctx.ellipse(
      x + Math.cos(a) * 2.5 * scale,
      y + Math.sin(a) * 2.5 * scale,
      1.8 * scale,
      1.8 * scale,
      0,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }
  ctx.fillStyle = "#fde047";
  ctx.beginPath();
  ctx.arc(x, y, 1.4 * scale, 0, Math.PI * 2);
  ctx.fill();
}

// =============== Public render entry point ===============

export function render(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  camera: Camera,
  viewport: Viewport,
) {
  const w = viewport.w;
  const h = viewport.h;

  if (mapCache === null || cachedSeed !== state.mapSeed) {
    mapCache = buildMapCache(state.mapSeed);
    cachedSeed = state.mapSeed;
  }

  ctx.save();
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = COLORS.grassDark;
  ctx.fillRect(0, 0, w, h);
  ctx.translate(-camera.x, -camera.y);

  // Map
  ctx.drawImage(mapCache, 0, 0);

  // Sort entities by Y for proper layering (back-to-front)
  const renderQueue: Array<{ y: number; draw: () => void }> = [];
  for (const r of state.rocks) renderQueue.push({ y: r.pos.y, draw: () => drawRock(ctx, r) });
  for (const l of state.lettuces) renderQueue.push({ y: l.pos.y, draw: () => drawLettuce(ctx, l) });
  for (const p of state.powerups) renderQueue.push({ y: p.pos.y, draw: () => drawPowerUp(ctx, p, state.tick) });
  for (const t of state.turtles)
    renderQueue.push({ y: t.pos.y + 8, draw: () => drawTurtle(ctx, t, state.tick) });
  renderQueue.sort((a, b) => a.y - b.y);
  for (const item of renderQueue) item.draw();

  // Particles on top
  for (const p of state.particles) drawParticle(ctx, p);

  ctx.restore();

  // Vignette
  const vg = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.max(w, h) * 0.7);
  vg.addColorStop(0, "rgba(0,0,0,0)");
  vg.addColorStop(1, COLORS.vignette);
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, w, h);

  // Minimap (top-right)
  drawMinimap(ctx, state, camera, viewport);
}

function drawMinimap(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  camera: Camera,
  viewport: Viewport,
) {
  const padding = 16;
  const mmW = Math.min(220, viewport.w * 0.22);
  const mmH = (mmW * MAP_H) / MAP_W;
  const mmX = viewport.w - mmW - padding;
  const mmY = padding;

  // Frame
  ctx.save();
  ctx.fillStyle = "rgba(15, 90, 50, 0.85)";
  roundedRect(ctx, mmX - 6, mmY - 6, mmW + 12, mmH + 12, 12);
  ctx.fill();
  // Map background
  ctx.fillStyle = COLORS.grass;
  roundedRect(ctx, mmX, mmY, mmW, mmH, 6);
  ctx.fill();
  ctx.clip();

  // Subtle dirt patches (decorative)
  ctx.fillStyle = COLORS.dirt;
  ctx.globalAlpha = 0.5;
  ctx.fillRect(mmX + mmW * 0.12, mmY + mmH * 0.6, mmW * 0.08, mmH * 0.06);
  ctx.fillRect(mmX + mmW * 0.7, mmY + mmH * 0.2, mmW * 0.1, mmH * 0.05);
  ctx.globalAlpha = 1;

  const sx = mmW / MAP_W;
  const sy = mmH / MAP_H;

  // Lettuces — drawn as tiny salads (emoji + soft halo)
  ctx.font = "10px system-ui, 'Apple Color Emoji', 'Segoe UI Emoji', sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (const l of state.lettuces) {
    const x = mmX + l.pos.x * sx;
    const y = mmY + l.pos.y * sy;
    ctx.fillText(l.isGold ? "🌟" : "🥬", x, y);
  }

  // Rocks — small pebbles
  ctx.fillStyle = COLORS.rockDark;
  for (const r of state.rocks) {
    ctx.beginPath();
    ctx.arc(mmX + r.pos.x * sx, mmY + r.pos.y * sy, 1.6, 0, Math.PI * 2);
    ctx.fill();
  }

  // Power-ups (pulse + their emoji)
  const pulseR = 7 + Math.sin(state.tick * 0.15) * 1.5;
  const puEmoji: Record<string, string> = {
    tomato: "🍅",
    star: "⭐",
    strawberry: "🍓",
    bomb: "💣",
  };
  for (const p of state.powerups) {
    const x = mmX + p.pos.x * sx;
    const y = mmY + p.pos.y * sy;
    // Pulse halo
    ctx.fillStyle = "rgba(255,255,255,0.45)";
    ctx.beginPath();
    ctx.arc(x, y, pulseR, 0, Math.PI * 2);
    ctx.fill();
    // Emoji
    ctx.font = "11px system-ui, 'Apple Color Emoji', 'Segoe UI Emoji', sans-serif";
    ctx.fillStyle = "#000";
    ctx.fillText(puEmoji[p.kind] ?? "?", x, y);
  }

  // Camera viewport indicator
  ctx.strokeStyle = "rgba(255,255,255,0.6)";
  ctx.lineWidth = 1;
  ctx.strokeRect(
    mmX + camera.x * sx,
    mmY + camera.y * sy,
    viewport.w * sx,
    viewport.h * sy,
  );

  // Turtles (drawn last, on top)
  for (const t of state.turtles) {
    const x = mmX + t.pos.x * sx;
    const y = mmY + t.pos.y * sy;
    ctx.fillStyle = t.color.shell;
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "white";
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  ctx.restore();
}

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function clampCamera(camX: number, camY: number, viewW: number, viewH: number) {
  return {
    x: clamp(camX, 0, Math.max(0, MAP_W - viewW)),
    y: clamp(camY, 0, Math.max(0, MAP_H - viewH)),
  };
}

export function lerpCameraToTurtle(
  current: Camera,
  turtle: Turtle,
  viewW: number,
  viewH: number,
  alpha: number,
): Camera {
  const targetX = turtle.pos.x - viewW / 2;
  const targetY = turtle.pos.y - viewH / 2;
  return clampCamera(
    lerp(current.x, targetX, alpha),
    lerp(current.y, targetY, alpha),
    viewW,
    viewH,
  );
}

// =============== Entity drawing ===============

function drawRock(ctx: CanvasRenderingContext2D, r: Rock) {
  ctx.save();
  ctx.translate(r.pos.x, r.pos.y);
  ctx.rotate(r.rot);
  // Shadow
  ctx.fillStyle = "rgba(0,0,0,0.2)";
  ctx.beginPath();
  ctx.ellipse(0, ROCK_RADIUS * r.size * 0.55, ROCK_RADIUS * r.size, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  // Body
  const grad = ctx.createRadialGradient(-3, -3, 2, 0, 0, ROCK_RADIUS * r.size);
  grad.addColorStop(0, "#cbd5e1");
  grad.addColorStop(1, COLORS.rockDark);
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(0, 0, ROCK_RADIUS * r.size, 0, Math.PI * 2);
  ctx.fill();
  // Highlight
  ctx.fillStyle = "rgba(255,255,255,0.3)";
  ctx.beginPath();
  ctx.ellipse(-4, -5, 5, 3, 0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawLettuce(ctx: CanvasRenderingContext2D, l: Lettuce) {
  ctx.save();
  const bobY = Math.sin(l.bobPhase) * 2.5;
  const scale = 1 + Math.sin(l.bobPhase * 1.3) * 0.05;
  ctx.translate(l.pos.x, l.pos.y + bobY);
  // Shadow under
  ctx.fillStyle = "rgba(0,0,0,0.25)";
  ctx.beginPath();
  ctx.ellipse(0, 16, 15 * scale, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  // Bright halo to pop on green grass
  if (l.isGold) {
    // Gold radial halo (warmer)
    const halo = ctx.createRadialGradient(0, 0, 4, 0, 0, 32);
    halo.addColorStop(0, "rgba(254, 243, 199, 0.95)");
    halo.addColorStop(0.5, "rgba(253, 224, 71, 0.7)");
    halo.addColorStop(1, "rgba(253, 224, 71, 0)");
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(0, 0, 32, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // Soft white halo + thin ring
    const halo = ctx.createRadialGradient(0, 0, 6, 0, 0, 22);
    halo.addColorStop(0, "rgba(255, 255, 255, 0.85)");
    halo.addColorStop(0.6, "rgba(255, 255, 255, 0.4)");
    halo.addColorStop(1, "rgba(255, 255, 255, 0)");
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(0, 0, 22, 0, Math.PI * 2);
    ctx.fill();
    // Crisp white ring for definition
    ctx.strokeStyle = "rgba(255, 255, 255, 0.9)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, 16, 0, Math.PI * 2);
    ctx.stroke();
  }
  // Salade emoji on top
  ctx.scale(scale, scale);
  ctx.font = "30px system-ui, 'Apple Color Emoji', 'Segoe UI Emoji'";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(l.isGold ? "🌟" : "🥬", 0, 0);
  ctx.restore();
}

function drawTurtle(ctx: CanvasRenderingContext2D, t: Turtle, tick: number) {
  ctx.save();
  ctx.translate(t.pos.x, t.pos.y);
  // Rotation by facing
  let rot = 0;
  if (t.facing === "right") rot = Math.PI / 2;
  else if (t.facing === "down") rot = Math.PI;
  else if (t.facing === "left") rot = -Math.PI / 2;
  ctx.rotate(rot);

  const r = TURTLE_RADIUS;

  // Rainbow class — cycle hues every tick so the shell visibly shimmers in-game.
  const isRainbow = t.classId === "rainbow";
  const rainbowHue = (tick * 2) % 360;
  const shellCol = isRainbow ? `hsl(${rainbowHue}, 85%, 55%)` : t.color.shell;
  const bodyCol = isRainbow ? `hsl(${(rainbowHue + 60) % 360}, 80%, 65%)` : t.color.body;
  const accentCol = isRainbow ? `hsl(${(rainbowHue + 180) % 360}, 90%, 60%)` : t.color.accent;

  // Skoczek (bouncy) — gentle constant up-down bob so it visibly "jumps" while idle.
  if (t.classId === "bouncy") {
    const bob = Math.sin(tick * 0.25) * 3;
    ctx.translate(0, -Math.abs(bob));
  }

  // Invuln blink
  const invulnTicks = t.invulnUntil - tick;
  if (invulnTicks > 0 && Math.floor(tick / 4) % 2 === 0) {
    ctx.globalAlpha = 0.45;
  }

  // Shadow
  ctx.fillStyle = "rgba(0,0,0,0.25)";
  ctx.beginPath();
  ctx.ellipse(0, r * 0.55, r * 0.95, r * 0.18, 0, 0, Math.PI * 2);
  ctx.fill();

  // Legs (4 corners)
  ctx.fillStyle = bodyCol;
  const legPositions: Array<[number, number]> = [
    [-r * 0.85, -r * 0.55],
    [r * 0.85, -r * 0.55],
    [-r * 0.85, r * 0.55],
    [r * 0.85, r * 0.55],
  ];
  // Animate legs (slight wobble when moving)
  const wobble = t.isMoving ? Math.sin(tick * 0.5) * 1.5 : 0;
  for (let i = 0; i < legPositions.length; i++) {
    const [lx, ly] = legPositions[i];
    const dy = i % 2 === 0 ? wobble : -wobble;
    ctx.beginPath();
    ctx.ellipse(lx, ly + dy, r * 0.32, r * 0.22, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Tail (back, opposite of facing)
  ctx.fillStyle = accentCol;
  ctx.beginPath();
  ctx.moveTo(-3, r * 0.85);
  ctx.lineTo(0, r * 1.1);
  ctx.lineTo(3, r * 0.85);
  ctx.closePath();
  ctx.fill();

  // Shell base
  const shellGrad = ctx.createRadialGradient(-r * 0.2, -r * 0.3, 2, 0, 0, r);
  shellGrad.addColorStop(0, lighten(shellCol, 30));
  shellGrad.addColorStop(0.65, shellCol);
  shellGrad.addColorStop(1, darken(shellCol, 25));
  ctx.fillStyle = shellGrad;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();

  // Shell rim
  ctx.strokeStyle = darken(shellCol, 35);
  ctx.lineWidth = 1.5;
  ctx.globalAlpha *= 0.7;
  ctx.stroke();
  ctx.globalAlpha = invulnTicks > 0 && Math.floor(tick / 4) % 2 === 0 ? 0.45 : 1;

  // Hex scutes (top-down)
  ctx.strokeStyle = accentCol;
  ctx.lineWidth = 1;
  ctx.globalAlpha *= 0.7;
  drawHex(ctx, 0, 0, r * 0.45);
  drawHex(ctx, -r * 0.4, -r * 0.25, r * 0.25);
  drawHex(ctx, r * 0.4, -r * 0.25, r * 0.25);
  drawHex(ctx, -r * 0.4, r * 0.25, r * 0.22);
  drawHex(ctx, r * 0.4, r * 0.25, r * 0.22);
  ctx.globalAlpha = invulnTicks > 0 && Math.floor(tick / 4) % 2 === 0 ? 0.45 : 1;

  // Head (forward = up since we rotated)
  ctx.fillStyle = bodyCol;
  ctx.beginPath();
  ctx.ellipse(0, -r * 0.95, r * 0.45, r * 0.42, 0, 0, Math.PI * 2);
  ctx.fill();

  // Eyes
  ctx.fillStyle = "#0a0a0a";
  ctx.beginPath();
  ctx.arc(-r * 0.18, -r * 1.0, 1.8, 0, Math.PI * 2);
  ctx.arc(r * 0.18, -r * 1.0, 1.8, 0, Math.PI * 2);
  ctx.fill();

  // Beak (small triangle at front)
  ctx.fillStyle = "#0a3a1a";
  ctx.beginPath();
  ctx.moveTo(-3, -r * 1.25);
  ctx.lineTo(0, -r * 1.4);
  ctx.lineTo(3, -r * 1.25);
  ctx.closePath();
  ctx.fill();

  // Combo ring above
  if (t.combo >= 2) {
    ctx.globalAlpha = 0.85;
    ctx.font = "bold 12px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillStyle = t.combo >= COMBO_THRESHOLD_3X ? "#ef4444" : "#f97316";
    ctx.fillText(`×${t.combo >= 5 ? 3 : 2}`, 0, -r * 1.7);
  }

  ctx.restore();
}

const COMBO_THRESHOLD_3X = 5;

function drawHex(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i - Math.PI / 6;
    const x = cx + r * Math.cos(a);
    const y = cy + r * Math.sin(a);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.stroke();
}

function drawPowerUp(ctx: CanvasRenderingContext2D, p: PowerUp, tick: number) {
  ctx.save();
  const bob = Math.sin(tick * 0.08 + p.id) * 3;
  ctx.translate(p.pos.x, p.pos.y + bob);
  // Halo
  const halo = ctx.createRadialGradient(0, 0, 5, 0, 0, 28);
  const colorMap: Record<string, [string, string, string]> = {
    tomato: ["#fee2e2", "#ef4444", "#7f1d1d"],
    star: ["#fef9c3", "#facc15", "#a16207"],
    strawberry: ["#fce7f3", "#ec4899", "#831843"],
    bomb: ["#e2e8f0", "#475569", "#0f172a"],
  };
  const [light, mid, dark] = colorMap[p.kind] ?? colorMap.tomato;
  halo.addColorStop(0, "rgba(255,255,255,0.5)");
  halo.addColorStop(0.5, mid + "55");
  halo.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(0, 0, 28, 0, Math.PI * 2);
  ctx.fill();
  // Body
  if (p.kind === "tomato") {
    ctx.fillStyle = mid;
    ctx.beginPath(); ctx.arc(0, 0, 12, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#15803d";
    ctx.beginPath(); ctx.ellipse(0, -10, 6, 3, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#fca5a5";
    ctx.beginPath(); ctx.arc(-4, -3, 3, 0, Math.PI * 2); ctx.fill();
  } else if (p.kind === "star") {
    drawStarShape(ctx, 0, 0, 13, mid, dark);
  } else if (p.kind === "strawberry") {
    ctx.fillStyle = mid;
    ctx.beginPath();
    ctx.moveTo(0, -10); ctx.bezierCurveTo(13, -10, 13, 8, 0, 13); ctx.bezierCurveTo(-13, 8, -13, -10, 0, -10);
    ctx.fill();
    ctx.fillStyle = "#15803d";
    ctx.beginPath(); ctx.moveTo(-7, -10); ctx.lineTo(-2, -14); ctx.lineTo(2, -14); ctx.lineTo(7, -10); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#fef9c3";
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI * 2 * i) / 6;
      ctx.beginPath(); ctx.arc(Math.cos(a) * 5, Math.sin(a) * 5, 1, 0, Math.PI * 2); ctx.fill();
    }
  } else if (p.kind === "bomb") {
    ctx.fillStyle = mid;
    ctx.beginPath(); ctx.arc(0, 1, 12, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#a16207";
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, -11); ctx.lineTo(-4, -16); ctx.stroke();
    // spark
    ctx.fillStyle = "#fde047";
    ctx.beginPath(); ctx.arc(-4, -16, 2.5, 0, Math.PI * 2); ctx.fill();
  }
  // Highlight ring
  ctx.strokeStyle = "rgba(255,255,255,0.7)";
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(0, 0, 13, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();
}

function drawStarShape(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, fill: string, stroke: string) {
  ctx.fillStyle = fill;
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const radius = i % 2 === 0 ? r : r * 0.45;
    const a = -Math.PI / 2 + (Math.PI * i) / 5;
    const x = cx + Math.cos(a) * radius;
    const y = cy + Math.sin(a) * radius;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

function drawParticle(ctx: CanvasRenderingContext2D, p: Particle) {
  ctx.globalAlpha = p.life / p.maxLife;
  ctx.fillStyle = p.color;
  ctx.beginPath();
  ctx.arc(p.pos.x, p.pos.y, p.size, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
}

// Color helpers (small inline DJB2-free version)
function lighten(hex: string, percent: number) { return shade(hex, percent); }
function darken(hex: string, percent: number) { return shade(hex, -percent); }
function shade(color: string, percent: number) {
  const c = color.replace("#", "");
  const num = parseInt(c, 16);
  let r = (num >> 16) + Math.round((percent / 100) * 255);
  let g = ((num >> 8) & 0xff) + Math.round((percent / 100) * 255);
  let b = (num & 0xff) + Math.round((percent / 100) * 255);
  r = Math.max(0, Math.min(255, r));
  g = Math.max(0, Math.min(255, g));
  b = Math.max(0, Math.min(255, b));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}
