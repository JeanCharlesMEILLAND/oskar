"use client";

import { useEffect, useRef, useState } from "react";
import { TICK_DT, SOLO_TARGET } from "@/game/constants";
import { createState, tick, type GameState, type Inputs, type Mode } from "@/game/engine";
import { lerpCameraToTurtle, render } from "@/game/render";
import { SFX } from "@/game/audio";
import { getCurrentAccount, saveGameResult, type GameResult } from "@/lib/auth";
import { getGameRoom, type GamePayload } from "@/lib/game-ws";

type Vec = { dx: -1 | 0 | 1; dy: -1 | 0 | 1 };
// Raw delta — keys add up, then we clamp to -1..1 per axis.
type Delta = { dx: -1 | 0 | 1; dy: -1 | 0 | 1 };

// 8-way single-key map using the QWE/ASD/ZXC keypad layout.
// Q = up-left, W = up, E = up-right
// A = left,             D = right
// Z = down-left, S/X = down, C = down-right
const P1_KEYS_ARROWS: Record<string, Delta> = {
  arrowup: { dx: 0, dy: -1 },
  arrowdown: { dx: 0, dy: 1 },
  arrowleft: { dx: -1, dy: 0 },
  arrowright: { dx: 1, dy: 0 },
};
const P1_KEYS_WASD: Record<string, Delta> = {
  // top row
  q: { dx: -1, dy: -1 },
  w: { dx: 0, dy: -1 },
  e: { dx: 1, dy: -1 },
  // middle row
  a: { dx: -1, dy: 0 },
  s: { dx: 0, dy: 1 },
  d: { dx: 1, dy: 0 },
  // bottom row — diagonal helpers
  z: { dx: -1, dy: 1 },
  x: { dx: 0, dy: 1 },
  c: { dx: 1, dy: 1 },
};
const P2_KEYS = P1_KEYS_WASD;

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
  room,
}: {
  mode: Mode;
  onEnd?: (result: GameResult) => void;
  /** If set, multiplayer mode against the connected room. */
  room?: string | null;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const savedRef = useRef(false);
  const multiplayerRestartRef = useRef<(() => void) | null>(null);

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
  const [newAchievements, setNewAchievements] = useState<string[]>([]);
  const [dailyJustDone, setDailyJustDone] = useState(false);
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

    // Multiplayer mode setup. We always play "duo" in a room (2 turtles).
    const isMultiplayer = !!room && !!account;
    const gameRoom = isMultiplayer ? getGameRoom(account!.name) : null;
    const isHost = gameRoom?.state.isHost ?? true;

    // Build state — for multiplayer hosts and single-player. Clients overwrite from received state.
    let p2ClassId = "normal";
    if (mode === "duo" && typeof window !== "undefined") {
      const urlFriend = new URLSearchParams(window.location.search).get("friend");
      if (urlFriend) {
        try {
          const accountsRaw = localStorage.getItem("zolwie:zolwiki_accounts_v4");
          if (accountsRaw) {
            const accounts = JSON.parse(accountsRaw) as Record<string, { selectedClass?: string }>;
            const friendAccount = accounts[urlFriend.toLowerCase()];
            if (friendAccount?.selectedClass) p2ClassId = friendAccount.selectedClass;
          }
        } catch {}
      }
    }
    const effectiveMode: Mode = isMultiplayer ? "duo" : mode;
    let state: GameState = createState(effectiveMode, {
      selectedClassId: account?.selectedClass ?? "normal",
      p2ClassId,
    });

    // Player → turtle mapping for multiplayer.
    // Convention: host = p1 (green), first remote player = p2 (yellow).
    const playerToTurtle = new Map<string, string>(); // nameLower → turtleId
    const remoteInputs = new Map<string, { dx: -1 | 0 | 1; dy: -1 | 0 | 1 }>();
    let mpUnsub: (() => void) | null = null;
    let stateBroadcastTimer: ReturnType<typeof setInterval> | null = null;

    if (isMultiplayer && gameRoom && account) {
      const myLower = account.name.toLowerCase();
      // Host announces start with the seed so clients build the same map
      if (isHost) {
        // First two players in room → p1, p2 mapping
        const players = gameRoom.state.players.slice(0, 2);
        for (let i = 0; i < players.length; i++) {
          playerToTurtle.set(players[i].toLowerCase(), i === 0 ? "p1" : "p2");
        }
        // Broadcast start info so clients init their canvas with same seed
        gameRoom.broadcast({
          kind: "start",
          seed: state.mapSeed,
          mode: "duo",
        });
        // Re-broadcast every second for late joiners
        const startTimer = setInterval(() => {
          if (state.ended) return;
          gameRoom.broadcast({
            kind: "start",
            seed: state.mapSeed,
            mode: "duo",
          });
        }, 1000);
        // Periodic state broadcast to clients (20Hz — good middle ground for mobile bandwidth).
        // Strip particles + events (visual-only / one-shot) to save 30-50% per snapshot.
        stateBroadcastTimer = setInterval(() => {
          const snapshot = { ...state, particles: [], events: [] };
          // rng is a function, JSON.stringify drops it automatically
          gameRoom.broadcast({ kind: "state", tick: state.tick, data: snapshot as unknown as object });
        }, 50);
        mpUnsub = gameRoom.onMessage((m: { from: string; payload: GamePayload }) => {
          if (m.payload.kind === "input") {
            const fromLower = m.from.toLowerCase();
            if (fromLower === myLower) return;
            if (!playerToTurtle.has(fromLower) && playerToTurtle.size < 2) {
              playerToTurtle.set(fromLower, "p2");
            }
            remoteInputs.set(fromLower, { dx: m.payload.dx, dy: m.payload.dy });
          }
        });
        // Cleanup of startTimer
        const prev = stateBroadcastTimer;
        stateBroadcastTimer = ({
          unref() {},
          // hack to share cleanup
        } as unknown) as ReturnType<typeof setInterval>;
        const compoundCleanup = () => {
          clearInterval(prev as unknown as ReturnType<typeof setInterval>);
          clearInterval(startTimer);
        };
        // Override unsub to also clean timers
        const prevUnsub = mpUnsub;
        mpUnsub = () => {
          prevUnsub?.();
          compoundCleanup();
        };
      } else {
        // Client: wait for "start" message to know the seed, then "state" messages to render.
        let started = false;
        mpUnsub = gameRoom.onMessage((m: { from: string; payload: GamePayload }) => {
          if (m.payload.kind === "start" && !started) {
            state = createState("duo", {
              selectedClassId: account.selectedClass,
              p2ClassId,
              seed: m.payload.seed,
            });
            started = true;
          } else if (m.payload.kind === "state") {
            const snapshot = m.payload.data as unknown as GameState;
            const oldRng = state.rng;
            state = { ...snapshot, rng: oldRng };
          }
        });
        // Send my input to the host at 60Hz (mirrors local tick rate)
        let lastSentDx: number | null = null;
        let lastSentDy: number | null = null;
        const inputTimer = setInterval(() => {
          const myV = combineWithJoy(resolveVec(p1Map), p1JoyVecRef.current);
          // Only broadcast on change to save bandwidth
          if (myV.dx === lastSentDx && myV.dy === lastSentDy) return;
          lastSentDx = myV.dx;
          lastSentDy = myV.dy;
          gameRoom.broadcast({
            kind: "input",
            dx: myV.dx,
            dy: myV.dy,
            action: false,
            from: account.name,
          });
        }, 16);
        const prevUnsub2 = mpUnsub;
        mpUnsub = () => {
          prevUnsub2?.();
          clearInterval(inputTimer);
        };
      }
    }
    const inputs: Inputs = {};
    const keysDown = new Set<string>();
    // In MP each player follows THEIR own turtle (host=p1, guest=p2).
    const myTurtleIndex = isMultiplayer && !isHost ? 1 : 0;
    let camera = {
      x: (state.turtles[myTurtleIndex] ?? state.turtles[0]).pos.x - viewW / 2,
      y: (state.turtles[myTurtleIndex] ?? state.turtles[0]).pos.y - viewH / 2,
    };
    let stopped = false;
    let raf = 0;

    const isDuo = mode === "duo";
    // In online multiplayer each player controls only THEIR OWN turtle, so any key works.
    // In local duo on one keyboard we split arrows (P1) vs WASD (P2).
    const p1Map = isMultiplayer
      ? { ...P1_KEYS_ARROWS, ...P1_KEYS_WASD }
      : isDuo
        ? P1_KEYS_ARROWS
        : { ...P1_KEYS_ARROWS, ...P1_KEYS_WASD };
    const p2Map = isDuo && !isMultiplayer ? P2_KEYS : null;

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

    function resolveVec(map: Record<string, Delta>): Vec {
      let dx = 0;
      let dy = 0;
      // Iterate ALL pressed keys; deltas add up (so W+A → up-left), then clamp to -1..1.
      for (const k of keysDown) {
        const v = map[k];
        if (!v) continue;
        dx += v.dx;
        dy += v.dy;
      }
      return {
        dx: dx > 0 ? 1 : dx < 0 ? -1 : 0,
        dy: dy > 0 ? 1 : dy < 0 ? -1 : 0,
      };
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
        if (isMultiplayer && !isHost) {
          // Client: don't run engine.tick. Just consume the accumulator (state comes from network).
          accumulator -= TICK_DT;
          continue;
        }

        const k1 = resolveVec(p1Map);
        const v1 = combineWithJoy(k1, p1JoyVecRef.current);

        if (isMultiplayer && isHost && account) {
          // Host: own input → host's turtle (p1). Apply remote inputs to mapped turtles.
          inputs.p1 = { dx: v1.dx, dy: v1.dy, action: false };
          delete inputs.p2;
          for (const [nameLower, vec] of remoteInputs) {
            const turtleId = playerToTurtle.get(nameLower);
            if (!turtleId || turtleId === "p1") continue;
            inputs[turtleId] = { dx: vec.dx, dy: vec.dy, action: false };
          }
        } else {
          // Single-player path
          inputs.p1 = { dx: v1.dx, dy: v1.dy, action: false };
          if (p2Map) {
            const k2 = resolveVec(p2Map);
            const v2 = combineWithJoy(k2, p2JoyVecRef.current);
            inputs.p2 = { dx: v2.dx, dy: v2.dy, action: false };
          }
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

      const myTurtle = state.turtles[myTurtleIndex] ?? state.turtles[0];
      camera = lerpCameraToTurtle(camera, myTurtle, viewW, viewH, 0.12);
      render(ctx, state, camera, { w: viewW, h: viewH });

      if (state.tick % 6 === 0) {
        // In MP each player should see THEIR own turtle's lives (life counter is
        // personal). Scores stay split (P1/P2) so both players see both scores.
        const p1 = state.turtles[0];
        const p2 = state.turtles[1];
        const myT = isMultiplayer && !isHost ? p2 : p1;
        setHud({
          p1Score: p1.score,
          p2Score: p2 ? p2.score : 0,
          lives: myT ? myT.lives : 0,
          p2Lives: p2 ? p2.lives : 0,
          time: Math.ceil(state.timeLeftSec),
        });
      }

      if (state.ended && state.result) {
        if (!savedRef.current) {
          savedRef.current = true;
          let outcome: { newAchievements: string[]; dailyJustCompleted: boolean } = {
            newAchievements: [],
            dailyJustCompleted: false,
          };
          if (isMultiplayer) {
            // Each player saves only their own turtle's score.
            const myTurtleId = isHost ? "p1" : "p2";
            const myTurtle = state.turtles.find((t) => t.id === myTurtleId);
            if (myTurtle) {
              outcome = saveGameResult("duo", {
                score: myTurtle.score,
                won: myTurtle.score >= 10,
                maxCombo: myTurtle.maxCombo,
                goldEaten: myTurtle.goldEaten,
                powerupsPicked: myTurtle.powerupsPicked,
                combo3Count: myTurtle.combo3Count,
                gotHit: myTurtle.gotHit,
                durationSec: state.result.durationSec,
              });
            }
          } else {
            outcome = saveGameResult(mode, state.result);
          }
          setNewAchievements(outcome.newAchievements);
          setDailyJustDone(outcome.dailyJustCompleted);
        }
        setEndResult(state.result);
        onEnd?.(state.result);
      } else if (!stopped) {
        raf = requestAnimationFrame(loop);
      }
    };

    // Expose a restart hook for multiplayer host (called by EndOverlay button).
    // Resets state with a new seed and broadcasts a fresh "start" so all clients re-init.
    multiplayerRestartRef.current = () => {
      if (!isMultiplayer || !isHost || !account || !gameRoom) return;
      const newSeed = Date.now() & 0xffffffff;
      state = createState("duo", {
        selectedClassId: account.selectedClass,
        p2ClassId,
        seed: newSeed,
      });
      savedRef.current = false;
      setEndResult(null);
      gameRoom.broadcast({ kind: "start", seed: newSeed, mode: "duo" });
    };
    raf = requestAnimationFrame(loop);

    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("resize", updateSize);
      window.removeEventListener("orientationchange", updateSize);
      if (stateBroadcastTimer) clearInterval(stateBroadcastTimer);
      mpUnsub?.();
    };
  }, [mode, onEnd, room]);

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
              {mode === "duo" ? "🟢 ↑ ↓ ← →   ·   🟡 QWE ASD ZXC" : "QWE / ASD / ZXC · ↑ ↓ ← →"}
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

            {/* P2 joystick — bottom-right (amber). Hidden in online multiplayer
                (each player controls only their own turtle via the left joystick). */}
            {mode === "duo" && !room && (
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

      {endResult && (
        <EndOverlay
          result={endResult}
          mode={mode}
          isMultiplayer={!!room}
          isHost={room ? !!getCurrentAccount() : true}
          onRestart={() => multiplayerRestartRef.current?.()}
          newAchievements={newAchievements}
          dailyJustDone={dailyJustDone}
        />
      )}
    </div>
  );
}

