"use client";

import { useEffect, useRef, useState } from "react";
import {
  TICK_DT,
  SOLO_TARGET,
  VIEWPORT_H,
  VIEWPORT_W,
} from "@/game/constants";
import { createState, tick, type GameState, type Inputs, type Mode } from "@/game/engine";
import { lerpCameraToTurtle, render } from "@/game/render";

type DirKey = "up" | "down" | "left" | "right";

// Player 1 — arrows (everyone) + WASD (solo only)
const P1_KEYS_ARROWS: Record<string, DirKey> = {
  arrowup: "up",
  arrowdown: "down",
  arrowleft: "left",
  arrowright: "right",
};
const P1_KEYS_WASD: Record<string, DirKey> = {
  w: "up",
  a: "left",
  s: "down",
  d: "right",
  z: "up",
  q: "left",
};

// Player 2 — WASD/ZQSD (only when in duo)
const P2_KEYS: Record<string, DirKey> = P1_KEYS_WASD;

export function GameCanvas({
  mode,
  onEnd,
}: {
  mode: Mode;
  onEnd?: (result: { score: number; survivedSec?: number; won: boolean }) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hud, setHud] = useState({
    p1Score: 0,
    p2Score: 0,
    lives: 1,
    p2Lives: 1,
    time: 60,
  });
  const [endResult, setEndResult] = useState<null | { score: number; survivedSec?: number; won: boolean }>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = VIEWPORT_W * dpr;
    canvas.height = VIEWPORT_H * dpr;
    canvas.style.width = `${VIEWPORT_W}px`;
    canvas.style.height = `${VIEWPORT_H}px`;
    ctx.scale(dpr, dpr);

    const state: GameState = createState(mode);
    const inputs: Inputs = {};
    const keysDown = new Set<string>();
    let camera = {
      x: state.turtles[0].pos.x - VIEWPORT_W / 2,
      y: state.turtles[0].pos.y - VIEWPORT_H / 2,
    };
    let stopped = false;
    let raf = 0;

    const isDuo = mode === "duo";
    // In solo/endless, P1 owns BOTH layouts (arrows + WASD).
    // In duo, P1 = arrows only, P2 = WASD/ZQSD only.
    const p1Map = isDuo ? P1_KEYS_ARROWS : { ...P1_KEYS_ARROWS, ...P1_KEYS_WASD };
    const p2Map = isDuo ? P2_KEYS : null;

    const onKey = (e: KeyboardEvent, down: boolean) => {
      const k = e.key.toLowerCase();
      if (k in p1Map || (p2Map && k in p2Map) || k === " ") {
        e.preventDefault();
        if (down) keysDown.add(k);
        else keysDown.delete(k);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => onKey(e, true);
    const onKeyUp = (e: KeyboardEvent) => onKey(e, false);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

    function resolveDir(map: Record<string, DirKey>): DirKey | "idle" {
      // Most-recently-pressed key wins
      for (const k of Array.from(keysDown).reverse()) {
        if (k in map) return map[k];
      }
      return "idle";
    }

    let lastTime = performance.now();
    let accumulator = 0;

    const loop = (now: number) => {
      const dt = (now - lastTime) / 1000;
      lastTime = now;
      accumulator += Math.min(dt, 0.25);

      while (accumulator >= TICK_DT) {
        inputs.p1 = { dir: resolveDir(p1Map), action: false };
        if (p2Map) inputs.p2 = { dir: resolveDir(p2Map), action: false };
        tick(state, inputs);
        accumulator -= TICK_DT;
      }

      camera = lerpCameraToTurtle(camera, state.turtles[0], VIEWPORT_W, VIEWPORT_H, 0.12);
      render(ctx, state, camera);

      if (state.tick % 6 === 0) {
        const p1 = state.turtles[0];
        const p2 = state.turtles[1];
        setHud({
          p1Score: p1.score,
          p2Score: p2 ? p2.score : 0,
          lives: p1.lives,
          p2Lives: p2 ? p2.lives : 0,
          time: Math.ceil(state.timeLeftSec),
        });
      }

      if (state.ended && state.result) {
        setEndResult(state.result);
        onEnd?.(state.result);
      } else if (!stopped) {
        raf = requestAnimationFrame(loop);
      }
    };
    raf = requestAnimationFrame(loop);

    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [mode, onEnd]);

  return (
    <div className="relative inline-block rounded-3xl overflow-hidden shadow-2xl shadow-emerald-900/30 ring-4 ring-emerald-700/20">
      <canvas ref={canvasRef} className="block bg-[#84cc16]" />
      <div className="pointer-events-none absolute inset-0 flex flex-col">
        <div className="flex items-start justify-between p-4 gap-3">
          <div className="flex flex-col gap-2">
            {/* P1 score */}
            <div className="bg-white/85 backdrop-blur rounded-2xl px-4 py-2 shadow-lg">
              <div className="text-[10px] uppercase tracking-widest text-emerald-700/70 leading-none flex items-center gap-1.5">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
                {mode === "duo" ? "P1" : mode === "endless" ? "Score" : `Cel ${SOLO_TARGET} 🥬`}
              </div>
              <div className="font-[var(--font-fraunces)] text-2xl font-semibold text-emerald-950 leading-tight">
                {hud.p1Score}
              </div>
            </div>
            {/* P2 score (duo only) */}
            {mode === "duo" && (
              <div className="bg-white/85 backdrop-blur rounded-2xl px-4 py-2 shadow-lg">
                <div className="text-[10px] uppercase tracking-widest text-amber-700/70 leading-none flex items-center gap-1.5">
                  <span className="inline-block w-2 h-2 rounded-full bg-amber-500" />
                  P2
                </div>
                <div className="font-[var(--font-fraunces)] text-2xl font-semibold text-emerald-950 leading-tight">
                  {hud.p2Score}
                </div>
              </div>
            )}
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="bg-white/85 backdrop-blur rounded-2xl px-4 py-2 shadow-lg">
              <div className="text-[10px] uppercase tracking-widest text-emerald-700/70 leading-none">
                Czas
              </div>
              <div className="font-[var(--font-fraunces)] text-2xl font-semibold text-emerald-950 leading-tight">
                {mode === "endless" ? "∞" : `${hud.time}s`}
              </div>
            </div>
            <div className="bg-white/85 backdrop-blur rounded-2xl px-3 py-1.5 shadow-lg flex items-center gap-1.5">
              {Array.from({ length: Math.max(hud.lives, 0) }).map((_, i) => (
                <span key={i}>❤️</span>
              ))}
            </div>
          </div>
        </div>
        <div className="flex-1" />
        <div className="text-center pb-3">
          <span className="inline-block bg-black/35 text-white text-[11px] tracking-wide rounded-full px-4 py-1 backdrop-blur">
            {mode === "duo" ? "🟢 ↑ ↓ ← →   ·   🟡 WASD / ZQSD" : "WASD · ZQSD · ↑ ↓ ← →"}
          </span>
        </div>
      </div>

      {endResult && <EndOverlay result={endResult} mode={mode} />}
    </div>
  );
}

function EndOverlay({
  result,
  mode,
}: {
  result: { score: number; survivedSec?: number; won: boolean };
  mode: Mode;
}) {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-emerald-950/70 backdrop-blur-sm animate-[fadeIn_0.3s]">
      <div className="rounded-3xl bg-white/95 p-8 max-w-sm text-center shadow-2xl">
        <p className="text-5xl mb-3">
          {mode === "endless" ? "♾️" : result.won ? "🏆" : "🥬"}
        </p>
        <h2 className="font-[var(--font-fraunces)] text-3xl font-semibold text-emerald-950 mb-2">
          {result.won ? "Brawo !" : "Koniec !"}
        </h2>
        <p className="text-emerald-900/70 mb-5">
          {mode === "endless"
            ? `Przeżyłeś ${result.survivedSec}s`
            : `Sałaty : ${result.score}`}
        </p>
        <div className="flex flex-col gap-2">
          <button
            onClick={() => location.reload()}
            className="rounded-full bg-emerald-700 px-6 py-3 text-white font-medium hover:bg-emerald-800 transition"
          >
            Jeszcze raz →
          </button>
          <a
            href="/play"
            className="rounded-full border border-emerald-300 px-6 py-3 text-emerald-800 font-medium hover:bg-emerald-50 transition"
          >
            ← Lobby
          </a>
        </div>
      </div>
    </div>
  );
}
