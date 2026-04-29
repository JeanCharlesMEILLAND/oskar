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

type Vec = { dx: -1 | 0 | 1; dy: -1 | 0 | 1 };

/** Convert a normalized 2D delta inside the joystick to {-1,0,1} per axis with a small dead-zone. */
function vectorFromDelta(nx: number, ny: number): Vec {
  const mag = Math.hypot(nx, ny);
  if (mag < 0.22) return { dx: 0, dy: 0 };
  // Snap to 8-way: angle slice of 22.5° around each cardinal/diagonal
  const angle = Math.atan2(ny, nx); // -PI..PI, x right, y down
  const slice = Math.PI / 8; // 22.5°
  let dx: -1 | 0 | 1 = 0;
  let dy: -1 | 0 | 1 = 0;
  if (angle >= -slice && angle < slice) {
    dx = 1;
  } else if (angle >= slice && angle < 3 * slice) {
    dx = 1;
    dy = 1;
  } else if (angle >= 3 * slice && angle < 5 * slice) {
    dy = 1;
  } else if (angle >= 5 * slice && angle < 7 * slice) {
    dx = -1;
    dy = 1;
  } else if (angle >= 7 * slice || angle < -7 * slice) {
    dx = -1;
  } else if (angle >= -7 * slice && angle < -5 * slice) {
    dx = -1;
    dy = -1;
  } else if (angle >= -5 * slice && angle < -3 * slice) {
    dy = -1;
  } else if (angle >= -3 * slice && angle < -slice) {
    dx = 1;
    dy = -1;
  }
  return { dx, dy };
}

