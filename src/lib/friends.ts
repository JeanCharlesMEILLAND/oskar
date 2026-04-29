// Friends + messages — localStorage-only for now (single-browser).
// When the WebSocket server (VPS) is online, swap these for API calls.

import type { Account } from "./auth";

const SESSION_KEY = "zolwie:zolwiki_session_v4";
const ACCOUNTS_KEY = "zolwie:zolwiki_accounts_v4";
const MSG_KEY_PREFIX = "zolwie:msg:";

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

/** Send a friend request from current user to `targetName`. */
export function sendFriendRequest(targetName: string): FriendOpResult {
  if (typeof window === "undefined") return { ok: false, reason: "noSession" };
  const myName = readSessionName();
  if (!myName) return { ok: false, reason: "noSession" };
  if (!targetName.trim()) return { ok: false, reason: "empty" };

  const accounts = readAccounts();
  const myKey = myName.toLowerCase();
  const tgtKey = targetName.trim().toLowerCase();
  const me = accounts[myKey];
  const tgt = accounts[tgtKey];
  if (!me) return { ok: false, reason: "noSession" };
  if (myKey === tgtKey) return { ok: false, reason: "self" };
  if (!tgt) return { ok: false, reason: "notFound" };

  if (!me.friends) me.friends = [];
  if (!me.friendRequests) me.friendRequests = [];
  if (!tgt.friendRequests) tgt.friendRequests = [];

  if (me.friends.some((n) => n.toLowerCase() === tgtKey)) {
    return { ok: false, reason: "alreadyFriend" };
  }
  if (tgt.friendRequests.some((n) => n.toLowerCase() === myKey)) {
    return { ok: false, reason: "alreadyRequested" };
  }
  // Add my name to target's incoming requests (preserve original casing)
  tgt.friendRequests.push(me.name);
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
