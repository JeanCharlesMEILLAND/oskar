"use client";

import { useEffect, useRef, useState } from "react";
import { TICK_DT, SOLO_TARGET } from "@/game/constants";
import { createState, tick, type GameState, type Inputs, type Mode } from "@/game/engine";
import { lerpCameraToTurtle, render } from "@/game/render";
import { SFX } from "@/game/audio";
import { getCurrentAccount, saveGameResult, type GameResult } from "@/lib/auth";

type DirKey = "up" | "down" | "left" | "right";

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
const P2_KEYS = P1_KEYS_WASD;

export function GameCanvas({
  mode,
  onEnd,
}: {
  mode: Mode;
  onEnd?: (result: GameResult) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const savedRef = useRef(false);
  const [hud, setHud] = useState({
    p1Score: 0,
    p2Score: 0,
    lives: 1,
    p2Lives: 1,
    time: 60,
  });
  const [endResult, setEndResult] = useState<null | GameResult>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let viewW = window.innerWidth;
    let viewH = window.innerHeight;

    const updateSize = () => {
      viewW = window.innerWidth;
      viewH = window.innerHeight;
      canvas.width = viewW * dpr;
      canvas.height = viewH * dpr;
      canvas.style.width = `${viewW}px`;
      canvas.style.height = `${viewH}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    updateSize();
    window.addEventListener("resize", updateSize);

    const account = getCurrentAccount();
    const state: GameState = createState(mode, {
      selectedClassId: account?.selectedClass ?? "normal",
    });
    const inputs: Inputs = {};
    const keysDown = new Set<string>();
    let camera = {
      x: state.turtles[0].pos.x - viewW / 2,
      y: state.turtles[0].pos.y - viewH / 2,
    };
    let stopped = false;
    let raf = 0;

    const isDuo = mode === "duo";
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

    function resolveVec(map: Record<string, DirKey>): { dx: -1 | 0 | 1; dy: -1 | 0 | 1 } {
      let dx: -1 | 0 | 1 = 0;
      let dy: -1 | 0 | 1 = 0;
      // Iterate ALL pressed keys so diagonals work (up+right, etc.)
      for (const k of keysDown) {
        const dir = map[k];
        if (dir === "up") dy = -1;
        else if (dir === "down") dy = 1;
        else if (dir === "left") dx = -1;
        else if (dir === "right") dx = 1;
      }
      return { dx, dy };
    }

    let lastTime = performance.now();
    let accumulator = 0;

    const loop = (now: number) => {
      const dt = (now - lastTime) / 1000;
      lastTime = now;
      accumulator += Math.min(dt, 0.25);

      while (accumulator >= TICK_DT) {
        const v1 = resolveVec(p1Map);
        inputs.p1 = { dx: v1.dx, dy: v1.dy, action: false };
        if (p2Map) {
          const v2 = resolveVec(p2Map);
          inputs.p2 = { dx: v2.dx, dy: v2.dy, action: false };
        }
        tick(state, inputs);
        accumulator -= TICK_DT;
      }

      // Drain audio events
      if (state.events.length > 0) {
        for (const ev of state.events) {
          if (ev.type === "eat") {
            if (ev.isGold) SFX.eatGold();
            else SFX.eat(ev.combo);
          } else if (ev.type === "hit") SFX.hit();
          else if (ev.type === "win") SFX.win();
          else if (ev.type === "lose") SFX.lose();
          else if (ev.type === "combo") SFX.combo();
          else if (ev.type === "powerup") SFX.powerup();
          else if (ev.type === "bomb") SFX.bomb();
        }
        state.events.length = 0;
      }

      camera = lerpCameraToTurtle(camera, state.turtles[0], viewW, viewH, 0.12);
      render(ctx, state, camera, { w: viewW, h: viewH });

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
        if (!savedRef.current) {
          savedRef.current = true;
          saveGameResult(mode, state.result);
        }
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
      window.removeEventListener("resize", updateSize);
    };
  }, [mode, onEnd]);

  return (
    <div className="fixed inset-0 bg-[#84cc16]">
      <canvas ref={canvasRef} className="block" />
      {/* HUD overlay */}
      <div className="pointer-events-none absolute inset-0">
        {/* Top-left: scores + lives */}
        <div className="absolute top-4 left-4 flex flex-col gap-2">
          <div className="bg-white/85 backdrop-blur rounded-2xl px-4 py-2 shadow-lg">
            <div className="text-[10px] uppercase tracking-widest text-emerald-700/70 leading-none flex items-center gap-1.5">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
              {mode === "duo"
                ? "P1"
                : mode === "endless"
                  ? "Score"
                  : hud.p1Score >= SOLO_TARGET
                    ? `🏆 Cel ${SOLO_TARGET} 🥬`
                    : `Cel ${SOLO_TARGET} 🥬`}
            </div>
            <div className="font-[var(--font-fraunces)] text-2xl font-semibold text-emerald-950 leading-tight">
              {hud.p1Score}
            </div>
          </div>
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
          <div className="bg-white/85 backdrop-blur rounded-2xl px-3 py-1.5 shadow-lg flex items-center gap-1.5">
            {Array.from({ length: Math.max(hud.lives, 0) }).map((_, i) => (
              <span key={i}>❤️</span>
            ))}
            {hud.lives <= 0 && <span className="text-rose-500 font-medium text-xs">💀</span>}
          </div>
        </div>

        {/* Below minimap (top-right): timer */}
        <div className="absolute top-[180px] right-4 md:right-6">
          <div className="bg-white/85 backdrop-blur rounded-2xl px-4 py-2 shadow-lg text-right">
            <div className="text-[10px] uppercase tracking-widest text-emerald-700/70 leading-none">
              Czas
            </div>
            <div className="font-[var(--font-fraunces)] text-2xl font-semibold text-emerald-950 leading-tight">
              {mode === "endless" ? "∞" : `${hud.time}s`}
            </div>
          </div>
        </div>

        {/* Bottom-center: controls hint */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
          <span className="inline-block bg-black/40 text-white text-[11px] tracking-wide rounded-full px-4 py-1 backdrop-blur">
            {mode === "duo" ? "🟢 ↑ ↓ ← →   ·   🟡 WASD / ZQSD" : "WASD · ZQSD · ↑ ↓ ← →"}
          </span>
        </div>
      </div>

      {endResult && <EndOverlay result={endResult} mode={mode} />}
    </div>
  );
}

function EndOverlay({ result, mode }: { result: GameResult; mode: Mode }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-emerald-950/80 backdrop-blur-sm animate-[fadeIn_0.3s]">
      <div className="rounded-3xl bg-white/95 p-8 max-w-sm text-center shadow-2xl pointer-events-auto">
        <p className="text-5xl mb-3">
          {mode === "endless" ? "♾️" : result.won ? "🏆" : "🥬"}
        </p>
        <h2 className="font-[var(--font-fraunces)] text-3xl font-semibold text-emerald-950 mb-2">
          {result.won ? "Brawo !" : "Koniec !"}
        </h2>
        <p className="text-emerald-900/70 mb-1">
          {mode === "endless"
            ? `Przeżyłeś ${result.survivedSec}s`
            : `Sałaty : ${result.score}`}
        </p>
        <p className="text-emerald-700 text-sm mb-5">+{result.score} 🥬 zapisane</p>
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
