// Auth logic — keeps localStorage shape COMPATIBLE with the legacy game.
// When a session is set here, the legacy game (loaded via iframe at /play)
// reads the same keys and skips its own auth screen.

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
  writeSession(session);
}

export type GameResult = {
  score: number;
  survivedSec?: number;
  won: boolean;
};

export function saveGameResult(mode: "solo" | "duo" | "endless", result: GameResult) {
  if (typeof window === "undefined") return;
  const session = readSession();
  if (!session.name) return;
  const accounts = readAccounts();
  const key = session.name.toLowerCase();
  const a = accounts[key];
  if (!a) return;

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

  writeAccounts(accounts);
}
