// Friends + messages.
// Friend graph (requests, list) lives in Neon via /api/friends — cross-device.
// Messages still live in localStorage for now (chat already has its own WS path).

import type { Account } from "./auth";

const SESSION_KEY = "zolwie:zolwiki_session_v4";
const ACCOUNTS_KEY = "zolwie:zolwiki_accounts_v4";
const MSG_KEY_PREFIX = "zolwie:msg:";

// =============== HTTP-backed friend graph (cross-device) ===============

export type ServerFriendOpResult =
  | { ok: true; mutual?: boolean }
  | { ok: false; reason: "self" | "alreadyFriend" | "noSession" | "empty" | "network" };

async function postFriendsApi(body: Record<string, string>): Promise<Response> {
  return fetch("/api/friends", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function fetchFriendGraph(me: string): Promise<{ friends: string[]; requests: string[] } | null> {
  try {
    const r = await fetch(`/api/friends?me=${encodeURIComponent(me)}`);
    if (!r.ok) return null;
    const data = (await r.json()) as { friends?: string[]; requests?: string[] };
    return { friends: data.friends ?? [], requests: data.requests ?? [] };
  } catch {
    return null;
  }
}

export async function sendFriendRequestApi(targetName: string): Promise<ServerFriendOpResult> {
  if (typeof window === "undefined") return { ok: false, reason: "noSession" };
  const myName = readSessionName();
  if (!myName) return { ok: false, reason: "noSession" };
  const trimmed = targetName.trim();
  if (!trimmed) return { ok: false, reason: "empty" };
  if (trimmed.toLowerCase() === myName.toLowerCase()) return { ok: false, reason: "self" };
  try {
    const r = await postFriendsApi({ action: "request", from: myName, to: trimmed });
    if (!r.ok) {
      const j = (await r.json().catch(() => null)) as { error?: string } | null;
      const err = j?.error;
      if (err === "self") return { ok: false, reason: "self" };
      if (err === "alreadyFriend") return { ok: false, reason: "alreadyFriend" };
      return { ok: false, reason: "network" };
    }
    const j = (await r.json()) as { ok: boolean; mutual?: boolean };
    return { ok: true, mutual: !!j.mutual };
  } catch {
    return { ok: false, reason: "network" };
  }
}

export async function acceptFriendRequestApi(fromName: string): Promise<boolean> {
  const me = readSessionName();
  if (!me) return false;
  try {
    const r = await postFriendsApi({ action: "accept", me, from: fromName });
    return r.ok;
  } catch {
    return false;
  }
}

export async function declineFriendRequestApi(fromName: string): Promise<boolean> {
  const me = readSessionName();
  if (!me) return false;
  try {
    const r = await postFriendsApi({ action: "decline", me, from: fromName });
    return r.ok;
  } catch {
    return false;
  }
}

export async function removeFriendApi(friendName: string): Promise<boolean> {
  const me = readSessionName();
  if (!me) return false;
  try {
    const r = await postFriendsApi({ action: "remove", me, friend: friendName });
    return r.ok;
  } catch {
    return false;
  }
}

export type Message = { from: string; text: string; ts: number };

export type FriendOpResult =
  | { ok: true; account: Account }
  | { ok: false; reason: "noSession" | "notFound" | "self" | "alreadyFriend" | "alreadyRequested" | "noRequest" | "empty" };

function readAccounts(): Record<string, Account> {
  try {
    const raw = localStorage.getItem(ACCOUNTS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeAccounts(accounts: Record<string, Account>) {
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
}

function readSessionName(): string {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return "";
    const s = JSON.parse(raw);
    return typeof s.name === "string" ? s.name : "";
  } catch {
    return "";
  }
}

/**
 * Add a friend by name. Behavior:
 * - If the target account exists in this browser → both become friends immediately (no handshake).
 * - If not → only add to my list (the other side will pair up if they ever register on this device).
 *
 * This pragmatic approach "just works" for kids testing the chat. When the WebSocket server is
 * online, this will be replaced with proper request/accept across devices.
 */
export function sendFriendRequest(targetName: string): FriendOpResult {
  if (typeof window === "undefined") return { ok: false, reason: "noSession" };
  const myName = readSessionName();
  if (!myName) return { ok: false, reason: "noSession" };
  const trimmedTarget = targetName.trim();
  if (!trimmedTarget) return { ok: false, reason: "empty" };

  const accounts = readAccounts();
  const myKey = myName.toLowerCase();
  const tgtKey = trimmedTarget.toLowerCase();
  const me = accounts[myKey];
  const tgt = accounts[tgtKey];
  if (!me) return { ok: false, reason: "noSession" };
  if (myKey === tgtKey) return { ok: false, reason: "self" };

  if (!me.friends) me.friends = [];
  if (me.friends.some((n) => n.toLowerCase() === tgtKey)) {
    return { ok: false, reason: "alreadyFriend" };
  }

  // Add to my friends list (preserve casing — use target's stored name if it exists)
  me.friends.push(tgt ? tgt.name : trimmedTarget);

  // If the other account exists on this device, mirror the friendship (instant pair)
  if (tgt) {
    if (!tgt.friends) tgt.friends = [];
    if (!tgt.friends.some((n) => n.toLowerCase() === myKey)) {
      tgt.friends.push(me.name);
    }
  }

  writeAccounts(accounts);
  return { ok: true, account: me };
}

export function acceptFriendRequest(fromName: string): FriendOpResult {
  if (typeof window === "undefined") return { ok: false, reason: "noSession" };
  const myName = readSessionName();
  if (!myName) return { ok: false, reason: "noSession" };

  const accounts = readAccounts();
  const myKey = myName.toLowerCase();
  const fromKey = fromName.toLowerCase();
  const me = accounts[myKey];
  const them = accounts[fromKey];
  if (!me) return { ok: false, reason: "noSession" };
  if (!me.friendRequests) me.friendRequests = [];
  if (!me.friendRequests.some((n) => n.toLowerCase() === fromKey)) {
    return { ok: false, reason: "noRequest" };
  }

  // Remove from incoming requests
  me.friendRequests = me.friendRequests.filter((n) => n.toLowerCase() !== fromKey);
  if (!me.friends) me.friends = [];
  if (!me.friends.some((n) => n.toLowerCase() === fromKey)) {
    me.friends.push(them ? them.name : fromName);
  }

  // Mirror on the other account if it exists
  if (them) {
    if (!them.friends) them.friends = [];
    if (!them.friends.some((n) => n.toLowerCase() === myKey)) {
      them.friends.push(me.name);
    }
  }

  writeAccounts(accounts);
  return { ok: true, account: me };
}

export function declineFriendRequest(fromName: string): FriendOpResult {
  if (typeof window === "undefined") return { ok: false, reason: "noSession" };
  const myName = readSessionName();
  if (!myName) return { ok: false, reason: "noSession" };
  const accounts = readAccounts();
  const me = accounts[myName.toLowerCase()];
  if (!me) return { ok: false, reason: "noSession" };
  if (!me.friendRequests) me.friendRequests = [];
  const fromKey = fromName.toLowerCase();
  me.friendRequests = me.friendRequests.filter((n) => n.toLowerCase() !== fromKey);
  writeAccounts(accounts);
  return { ok: true, account: me };
}

export function removeFriend(friendName: string): FriendOpResult {
  if (typeof window === "undefined") return { ok: false, reason: "noSession" };
  const myName = readSessionName();
  if (!myName) return { ok: false, reason: "noSession" };
  const accounts = readAccounts();
  const myKey = myName.toLowerCase();
  const friendKey = friendName.toLowerCase();
  const me = accounts[myKey];
  const them = accounts[friendKey];
  if (!me) return { ok: false, reason: "noSession" };
  if (!me.friends) me.friends = [];
  me.friends = me.friends.filter((n) => n.toLowerCase() !== friendKey);
  if (them) {
    if (!them.friends) them.friends = [];
    them.friends = them.friends.filter((n) => n.toLowerCase() !== myKey);
  }
  writeAccounts(accounts);
  return { ok: true, account: me };
}

// =============== Messaging (localStorage thread) ===============

function threadKey(a: string, b: string): string {
  const [x, y] = [a.toLowerCase(), b.toLowerCase()].sort();
  return MSG_KEY_PREFIX + x + "|" + y;
}

export function getMessages(myName: string, friendName: string): Message[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(threadKey(myName, friendName));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (m): m is Message =>
        m && typeof m.from === "string" && typeof m.text === "string" && typeof m.ts === "number",
    );
  } catch {
    return [];
  }
}

export function sendMessage(friendName: string, text: string): Message | null {
  if (typeof window === "undefined") return null;
  const trimmed = text.trim();
  if (!trimmed) return null;
  const myName = readSessionName();
  if (!myName) return null;
  const msgs = getMessages(myName, friendName);
  const msg: Message = { from: myName, text: trimmed.slice(0, 500), ts: Date.now() };
  msgs.push(msg);
  // Cap at 200 messages per thread to avoid bloat
  const trimmedThread = msgs.slice(-200);
  try {
    localStorage.setItem(threadKey(myName, friendName), JSON.stringify(trimmedThread));
  } catch {}
  return msg;
}

export function unreadCountFor(myName: string, friendName: string, lastSeenTs: number): number {
  return getMessages(myName, friendName).filter(
    (m) => m.from.toLowerCase() !== myName.toLowerCase() && m.ts > lastSeenTs,
  ).length;
}
