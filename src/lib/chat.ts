// Cross-device chat: API-first with localStorage fallback.
// Falls back transparently if the API is unreachable (offline, DATABASE_URL missing, etc.).

import type { Message } from "./friends";
import { getMessages as lsGetMessages, sendMessage as lsSendMessage } from "./friends";

const API_URL = "/api/chat/messages";

let apiHealthy = true; // optimistic — flip to false on first error, recover on next success

/** Fetch all messages between current user and `friendName`. */
export async function fetchMessages(myName: string, friendName: string): Promise<Message[]> {
  if (typeof window === "undefined") return [];
  if (!apiHealthy) return lsGetMessages(myName, friendName);
  try {
    const res = await fetch(
      `${API_URL}?from=${encodeURIComponent(myName)}&to=${encodeURIComponent(friendName)}`,
      { cache: "no-store" },
    );
    if (!res.ok) throw new Error(`API ${res.status}`);
    const json = (await res.json()) as { messages: Message[] };
    apiHealthy = true;
    // Cache mirror in localStorage so the user can reread offline
    try {
      const key = "zolwie:msg:" + [myName.toLowerCase(), friendName.toLowerCase()].sort().join("|");
      localStorage.setItem(key, JSON.stringify(json.messages.slice(-200)));
    } catch {}
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

export function isApiHealthy() {
  return apiHealthy;
}
