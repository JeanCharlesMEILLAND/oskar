// Multiplayer game-room client. Reuses the WS connection from chat-ws but with its own
// message protocol (room_*) and a simple event emitter.

import { getChatSocket } from "./chat-ws";

const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? "";

// Wire types — must match server/ws-server.ts
export type GamePayload =
  | { kind: "state"; tick: number; data: unknown }
  | { kind: "input"; dx: -1 | 0 | 1; dy: -1 | 0 | 1; action: boolean; from: string }
  | { kind: "start"; seed: number; mode: "duo" | "endless" }
  | { kind: "ping" };

type ServerMsg =
  | { type: "room_created"; code: string }
  | { type: "room_joined"; code: string; isHost: boolean; players: string[] }
  | { type: "room_left" }
  | { type: "room_player_joined"; name: string; players: string[] }
  | { type: "room_player_left"; name: string; players: string[]; newHost?: string }
  | { type: "room_message"; from: string; payload: GamePayload }
  | { type: "error"; reason: string };

export type RoomState = {
  code: string | null;
  isHost: boolean;
  players: string[];
};

type Listener<T> = (e: T) => void;

export type GameRoom = {
  state: RoomState;
  isOpen(): boolean;
  /** Create a new room. Resolves with the code or rejects on error. */
  create(): Promise<string>;
  /** Join an existing room by code. */
  join(code: string): Promise<void>;
  leave(): void;
  /** Broadcast a payload to all other players in the room. */
  broadcast(payload: GamePayload): void;
  /** Subscribe to incoming messages from peers. */
  onMessage(cb: Listener<{ from: string; payload: GamePayload }>): () => void;
  /** Subscribe to player join/leave events. */
  onRoomChange(cb: Listener<RoomState>): () => void;
};

let instance: { room: GameRoom; name: string } | null = null;

export function getGameRoom(myName: string): GameRoom {
  if (instance && instance.name.toLowerCase() === myName.toLowerCase()) {
    return instance.room;
  }
  instance = { room: createGameRoom(myName), name: myName };
  return instance.room;
}

function createGameRoom(myName: string): GameRoom {
  // Reuse the ChatSocket — it already maintains the connection.
  // We wire our own listener via the underlying WebSocket (we'll attach via ChatSocket internals
  // by going through the raw socket). For simplicity we open a SECOND socket dedicated to game.
  let ws: WebSocket | null = null;
  let open = false;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let reconnectAttempt = 0;
  let closedByUser = false;

  const state: RoomState = { code: null, isHost: false, players: [] };
  const messageListeners = new Set<Listener<{ from: string; payload: GamePayload }>>();
  const roomChangeListeners = new Set<Listener<RoomState>>();

  // Pending promises for create/join responses
  let pendingCreate: { resolve: (code: string) => void; reject: (e: Error) => void } | null = null;
  let pendingJoin: { resolve: () => void; reject: (e: Error) => void } | null = null;

  function emitRoomChange() {
    for (const cb of roomChangeListeners) cb({ ...state, players: [...state.players] });
  }

  function connect() {
    if (closedByUser) return;
    if (!WS_URL) return;
    try {
      ws = new WebSocket(WS_URL);
    } catch {
      scheduleReconnect();
      return;
    }
    ws.addEventListener("open", () => {
      open = true;
      reconnectAttempt = 0;
      ws?.send(JSON.stringify({ type: "auth", name: myName }));
    });
    ws.addEventListener("message", (ev) => {
      let msg: ServerMsg;
      try {
        msg = JSON.parse(ev.data);
      } catch {
        return;
      }
      if (msg.type === "room_created") {
        state.code = msg.code;
        state.isHost = true;
        state.players = [myName];
        emitRoomChange();
        pendingCreate?.resolve(msg.code);
        pendingCreate = null;
      } else if (msg.type === "room_joined") {
        state.code = msg.code;
        state.isHost = msg.isHost;
        state.players = msg.players;
        emitRoomChange();
        pendingJoin?.resolve();
        pendingJoin = null;
      } else if (msg.type === "room_left") {
        state.code = null;
        state.isHost = false;
        state.players = [];
        emitRoomChange();
      } else if (msg.type === "room_player_joined") {
        state.players = msg.players;
        emitRoomChange();
      } else if (msg.type === "room_player_left") {
        state.players = msg.players;
        if (msg.newHost && msg.newHost.toLowerCase() === myName.toLowerCase()) {
          state.isHost = true;
        }
        emitRoomChange();
      } else if (msg.type === "room_message") {
        for (const cb of messageListeners) cb({ from: msg.from, payload: msg.payload });
      } else if (msg.type === "error") {
        if (pendingCreate) {
          pendingCreate.reject(new Error(msg.reason));
          pendingCreate = null;
        }
        if (pendingJoin) {
          pendingJoin.reject(new Error(msg.reason));
          pendingJoin = null;
        }
      }
    });
    ws.addEventListener("close", () => {
      open = false;
      // If we were in a room, clear local state
      if (state.code) {
        state.code = null;
        state.isHost = false;
        state.players = [];
        emitRoomChange();
      }
      if (!closedByUser) scheduleReconnect();
    });
    ws.addEventListener("error", () => {
      try {
        ws?.close();
      } catch {}
    });
  }

  function scheduleReconnect() {
    if (closedByUser || reconnectTimer) return;
    const delay = Math.min(15000, 1000 * Math.pow(2, reconnectAttempt));
    reconnectAttempt++;
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      connect();
    }, delay);
  }

  // Touch chat socket to keep auth alive on the same WS_URL — no-op if already connected
  if (typeof window !== "undefined") getChatSocket(myName);

  connect();

  return {
    state,
    isOpen: () => open,
    create: () =>
      new Promise<string>((resolve, reject) => {
        if (!open || !ws) return reject(new Error("not_open"));
        pendingCreate = { resolve, reject };
        ws.send(JSON.stringify({ type: "room_create" }));
        setTimeout(() => {
          if (pendingCreate) {
            pendingCreate.reject(new Error("timeout"));
            pendingCreate = null;
          }
        }, 5000);
      }),
    join: (code: string) =>
      new Promise<void>((resolve, reject) => {
        if (!open || !ws) return reject(new Error("not_open"));
        pendingJoin = { resolve, reject };
        ws.send(JSON.stringify({ type: "room_join", code: code.trim().toUpperCase() }));
        setTimeout(() => {
          if (pendingJoin) {
            pendingJoin.reject(new Error("timeout"));
            pendingJoin = null;
          }
        }, 5000);
      }),
    leave: () => {
      if (open && ws) ws.send(JSON.stringify({ type: "room_leave" }));
      state.code = null;
      state.isHost = false;
      state.players = [];
      emitRoomChange();
    },
    broadcast: (payload: GamePayload) => {
      if (!open || !ws || !state.code) return;
      ws.send(JSON.stringify({ type: "room_broadcast", payload }));
    },
    onMessage: (cb) => {
      messageListeners.add(cb);
      return () => messageListeners.delete(cb);
    },
    onRoomChange: (cb) => {
      roomChangeListeners.add(cb);
      cb({ ...state, players: [...state.players] });
      return () => roomChangeListeners.delete(cb);
    },
  };
}
