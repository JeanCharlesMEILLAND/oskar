"use client";

import { useEffect, useRef, useState } from "react";
import {
  TICK_DT,
  TICK_RATE,
  SOLO_TARGET,
  VIEWPORT_H,
  VIEWPORT_W,
} from "@/game/constants";
import { createState, tick, type GameState, type Inputs, type Mode } from "@/game/engine";
import { lerpCameraToTurtle, render } from "@/game/render";

const KEYMAP_P1: Record<string, "up" | "down" | "left" | "right"> = {
  arrowup: "up",
  arrowdown: "down",
  arrowleft: "left",
  arrowright: "right",
  // QWERTY
  w: "up",
  a: "left",
  s: "down",
  d: "right",
  // AZERTY (Z and Q in place of W and A)
  z: "up",
  q: "left",
};

export function GameCanvas({
  mode,
  onEnd,
}: {
  mode: Mode;
  onEnd?: (result: { score: number; survivedSec?: number; won: boolean }) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hud, setHud] = useState({ score: 0, lives: 1, time: 60, combo: 0 });
  const [endResult, setEndResult] = useState<null | { score: number; survivedSec?: number; won: boolean }>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    // Make canvas crisp on HiDPI displays
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = VIEWPORT_W * dpr;
    canvas.height = VIEWPORT_H * dpr;
    canvas.style.width = `${VIEWPORT_W}px`;
    canvas.style.height = `${VIEWPORT_H}px`;
    ctx.scale(dpr, dpr);

    const state: GameState = createState(mode);
    const inputs: Inputs = {};
    const keysDown = new Set<string>();
    let camera = { x: state.turtles[0].pos.x - VIEWPORT_W / 2, y: state.turtles[0].pos.y - VIEWPORT_H / 2 };
    let stopped = false;
    let raf = 0;

    const onKey = (e: KeyboardEvent, down: boolean) => {
      const k = e.key.toLowerCase();
      if (k in KEYMAP_P1 || k === " ") {
        e.preventDefault();
        if (down) keysDown.add(k);
        else keysDown.delete(k);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => onKey(e, true);
    const onKeyUp = (e: KeyboardEvent) => onKey(e, false);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

    let lastTime = performance.now();
    let accumulator = 0;

    const loop = (now: number) => {
      const dt = (now - lastTime) / 1000;
      lastTime = now;
      accumulator += Math.min(dt, 0.25); // clamp to avoid spiral after tab switch

      while (accumulator >= TICK_DT) {
        // Resolve P1 input — priority order
        let dir: "up" | "down" | "left" | "right" | "idle" = "idle";
        for (const k of Array.from(keysDown).reverse()) {
          if (k in KEYMAP_P1) {
            dir = KEYMAP_P1[k];
            break;
          }
        }
        inputs.p1 = { dir, action: false };
        tick(state, inputs);
        accumulator -= TICK_DT;
      }

      // Camera lerp
      camera = lerpCameraToTurtle(camera, state.turtles[0], VIEWPORT_W, VIEWPORT_H, 0.12);
      render(ctx, state, camera);

      // Update HUD (throttle to every 6 ticks via state.tick)
      if (state.tick % 6 === 0) {
        setHud({
          score: state.turtles[0].score,
          lives: state.turtles[0].lives,
          time: Math.ceil(state.timeLeftSec),
          combo: state.turtles[0].combo,
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
      {/* HUD overlay */}
      <div className="pointer-events-none absolute inset-0 flex flex-col">
        <div className="flex items-start justify-between p-4 gap-3">
          <div className="bg-white/85 backdrop-blur rounded-2xl px-4 py-2 shadow-lg">
            <div className="text-[10px] uppercase tracking-widest text-emerald-700/70 leading-none">
              {mode === "solo" ? `Cel ${SOLO_TARGET} 🥬` : "Score"}
            </div>
            <div className="font-[var(--font-fraunces)] text-2xl font-semibold text-emerald-950 leading-tight">
              {hud.score}
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="bg-white/85 backdrop-blur rounded-2xl px-4 py-2 shadow-lg">
              <div className="text-[10px] uppercase tracking-widest text-emerald-700/70 leading-none">Czas</div>
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
            WASD · ZQSD · ↑ ↓ ← →
          </span>
        </div>
      </div>

      {/* End overlay */}
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
        <p className="text-5xl mb-3">{result.won ? "🏆" : "🥬"}</p>
        <h2 className="font-[var(--font-fraunces)] text-3xl font-semibold text-emerald-950 mb-2">
          {result.won ? "Brawo !" : "Koniec !"}
        </h2>
        <p className="text-emerald-900/70 mb-5">
          {mode === "endless"
            ? `Przeżyłeś ${result.survivedSec}s`
            : `Sałat zjedzonych : ${result.score}`}
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