function EndOverlay({
  result,
  mode,
  isMultiplayer,
  isHost,
  onRestart,
  newAchievements,
  dailyJustDone,
}: {
  result: GameResult;
  mode: Mode;
  isMultiplayer: boolean;
  isHost: boolean;
  onRestart: () => void;
  newAchievements: string[];
  dailyJustDone: boolean;
}) {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-emerald-950/80 backdrop-blur-sm animate-[fadeIn_0.3s] px-4 overflow-y-auto py-6">
      <div className="rounded-3xl bg-white/95 p-6 sm:p-8 max-w-md w-full text-center shadow-2xl pointer-events-auto my-auto">
        <p className="text-5xl sm:text-6xl mb-2">
          {mode === "endless" ? "♾️" : result.won ? "🏆" : "🥬"}
        </p>
        <h2 className="font-[var(--font-fraunces)] text-3xl sm:text-4xl font-semibold text-emerald-950 mb-1">
          {result.won ? "Brawo !" : "Koniec !"}
        </h2>
        <p className="text-emerald-900/70 mb-4">
          {mode === "endless"
            ? `Przeżyłeś ${result.survivedSec}s`
            : `Sałaty : ${result.score}`}
        </p>

        {/* Detailed round stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
          <StatPill emoji="🥬" label="Sałaty" value={result.score} />
          <StatPill emoji="🔥" label="Combo max" value={result.maxCombo ?? 0} />
          <StatPill emoji="🌟" label="Złote" value={result.goldEaten ?? 0} />
          <StatPill emoji="🎁" label="Power-upy" value={result.powerupsPicked ?? 0} />
        </div>

        <p className="text-emerald-700 text-sm mb-1 font-medium">
          +{result.score} 🥬 zapisane
        </p>
        {dailyJustDone && (
          <p className="text-amber-700 text-sm font-medium mb-1 animate-pulse-slow">
            🌟 Wyzwanie dnia ukończone! +100 🥬
          </p>
        )}
        {newAchievements.length > 0 && <NewMedals ids={newAchievements} />}

        <div className="flex flex-col gap-2 mt-5">
          {isMultiplayer ? (
            isHost ? (
              <button
                onClick={onRestart}
                className="rounded-full bg-emerald-700 px-6 py-3 text-white font-medium hover:bg-emerald-800 transition"
              >
                Jeszcze raz →
              </button>
            ) : (
              <p className="text-sm text-emerald-900/65 italic py-2">
                Czekamy aż host wystartuje nową grę...
              </p>
            )
          ) : (
            <button
              onClick={() => location.reload()}
              className="rounded-full bg-emerald-700 px-6 py-3 text-white font-medium hover:bg-emerald-800 transition"
            >
              Jeszcze raz →
            </button>
          )}
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

function StatPill({ emoji, label, value }: { emoji: string; label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-emerald-50 border border-emerald-100 px-2 py-2">
      <div className="text-xl sm:text-2xl">{emoji}</div>
      <div className="font-[var(--font-fraunces)] text-lg sm:text-xl font-semibold text-emerald-950 leading-none mt-0.5">
        {value}
      </div>
      <div className="text-[9px] sm:text-[10px] uppercase tracking-widest text-emerald-700/65 mt-1">
        {label}
      </div>
    </div>
  );
}

function NewMedals({ ids }: { ids: string[] }) {
  // Lazy-load achievements data — used rarely, OK to require here.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const data = require("@/data/achievements") as typeof import("@/data/achievements");
  const medals = ids
    .map((id) => data.ACHIEVEMENTS.find((a) => a.id === id))
    .filter((a): a is NonNullable<typeof a> => !!a);
  if (medals.length === 0) return null;
  return (
    <div className="mt-3 mb-1 rounded-2xl bg-gradient-to-br from-amber-50 to-yellow-100 border-2 border-amber-300 px-3 py-3 shadow-md animate-pulse-slow">
      <p className="text-[10px] uppercase tracking-widest text-amber-800/80 font-medium mb-1.5">
        🏅 Nowe odznaki ! +{medals.length * 30} 🥬
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        {medals.map((m) => (
          <div
            key={m.id}
            className="flex items-center gap-1.5 bg-white/80 rounded-full px-3 py-1 text-xs"
          >
            <span className="text-base">{m.emoji}</span>
            <span className="font-medium text-emerald-950">{m.names.pl}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
