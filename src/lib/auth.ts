// Auth logic — keeps localStorage shape COMPATIBLE with the legacy game.
// When a session is set here, the legacy game reads the same keys and skips its own auth screen.

import { updateDaily } from "./daily";
import { checkAchievements } from "./achievements";
import { CODES, type CodeReward } from "@/data/codes";
import { TURTLES } from "@/data/turtles";
import { ACHIEVEMENTS } from "@/data/achievements";

const SESSION_KEY = "zolwie:zolwiki_session_v4";
const ACCOUNTS_KEY = "zolwie:zolwiki_accounts_v4";

export type Account = {
  name: string;
  salt: string;
  pwHash: string;
  totalEver: number;
  totalEverEaten: number;
  soloBest: number;
  duoBest: number;
  endlessBest: number;
  owned: Record<string, boolean>;
  selectedClass: string;
  starterShown: boolean;
  ach: Record<string, number>;
  stats: { powerups: number; gold: number; wins: number };
  daily: { day: string; progress: number; claimed: boolean };
  avatar: string;
  friends: string[];
  friendRequests: string[];
  redeemed?: Record<string, true>;
};

export type Session = {
  name: string;
  lang: "pl" | "fr";
  isAdmin: boolean;
  soundOn: boolean;
};

export type AuthError =
  | "empty"
  | "badLogin"
  | "exists"
  | "passMatch"
  | "passShort"
  | "fileBad";

export type AuthResult = { ok: true; account: Account } | { ok: false; error: AuthError };

// DJB2-like double hash — same algorithm as legacy gra_zolwiki_v10.html line 341.
export function hashPw(pw: string, salt: string): string {
  let h1 = 5381;
  const s = salt + ":" + pw + ":" + salt;
  for (let i = 0; i < s.length; i++) {
    h1 = ((h1 << 5) + h1) ^ s.charCodeAt(i);
    h1 = h1 & 0xffffffff;
  }
  let h2 = 0x9e3779b9;
  const s2 = h1.toString(16) + s + s.length;
  for (let i = 0; i < s2.length; i++) {
    h2 = ((h2 << 5) + h2) ^ s2.charCodeAt(i);
    h2 = h2 & 0xffffffff;
  }
  return (h1 >>> 0).toString(16) + ":" + (h2 >>> 0).toString(16);
}

export function makeSalt(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function readAccounts(): Record<string, Account> {
  try {
    const raw = localStorage.getItem(ACCOUNTS_KEY);
    return raw ? (JSON.parse(raw) as Record<string, Account>) : {};
  } catch {
    return {};
  }
}

function writeAccounts(accounts: Record<string, Account>) {
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
}

function readSession(): Session {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<Session>;
      return {
        name: parsed.name ?? "",
        lang: parsed.lang === "fr" ? "fr" : "pl",
        isAdmin: !!parsed.isAdmin,
        soundOn: parsed.soundOn !== false,
      };
    }
  } catch {}
  return { name: "", lang: "pl", isAdmin: false, soundOn: true };
}

function writeSession(session: Session) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function login(name: string, pw: string, lang: "pl" | "fr"): AuthResult {
  if (!name || !pw) return { ok: false, error: "empty" };
  const accounts = readAccounts();
  const a = accounts[name.toLowerCase()];
  if (!a) return { ok: false, error: "badLogin" };
  if (hashPw(pw, a.salt) !== a.pwHash) return { ok: false, error: "badLogin" };
  const session = readSession();
  session.name = a.name;
  session.lang = lang;
  writeSession(session);
  return { ok: true, account: a };
}

export function register(
  name: string,
  pw: string,
  pwConfirm: string,
  lang: "pl" | "fr",
): AuthResult {
  if (!name || !pw) return { ok: false, error: "empty" };
  if (pw.length < 4) return { ok: false, error: "passShort" };
  if (pw !== pwConfirm) return { ok: false, error: "passMatch" };
  const accounts = readAccounts();
  const key = name.toLowerCase();
  if (accounts[key]) return { ok: false, error: "exists" };
  const salt = makeSalt();
  const account: Account = {
    name,
    salt,
    pwHash: hashPw(pw, salt),
    totalEver: 50,
    totalEverEaten: 0,
    soloBest: 0,
    duoBest: 0,
    endlessBest: 0,
    owned: { normal: true },
    selectedClass: "normal",
    starterShown: false,
    ach: {},
    stats: { powerups: 0, gold: 0, wins: 0 },
    daily: { day: todayKey(), progress: 0, claimed: false },
    avatar: "green",
    friends: [],
    friendRequests: [],
  };
  accounts[key] = account;
  writeAccounts(accounts);
  const session = readSession();
  session.name = account.name;
  session.lang = lang;
  writeSession(session);
  return { ok: true, account };
}