export function GameCanvas({
  mode,
  onEnd,
}: {
  mode: Mode;
  onEnd?: (result: GameResult) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const savedRef = useRef(false);

  // Joystick refs (mutated by touch handlers, read by the game loop)
  const p1JoyVecRef = useRef<Vec>({ dx: 0, dy: 0 });
  const p2JoyVecRef = useRef<Vec>({ dx: 0, dy: 0 });
  // Visual offsets for the knob (-1..1 per axis)
  const p1KnobRef = useRef<HTMLDivElement>(null);
  const p2KnobRef = useRef<HTMLDivElement>(null);
  const p1ZoneRef = useRef<HTMLDivElement>(null);
  const p2ZoneRef = useRef<HTMLDivElement>(null);

  const [hud, setHud] = useState({
    p1Score: 0,
    p2Score: 0,
    lives: 1,
    p2Lives: 1,
    time: 60,
  });
  const [endResult, setEndResult] = useState<null | GameResult>(null);
  const [isTouch, setIsTouch] = useState(false);

  // Detect touch device once on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    const coarse = window.matchMedia?.("(hover: none) and (pointer: coarse)").matches;
    const hasTouch =
      coarse ||
      "ontouchstart" in window ||
      (navigator.maxTouchPoints !== undefined && navigator.maxTouchPoints > 0);
    setIsTouch(!!hasTouch);
  }, []);

  // Touch joystick wiring
  useEffect(() => {
    if (!isTouch) return;
    type Active = {
      pointerId: number;
      cx: number;
      cy: number;
      radius: number;
      knob: HTMLDivElement | null;
      vecRef: typeof p1JoyVecRef;
    };
    const active = new Map<number, Active>();

    const setupZone = (
      zone: HTMLDivElement | null,
      knob: HTMLDivElement | null,
      vecRef: typeof p1JoyVecRef
    ) => {
      if (!zone) return () => {};
      const rect = () => zone.getBoundingClientRect();

      const updateKnob = (nx: number, ny: number) => {
        if (!knob) return;
        const max = 28; // px visual offset
        knob.style.transform = `translate(${nx * max}px, ${ny * max}px)`;
      };

      const reset = () => {
        vecRef.current = { dx: 0, dy: 0 };
        if (knob) knob.style.transform = "translate(0px, 0px)";
      };

      const onDown = (e: PointerEvent) => {
        e.preventDefault();
        const r = rect();
        const radius = r.width / 2;
        const cx = r.left + radius;
        const cy = r.top + radius;
        active.set(e.pointerId, {
          pointerId: e.pointerId,
          cx,
          cy,
          radius,
          knob,
          vecRef,
        });
        try {
          zone.setPointerCapture(e.pointerId);
        } catch {
          /* ignore */
        }
        const nx = Math.max(-1, Math.min(1, (e.clientX - cx) / radius));
        const ny = Math.max(-1, Math.min(1, (e.clientY - cy) / radius));
        vecRef.current = vectorFromDelta(nx, ny);
        updateKnob(nx, ny);
      };

      const onMove = (e: PointerEvent) => {
        const a = active.get(e.pointerId);
        if (!a) return;
        e.preventDefault();
        const nx = Math.max(-1, Math.min(1, (e.clientX - a.cx) / a.radius));
        const ny = Math.max(-1, Math.min(1, (e.clientY - a.cy) / a.radius));
        a.vecRef.current = vectorFromDelta(nx, ny);
        if (a.knob) {
          a.knob.style.transform = `translate(${nx * 28}px, ${ny * 28}px)`;
        }
      };

      const onUp = (e: PointerEvent) => {
        if (!active.has(e.pointerId)) return;
        active.delete(e.pointerId);
        try {
          zone.releasePointerCapture(e.pointerId);
        } catch {
          /* ignore */
        }
        reset();
      };

      zone.addEventListener("pointerdown", onDown, { passive: false });
      zone.addEventListener("pointermove", onMove, { passive: false });
      zone.addEventListener("pointerup", onUp);
      zone.addEventListener("pointercancel", onUp);
      zone.addEventListener("pointerleave", onUp);

      return () => {
        zone.removeEventListener("pointerdown", onDown);
        zone.removeEventListener("pointermove", onMove);
        zone.removeEventListener("pointerup", onUp);
        zone.removeEventListener("pointercancel", onUp);
        zone.removeEventListener("pointerleave", onUp);
      };
    };

    const cleanups = [
      setupZone(p1ZoneRef.current, p1KnobRef.current, p1JoyVecRef),
    ];
    if (mode === "duo") {
      cleanups.push(setupZone(p2ZoneRef.current, p2KnobRef.current, p2JoyVecRef));
    }
    return () => {
      cleanups.forEach((fn) => fn());
    };
  }, [isTouch, mode]);

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
    window.addEventListener("orientationchange", updateSize);

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

    function resolveVec(map: Record<string, DirKey>): Vec {
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

    /** Combine keyboard + joystick inputs (joystick wins when non-zero). */
    function combineWithJoy(kbd: Vec, joy: Vec): Vec {
      if (joy.dx !== 0 || joy.dy !== 0) return joy;
      return kbd;
    }

    let lastTime = performance.now();
    let accumulator = 0;

    const loop = (now: number) => {
      const dt = (now - lastTime) / 1000;
      lastTime = now;
      accumulator += Math.min(dt, 0.25);

      while (accumulator >= TICK_DT) {
        const k1 = resolveVec(p1Map);
        const v1 = combineWithJoy(k1, p1JoyVecRef.current);
        inputs.p1 = { dx: v1.dx, dy: v1.dy, action: false };
        if (p2Map) {
          const k2 = resolveVec(p2Map);
          const v2 = combineWithJoy(k2, p2JoyVecRef.current);
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
      window.removeEventListener("orientationchange", updateSize);
    };
  }, [mode, onEnd]);

  return (
    <div
      className="fixed inset-0 bg-[#84cc16]"
      style={{ touchAction: "none" }}
    >
      <canvas ref={canvasRef} className="block" />
      {/* HUD overlay */}
      <div className="pointer-events-none absolute inset-0">
        {/* Top-left: scores + lives */}
        <div
          className="absolute top-2 left-2 sm:top-4 sm:left-4 flex flex-col gap-1.5 sm:gap-2 max-w-[55vw]"
          style={{
            paddingTop: "env(safe-area-inset-top)",
            paddingLeft: "env(safe-area-inset-left)",
          }}
        >
          <div className="bg-white/85 backdrop-blur rounded-2xl px-3 py-1.5 sm:px-4 sm:py-2 shadow-lg">
            <div className="text-[9px] sm:text-[10px] uppercase tracking-widest text-emerald-700/70 leading-none flex items-center gap-1.5">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
              {mode === "duo"
                ? "P1"
                : mode === "endless"
                  ? "Score"
                  : hud.p1Score >= SOLO_TARGET
                    ? `🏆 Cel ${SOLO_TARGET} 🥬`
                    : `Cel ${SOLO_TARGET} 🥬`}
            </div>
            <div className="font-[var(--font-fraunces)] text-xl sm:text-2xl font-semibold text-emerald-950 leading-tight">
              {hud.p1Score}
            </div>
          </div>
          {mode === "duo" && (
            <div className="bg-white/85 backdrop-blur rounded-2xl px-3 py-1.5 sm:px-4 sm:py-2 shadow-lg">
              <div className="text-[9px] sm:text-[10px] uppercase tracking-widest text-amber-700/70 leading-none flex items-center gap-1.5">
                <span className="inline-block w-2 h-2 rounded-full bg-amber-500" />
                P2
              </div>
              <div className="font-[var(--font-fraunces)] text-xl sm:text-2xl font-semibold text-emerald-950 leading-tight">
                {hud.p2Score}
              </div>
            </div>
          )}
          <div className="bg-white/85 backdrop-blur rounded-2xl px-2.5 py-1 sm:px-3 sm:py-1.5 shadow-lg flex items-center gap-1 sm:gap-1.5 text-sm sm:text-base">
            {Array.from({ length: Math.max(hud.lives, 0) }).map((_, i) => (
              <span key={i}>❤️</span>
            ))}
            {hud.lives <= 0 && <span className="text-rose-500 font-medium text-xs">💀</span>}
          </div>
        </div>

        {/* Below minimap (top-right): timer */}
        <div
          className="absolute right-2 sm:right-4 md:right-6 top-[150px] sm:top-[180px]"
          style={{
            paddingRight: "env(safe-area-inset-right)",
          }}
        >
          <div className="bg-white/85 backdrop-blur rounded-2xl px-3 py-1.5 sm:px-4 sm:py-2 shadow-lg text-right">
            <div className="text-[9px] sm:text-[10px] uppercase tracking-widest text-emerald-700/70 leading-none">
              Czas
            </div>
            <div className="font-[var(--font-fraunces)] text-xl sm:text-2xl font-semibold text-emerald-950 leading-tight">
              {mode === "endless" ? "∞" : `${hud.time}s`}
            </div>
          </div>
        </div>

        {/* Bottom-center: controls hint — keyboard label hidden on touch */}
        {!isTouch && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 hidden sm:block">
            <span className="inline-block bg-black/40 text-white text-[11px] tracking-wide rounded-full px-4 py-1 backdrop-blur">
              {mode === "duo" ? "🟢 ↑ ↓ ← →   ·   🟡 WASD / ZQSD" : "WASD · ZQSD · ↑ ↓ ← →"}
            </span>
          </div>
        )}

        {/* Touch joysticks */}
        {isTouch && (
          <>
            {/* P1 joystick — bottom-left (green) */}
            <div
              ref={p1ZoneRef}
              className="no-select absolute pointer-events-auto select-none"
              style={{
                left: "max(env(safe-area-inset-left), 16px)",
                bottom: "max(env(safe-area-inset-bottom), 16px)",
                width: "min(38vw, 160px)",
                height: "min(38vw, 160px)",
                touchAction: "none",
              }}
              aria-label={mode === "duo" ? "Joystick P1" : "Joystick"}
            >
              <div
                className="absolute inset-0 rounded-full border-2 border-emerald-500/70 bg-emerald-500/20 backdrop-blur-sm shadow-lg"
                style={{ boxShadow: "0 8px 24px rgba(20, 83, 45, 0.25)" }}
              />
              <div
                className="absolute inset-0 m-auto rounded-full border border-emerald-700/40"
                style={{ width: "50%", height: "50%" }}
              />
              <div
                ref={p1KnobRef}
                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-600/90 shadow-md transition-transform duration-75 will-change-transform"
                style={{ width: "38%", height: "38%" }}
              />
            </div>

            {/* P2 joystick — bottom-right (amber), only in duo */}
            {mode === "duo" && (
              <div
                ref={p2ZoneRef}
                className="no-select absolute pointer-events-auto select-none"
                style={{
                  right: "max(env(safe-area-inset-right), 16px)",
                  bottom: "max(env(safe-area-inset-bottom), 16px)",
                  width: "min(38vw, 160px)",
                  height: "min(38vw, 160px)",
                  touchAction: "none",
                }}
                aria-label="Joystick P2"
              >
                <div
                  className="absolute inset-0 rounded-full border-2 border-amber-500/70 bg-amber-400/20 backdrop-blur-sm shadow-lg"
                  style={{ boxShadow: "0 8px 24px rgba(180, 83, 9, 0.25)" }}
                />
                <div
                  className="absolute inset-0 m-auto rounded-full border border-amber-700/40"
                  style={{ width: "50%", height: "50%" }}
                />
                <div
                  ref={p2KnobRef}
                  className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-500/90 shadow-md transition-transform duration-75 will-change-transform"
                  style={{ width: "38%", height: "38%" }}
                />
              </div>
            )}
          </>
        )}
      </div>

      {endResult && <EndOverlay result={endResult} mode={mode} />}
    </div>
  );
}

function EndOverlay({ result, mode }: { result: GameResult; mode: Mode }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-emerald-950/80 backdrop-blur-sm animate-[fadeIn_0.3s] px-4">
      <div className="rounded-3xl bg-white/95 p-6 sm:p-8 max-w-sm w-full text-center shadow-2xl pointer-events-auto">
        <p className="text-5xl mb-3">
          {mode === "endless" ? "♾️" : result.won ? "🏆" : "🥬"}
        </p>
        <h2 className="font-[var(--font-fraunces)] text-2xl sm:text-3xl font-semibold text-emerald-950 mb-2">
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
