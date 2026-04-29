// Cross-device chat: WebSocket primary → HTTP API fallback → localStorage fallback.
// Order of preference (latency-wise): WS < HTTP polling < localStorage.

import type { Message } from "./friends";
import { getMessages as lsGetMessages, sendMessage as lsSendMessage } from "./friends";
import { getChatSocket, type ChatSocket } from "./chat-ws";

const API_URL = "/api/chat/messages";

let apiHealthy = true; // optimistic — flip to false on first error, recover on next success

/** Fetch all messages between current user and `friendName`. */
export async function fetchMessages(myName: string, friendName: string): Promise<Message[]> {
  if (typeof window === "undefined") return [];
  // Try WebSocket first
  const ws = getChatSocket(myName);
  if (ws.isOpen()) {
    try {
      const messages = await ws.requestHistory(friendName);
      mirrorToLocalStorage(myName, friendName, messages);
      return messages;
    } catch {
      // fall through to HTTP
    }
  }
  if (!apiHealthy) return lsGetMessages(myName, friendName);
  try {
    const res = await fetch(
      `${API_URL}?from=${encodeURIComponent(myName)}&to=${encodeURIComponent(friendName)}`,
      { cache: "no-store" },
    );
    if (!res.ok) throw new Error(`API ${res.status}`);
    const json = (await res.json()) as { messages: Message[] };
    apiHealthy = true;
    mirrorToLocalStorage(myName, friendName, json.messages);
    return json.messages;
  } catch {
    apiHealthy = false;
    return lsGetMessages(myName, friendName);
  }
}

/** Send a message to `friendName`. Returns the persisted message or null on failure. */
export async function postMessage(
  myName: string,
  friendName: string,
  text: string,
): Promise<Message | null> {
  if (typeof window === "undefined") return null;
  const trimmed = text.trim();
  if (!trimmed) return null;
  // Prefer WebSocket
  const ws = getChatSocket(myName);
  if (ws.isOpen()) {
    const sent = await ws.sendMessage(friendName, trimmed).catch(() => null);
    if (sent) return sent;
  }
  if (!apiHealthy) {
    return lsSendMessage(friendName, trimmed);
  }
  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ from: myName, to: friendName, text: trimmed }),
    });
    if (!res.ok) throw new Error(`API ${res.status}`);
    const json = (await res.json()) as { ok: boolean; message: Message };
    apiHealthy = true;
    return json.message;
  } catch {
    apiHealthy = false;
    return lsSendMessage(friendName, trimmed);
  }
}

function mirrorToLocalStorage(myName: string, friendName: string, messages: Message[]) {
  try {
    const key = "zolwie:msg:" + [myName.toLowerCase(), friendName.toLowerCase()].sort().join("|");
    localStorage.setItem(key, JSON.stringify(messages.slice(-200)));
  } catch {}
}

export function isApiHealthy() {
  return apiHealthy;
}

/** Subscribe to incoming messages from `friendName` (WS push). Returns unsubscribe. */
export function subscribeToThread(
  myName: string,
  friendName: string,
  callback: (msg: Message) => void,
): () => void {
  if (typeof window === "undefined") return () => {};
  const ws = getChatSocket(myName);
  return ws.subscribe(friendName, callback);
}

export function isWsConnected(myName: string): boolean {
  if (typeof window === "undefined") return false;
  return getChatSocket(myName).isOpen();
}

export type { ChatSocket };