export function importAccount(json: string, lang: "pl" | "fr"): AuthResult {
  try {
    const data = JSON.parse(json) as Account;
    if (
      !data ||
      typeof data.name !== "string" ||
      typeof data.salt !== "string" ||
      typeof data.pwHash !== "string"
    ) {
      return { ok: false, error: "fileBad" };
    }
    const accounts = readAccounts();
    accounts[data.name.toLowerCase()] = data;
    writeAccounts(accounts);
    const session = readSession();
    session.name = data.name;
    session.lang = lang;
    writeSession(session);
    return { ok: true, account: data };
  } catch {
    return { ok: false, error: "fileBad" };
  }
}

export function getCurrentSession(): Session {
  if (typeof window === "undefined") {
    return { name: "", lang: "pl", isAdmin: false, soundOn: true };
  }
  return readSession();
}

export function getCurrentAccount(): Account | null {
  if (typeof window === "undefined") return null;
  const session = readSession();
  if (!session.name) return null;
  const accounts = readAccounts();
  return accounts[session.name.toLowerCase()] ?? null;
}

export function downloadAccountBackup(account: Account) {
  const blob = new Blob([JSON.stringify(account, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `zolwie-${account.name}-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function logout() {
  const session = readSession();
  session.name = "";
  session.isAdmin = false;
  writeSession(session);
}

const ADMIN_CODE = "oskar843";

export function tryBecomeAdmin(code: string): boolean {
  if (typeof window === "undefined") return false;
  if (code.trim().toLowerCase() !== ADMIN_CODE) return false;
  const session = readSession();
  session.isAdmin = true;
  writeSession(session);
  return true;
}

export function isAdmin(): boolean {
  if (typeof window === "undefined") return false;
  return !!readSession().isAdmin;
}

export type RedeemResult =
  | { ok: true; reward: CodeReward }
  | { ok: false; reason: "noSession" | "unknown" | "already" };

export function tryRedeemCode(rawCode: string): RedeemResult {
  if (typeof window === "undefined") return { ok: false, reason: "unknown" };
  const code = rawCode.trim().toLowerCase();
  const reward = CODES[code];
  if (!reward) return { ok: false, reason: "unknown" };

  const session = readSession();
  if (!session.name) return { ok: false, reason: "noSession" };
  const accounts = readAccounts();
  const a = accounts[session.name.toLowerCase()];
  if (!a) return { ok: false, reason: "noSession" };

  if (!a.redeemed) a.redeemed = {};
  if (!reward.repeatable && a.redeemed[reward.id]) {
    return { ok: false, reason: "already" };
  }
  // Mark only one-shot codes; repeatable codes can be redeemed unlimited times
  if (!reward.repeatable) a.redeemed[reward.id] = true;

  // Full reset: wipe stats but keep identity (name/password/friends/avatar)
  if (reward.reset) {
    a.totalEver = 0;
    a.totalEverEaten = 0;
    a.soloBest = 0;
    a.duoBest = 0;
    a.endlessBest = 0;
    a.owned = { normal: true };
    a.selectedClass = "normal";
    a.ach = {};
    a.stats = { powerups: 0, gold: 0, wins: 0 };
    a.daily = { day: todayKey(), progress: 0, claimed: false };
    a.redeemed = {}; // re-enable one-shot codes
  }

  if (reward.coins) {
    a.totalEver += reward.coins;
    a.totalEverEaten += reward.coins;
  }
  if (typeof reward.setCoins === "number") {
    a.totalEver = reward.setCoins;
  }
  if (reward.classes && reward.classes.length > 0) {
    if (!a.owned) a.owned = {};
    for (const c of reward.classes) a.owned[c] = true;
  }
  if (reward.unlockAllClasses) {
    if (!a.owned) a.owned = {};
    for (const t of TURTLES) a.owned[t.id] = true;
  }
  if (reward.unlockAllAchievements) {
    if (!a.ach) a.ach = {};
    for (const ach of ACHIEVEMENTS) a.ach[ach.id] = 1;
  }
  if (typeof reward.setMinXp === "number") {
    a.totalEverEaten = Math.max(a.totalEverEaten ?? 0, reward.setMinXp);
  }
  if (reward.admin) {
    const session = readSession();
    session.isAdmin = true;
    writeSession(session);
  }
  writeAccounts(accounts);
  return { ok: true, reward };
}

export function levelFromXp(xp: number): { level: number; currentXp: number; neededXp: number } {
  let lvl = 1;
  let need = 0;
  while (xp >= need + lvl * 10) {
    need += lvl * 10;
    lvl++;
    if (lvl > 100) break;
  }
  return { level: lvl, currentXp: xp - need, neededXp: lvl * 10 };
}

export type GameResult = {
  score: number;
  survivedSec?: number;
  won: boolean;
  // Per-round counters used by achievements + daily
  maxCombo?: number;
  goldEaten?: number;
  powerupsPicked?: number;
  combo3Count?: number;
  gotHit?: boolean;
  durationSec?: number;
};

export type ShopResult = { ok: true; account: Account } | { ok: false; reason: "noSession" | "alreadyOwned" | "notEnough" | "unknown" };

export function buyClass(id: string, price: number): ShopResult {
  if (typeof window === "undefined") return { ok: false, reason: "unknown" };
  const session = readSession();
  if (!session.name) return { ok: false, reason: "noSession" };
  const accounts = readAccounts();
  const a = accounts[session.name.toLowerCase()];
  if (!a) return { ok: false, reason: "noSession" };
  if (a.owned[id]) return { ok: false, reason: "alreadyOwned" };
  if (a.totalEver < price) return { ok: false, reason: "notEnough" };
  a.totalEver -= price;
  a.owned[id] = true;
  writeAccounts(accounts);
  return { ok: true, account: a };
}

export function selectClass(id: string): ShopResult {
  if (typeof window === "undefined") return { ok: false, reason: "unknown" };
  const session = readSession();
  if (!session.name) return { ok: false, reason: "noSession" };
  const accounts = readAccounts();
  const a = accounts[session.name.toLowerCase()];
  if (!a) return { ok: false, reason: "noSession" };
  if (!a.owned[id]) return { ok: false, reason: "alreadyOwned" }; // misnamed but means "not owned"
  a.selectedClass = id;
  writeAccounts(accounts);
  return { ok: true, account: a };
}

export type SaveOutcome = {
  newAchievements: string[];
  dailyJustCompleted: boolean;
};

export function saveGameResult(
  mode: "solo" | "duo" | "endless",
  result: GameResult,
): SaveOutcome {
  const out: SaveOutcome = { newAchievements: [], dailyJustCompleted: false };
  if (typeof window === "undefined") return out;
  const session = readSession();
  if (!session.name) return out;
  const accounts = readAccounts();
  const key = session.name.toLowerCase();
  const a = accounts[key];
  if (!a) return out;

  if (mode === "solo") a.soloBest = Math.max(a.soloBest, result.score);
  else if (mode === "duo") a.duoBest = Math.max(a.duoBest, result.score);
  else if (mode === "endless" && typeof result.survivedSec === "number") {
    a.endlessBest = Math.max(a.endlessBest, result.survivedSec);
  }

  // 1 saladocoin per lettuce eaten
  a.totalEver += result.score;
  a.totalEverEaten += result.score;

  // Stats
  if (!a.stats) a.stats = { powerups: 0, gold: 0, wins: 0 };
  if (result.won) a.stats.wins = (a.stats.wins ?? 0) + 1;
  a.stats.powerups = (a.stats.powerups ?? 0) + (result.powerupsPicked ?? 0);
  a.stats.gold = (a.stats.gold ?? 0) + (result.goldEaten ?? 0);

  const dailyOut = updateDaily(a, mode, result);
  out.dailyJustCompleted = dailyOut.justCompleted;
  out.newAchievements = checkAchievements(a, { mode, result });

  writeAccounts(accounts);
  return out;
}

export function checkAchievementsAfterShop(): string[] {
  if (typeof window === "undefined") return [];
  const session = readSession();
  if (!session.name) return [];
  const accounts = readAccounts();
  const a = accounts[session.name.toLowerCase()];
  if (!a) return [];
  const newly = checkAchievements(a, {});
  if (newly.length > 0) writeAccounts(accounts);
  return newly;
}
