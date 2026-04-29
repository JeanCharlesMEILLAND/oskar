// WebSocket client for Żarłoczne Żółwie chat.
// Connects to NEXT_PUBLIC_WS_URL (e.g. wss://ws.zarlocznezolwie.com).
// Auto-reconnects with exponential backoff. Falls back gracefully if the WS server is unreachable.

import type { Message } from "./friends";

const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? "";

type IncomingMsg =
  | { type: "ready"; name: string }
  | { type: "history"; with: string; messages: Message[] }
  | { type: "msg"; from: string; to: string; text: string; ts: number }
  | { type: "error"; reason: string }
  | { type: "pong" };

type Subscriber = (msg: Message) => void;

export type ChatSocket = {
  isOpen(): boolean;
  requestHistory(peer: string): Promise<Message[]>;
  sendMessage(to: string, text: string): Promise<Message | null>;
  subscribe(peer: string, cb: Subscriber): () => void;
  close(): void;
};

let instance: { socket: ChatSocket; name: string } | null = null;

/**
 * Returns a singleton ChatSocket for the given user.
 * If the user changes (logout/login), the previous socket is closed and a new one created.
 */
export function getChatSocket(myName: string): ChatSocket {
  if (instance && instance.name.toLowerCase() === myName.toLowerCase()) {
    return instance.socket;
  }
  // Different user → close the old, create new
  instance?.socket.close();
  if (!WS_URL) {
    instance = { socket: createDeadSocket(), name: myName };
    return instance.socket;
  }
  instance = { socket: createLiveSocket(myName), name: myName };
  return instance.socket;
}

// =============== Live (WebSocket) ===============

function createLiveSocket(myName: string): ChatSocket {
  let ws: WebSocket | null = null;
  let open = false;
  let reconnectAttempt = 0;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let pendingHistory: Map<string, (m: Message[]) => void> = new Map();
  let pendingHistoryRejects: Map<string, () => void> = new Map();
  const subscribers = new Map<string, Set<Subscriber>>(); // peer (lowercased) → callbacks
  let pingTimer: ReturnType<typeof setInterval> | null = null;
  let closedByUser = false;

  function connect() {
    if (closedByUser) return;
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
      // Keepalive ping every 25s
      if (pingTimer) clearInterval(pingTimer);
      pingTimer = setInterval(() => {
        if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: "ping" }));
      }, 25000);
    });
    ws.addEventListener("message", (ev) => {
      let msg: IncomingMsg;
      try {
        msg = JSON.parse(ev.data);
      } catch {
        return;
      }
      if (msg.type === "history") {
        const resolve = pendingHistory.get(msg.with.toLowerCase());
        if (resolve) {
          resolve(msg.messages);
          pendingHistory.delete(msg.with.toLowerCase());
          pendingHistoryRejects.delete(msg.with.toLowerCase());
        }
      } else if (msg.type === "msg") {
        // Broadcast to subscribers of either peer (sender or receiver)
        const peerLower =
          msg.from.toLowerCase() === myName.toLowerCase()
            ? msg.to.toLowerCase()
            : msg.from.toLowerCase();
        const subs = subscribers.get(peerLower);
        if (subs) for (const cb of subs) cb({ from: msg.from, text: msg.text, ts: msg.ts });
      }
    });
    ws.addEventListener("close", () => {
      open = false;
      if (pingTimer) clearInterval(pingTimer);
      // Reject pending history requests
      for (const [, reject] of pendingHistoryRejects) reject();
      pendingHistory.clear();
      pendingHistoryRejects.clear();
      if (!closedByUser) scheduleReconnect();
    });
    ws.addEventListener("error", () => {
      try {
        ws?.close();
      } catch {}
    });
  }

  function scheduleReconnect() {
    if (closedByUser) return;
    if (reconnectTimer) return;
    const delay = Math.min(30000, 1000 * Math.pow(2, reconnectAttempt));
    reconnectAttempt++;
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      connect();
    }, delay);
  }

  connect();

  return {
    isOpen: () => open,
    requestHistory: (peer: string) =>
      new Promise<Message[]>((resolve, reject) => {
        if (!open || !ws) return reject(new Error("not_open"));
        pendingHistory.set(peer.toLowerCase(), resolve);
        pendingHistoryRejects.set(peer.toLowerCase(), () => reject(new Error("disconnected")));
        ws.send(JSON.stringify({ type: "history", with: peer }));
        // Timeout after 8s
        setTimeout(() => {
          if (pendingHistory.has(peer.toLowerCase())) {
            pendingHistory.delete(peer.toLowerCase());
            pendingHistoryRejects.delete(peer.toLowerCase());
            reject(new Error("history_timeout"));
          }
        }, 8000);
      }),
    sendMessage: (to: string, text: string) =>
      new Promise<Message | null>((resolve) => {
        if (!open || !ws) return resolve(null);
        // Listen for the echo coming back (server echoes to sender)
        const peerLower = to.toLowerCase();
        let resolved = false;
        const off = (() => {
          const subs = subscribers.get(peerLower) ?? new Set<Subscriber>();
          subscribers.set(peerLower, subs);
          const handler: Subscriber = (m) => {
            if (m.from.toLowerCase() === myName.toLowerCase() && m.text === text) {
              if (!resolved) {
                resolved = true;
                resolve(m);
              }
            }
          };
          subs.add(handler);
          return () => subs.delete(handler);
        })();
        ws.send(JSON.stringify({ type: "send", to, text }));
        // Timeout: resolve null after 5s if no echo (caller falls back to HTTP)
        setTimeout(() => {
          off();
          if (!resolved) resolve(null);
        }, 5000);
      }),
    subscribe: (peer: string, cb: Subscriber) => {
      const peerLower = peer.toLowerCase();
      let subs = subscribers.get(peerLower);
      if (!subs) {
        subs = new Set();
        subscribers.set(peerLower, subs);
      }
      subs.add(cb);
      return () => {
        subs?.delete(cb);
        if (subs && subs.size === 0) subscribers.delete(peerLower);
      };
    },
    close: () => {
      closedByUser = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (pingTimer) clearInterval(pingTimer);
      try {
        ws?.close();
      } catch {}
    },
  };
}

// =============== Dead (no-op) socket — used when NEXT_PUBLIC_WS_URL is unset ===============

function createDeadSocket(): ChatSocket {
  return {
    isOpen: () => false,
    requestHistory: () => Promise.reject(new Error("ws_disabled")),
    sendMessage: () => Promise.resolve(null),
    subscribe: () => () => {},
    close: () => {},
  };
}
