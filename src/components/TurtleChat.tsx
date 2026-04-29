"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { getCurrentSession } from "@/lib/auth";
import { getMessages as lsGetMessages, type Message } from "@/lib/friends";
import { fetchMessages, postMessage, isApiHealthy, isWsConnected, subscribeToThread } from "@/lib/chat";
import { TurtleIcon } from "./TurtleIcon";

const MSG_PREFIX = "zolwie:msg:";

/** Floating "Chat Żółwiowy" widget — appears on every logged-in page. */
export function TurtleChat() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [myName, setMyName] = useState("");
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    setMyName(getCurrentSession().name);
  }, [pathname]);

  // Refresh session on open (in case user just logged in)
  useEffect(() => {
    if (open) setMyName(getCurrentSession().name);
  }, [open]);

  // Hide on auth, on game canvas (fullscreen), on home (pre-login)
  if (!mounted) return null;
  const hide =
    pathname === "/auth" ||
    pathname.startsWith("/play/game") ||
    (pathname === "/" && !myName);
  if (hide) return null;
  if (!myName) return null;

  return (
    <>
      {/* Floating button — top-right, below navbar */}
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="fixed z-40 inline-flex items-center gap-2 rounded-full bg-emerald-700 hover:bg-emerald-800 px-3 py-2 sm:px-4 sm:py-2.5 text-xs sm:text-sm font-medium text-white shadow-lg shadow-emerald-700/30 transition-all hover:-translate-y-0.5"
          style={{
            top: "calc(max(env(safe-area-inset-top), 12px) + 64px)",
            right: "max(env(safe-area-inset-right), 12px)",
          }}
          aria-label="Chat Żółwiowy"
        >
          <span className="text-base">💬</span>
          <span className="hidden sm:inline">Chat Żółwiowy</span>
        </button>
      )}

      {open && (
        <ChatPanel
          myName={myName}
          target={target}
          onPickTarget={setTarget}
          onClose={() => {
            setOpen(false);
            setTarget(null);
          }}
        />
      )}
    </>
  );
}

function ChatPanel({
  myName,
  target,
  onPickTarget,
  onClose,
}: {
  myName: string;
  target: string | null;
  onPickTarget: (name: string | null) => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-stretch sm:items-start sm:justify-end bg-emerald-950/40 backdrop-blur-[2px]">
      {/* Backdrop click to close */}
      <button
        type="button"
        aria-label="close"
        onClick={onClose}
        className="absolute inset-0 cursor-default"
      />
      {/* Panel */}
      <div
        className="relative w-full sm:w-[400px] sm:max-w-[92vw] h-[90vh] sm:h-[min(640px,calc(100vh-90px))] bg-white sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden sm:mt-[88px] sm:mr-3"
      >
        {/* Header */}
        <header className="flex items-center justify-between gap-3 border-b border-emerald-100 px-4 sm:px-5 py-3 bg-gradient-to-r from-emerald-50 via-lime-50 to-amber-50">
          <div className="flex items-center gap-2.5 min-w-0">
            <TurtleIcon className="w-9 h-9 shrink-0" />
            <div className="min-w-0">
              <p className="font-[var(--font-fraunces)] text-base font-semibold text-emerald-950 leading-none">
                Chat Żółwiowy 💬
              </p>
              <p className="text-[10px] uppercase tracking-widest text-emerald-700/60 leading-none mt-1">
                {target ? `→ ${target}` : "Wybierz znajomego"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-emerald-100 hover:bg-emerald-200 transition w-9 h-9 flex items-center justify-center text-emerald-800 shrink-0"
            aria-label="Zamknij"
          >
            ✗
          </button>
        </header>

        {/* Body */}
        {target ? (
          <Thread myName={myName} friendName={target} onBack={() => onPickTarget(null)} />
        ) : (
          <Picker myName={myName} onPick={onPickTarget} />
        )}
      </div>
    </div>
  );
}

function Picker({
  myName,
  onPick,
}: {
  myName: string;
  onPick: (name: string) => void;
}) {
  const [text, setText] = useState("");
  const [recents, setRecents] = useState<string[]>([]);

  useEffect(() => {
    setRecents(scanRecentChats(myName));
  }, [myName]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const trimmed = text.trim();
          if (!trimmed || trimmed.toLowerCase() === myName.toLowerCase()) return;
          onPick(trimmed);
        }}
        className="p-4 border-b border-emerald-100 bg-emerald-50/40"
      >
        <label className="block text-[11px] uppercase tracking-widest text-emerald-700/70 mb-1.5">
          Z kim chcesz rozmawiać ?
        </label>
        <div className="flex gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="np. Janek"
            className="flex-1 rounded-full border-2 border-emerald-100 bg-white px-4 py-2 text-sm outline-none focus:border-emerald-500 transition"
            autoFocus
          />
          <button
            type="submit"
            disabled={!text.trim()}
            className="rounded-full bg-emerald-700 text-white px-4 py-2 text-sm font-medium hover:bg-emerald-800 disabled:opacity-40 disabled:cursor-not-allowed transition shrink-0"
          >
            →
          </button>
        </div>
      </form>

      <div className="flex-1 overflow-y-auto p-2">
        {recents.length === 0 ? (
          <div className="text-center py-10 px-4">
            <p className="text-4xl mb-2">🐢💬</p>
            <p className="text-sm text-emerald-900/60">
              Wpisz imię żółwia z kim chcesz pogadać.
            </p>
            <p className="text-[11px] text-emerald-900/45 italic mt-3">
              Wiadomości na razie tylko w tej przeglądarce — serwer wkrótce.
            </p>
          </div>
        ) : (
          <ul>
            <li className="px-3 pt-2 pb-1 text-[11px] uppercase tracking-widest text-emerald-700/60">
              Ostatnie rozmowy
            </li>
            {recents.map((name) => {
              const all = lsGetMessages(myName, name);
              const last = all[all.length - 1];
              return (
                <li key={name}>
                  <button
                    type="button"
                    onClick={() => onPick(name)}
                    className="w-full flex items-center gap-3 rounded-2xl hover:bg-emerald-50 active:bg-emerald-100 px-3 py-2.5 transition text-left"
                  >
                    <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-xl shrink-0">
                      🐢
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-emerald-950 truncate text-sm">{name}</p>
                      {last ? (
                        <p className="text-xs text-emerald-900/55 truncate">
                          {last.from.toLowerCase() === myName.toLowerCase() ? "→ " : "← "}
                          {last.text}
                        </p>
                      ) : (
                        <p className="text-xs text-emerald-900/40 italic">—</p>
                      )}
                    </div>
                    <span className="text-emerald-700/50 text-sm">›</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

function Thread({
  myName,
  friendName,
  onBack,
}: {
  myName: string;
  friendName: string;
  onBack: () => void;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [transport, setTransport] = useState<"ws" | "http" | "local">("local");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Initial load + transport detection
  useEffect(() => {
    let cancelled = false;
    fetchMessages(myName, friendName).then((m) => {
      if (!cancelled) {
        setMessages(m);
        setTransport(isWsConnected(myName) ? "ws" : isApiHealthy() ? "http" : "local");
      }
    });
    return () => {
      cancelled = true;
    };
  }, [myName, friendName]);

  // WebSocket push subscription — instant updates when peer sends
  useEffect(() => {
    const unsub = subscribeToThread(myName, friendName, (msg) => {
      setMessages((prev) => {
        // Avoid duplicates (echo + history might overlap)
        if (prev.some((m) => m.ts === msg.ts && m.from === msg.from && m.text === msg.text)) return prev;
        return [...prev, msg];
      });
    });
    return unsub;
  }, [myName, friendName]);

  // Poll fallback every 3s (only effective if WS isn't pushing)
  useEffect(() => {
    let cancelled = false;
    const interval = setInterval(async () => {
      const m = await fetchMessages(myName, friendName);
      if (!cancelled) {
        setMessages(m);
        setTransport(isWsConnected(myName) ? "ws" : isApiHealthy() ? "http" : "local");
      }
    }, 3000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [myName, friendName]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const msg = await postMessage(myName, friendName, text);
    if (msg) {
      // Optimistic — refresh from server so we see anything new from peer too
      const fresh = await fetchMessages(myName, friendName);
      setMessages(fresh);
      setTransport(isWsConnected(myName) ? "ws" : isApiHealthy() ? "http" : "local");
      setText("");
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Sub-header with back */}
      <div className="px-4 py-2 border-b border-emerald-100 bg-emerald-50/40 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={onBack}
          className="text-xs text-emerald-700 hover:text-emerald-900 font-medium"
        >
          ← Powrót
        </button>
        <span
          className={`text-[10px] uppercase tracking-widest ${
            transport === "ws"
              ? "text-emerald-600"
              : transport === "http"
                ? "text-sky-600"
                : "text-amber-700"
          }`}
          title={
            transport === "ws"
              ? "WebSocket — real-time"
              : transport === "http"
                ? "HTTP — polling 3s"
                : "Local — only this browser"
          }
        >
          {transport === "ws" ? "● live" : transport === "http" ? "● online" : "● offline"}
        </span>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-3 space-y-1.5 bg-gradient-to-b from-lime-50/40 to-amber-50/40"
      >
        {messages.length === 0 ? (
          <p className="text-center text-emerald-900/55 italic mt-8 text-sm">
            Powiedz cześć ! 👋
          </p>
        ) : (
          messages.map((m, i) => {
            const mine = m.from.toLowerCase() === myName.toLowerCase();
            return (
              <div key={i} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm break-words ${
                    mine
                      ? "bg-emerald-700 text-white rounded-br-md"
                      : "bg-white border border-emerald-100 text-emerald-950 rounded-bl-md"
                  }`}
                >
                  {m.text}
                  <span
                    className={`block text-[9px] mt-0.5 ${
                      mine ? "text-emerald-100/70" : "text-emerald-900/40"
                    }`}
                  >
                    {new Date(m.ts).toLocaleTimeString("pl-PL", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="border-t border-emerald-100 p-2.5 flex gap-2 bg-white">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Napisz wiadomość..."
          className="flex-1 rounded-full border-2 border-emerald-100 bg-emerald-50/40 px-4 py-2 text-sm outline-none focus:border-emerald-500 focus:bg-white transition"
          maxLength={500}
          autoFocus
        />
        <button
          type="submit"
          disabled={!text.trim()}
          className="rounded-full bg-emerald-700 text-white px-4 py-2 text-sm font-medium hover:bg-emerald-800 disabled:opacity-40 disabled:cursor-not-allowed transition shrink-0"
        >
          →
        </button>
      </form>
    </div>
  );
}

/** Scan localStorage for past chat threads involving the current user. */
function scanRecentChats(myName: string): string[] {
  if (typeof window === "undefined") return [];
  const myLower = myName.toLowerCase();
  const partners = new Set<string>();
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k || !k.startsWith(MSG_PREFIX)) continue;
      const pair = k.slice(MSG_PREFIX.length).split("|");
      if (pair.length !== 2) continue;
      if (pair[0] === myLower) partners.add(pair[1]);
      else if (pair[1] === myLower) partners.add(pair[0]);
    }
  } catch {}
  // Sort by latest message timestamp desc
  const ranked = Array.from(partners).map((p) => {
    const msgs = lsGetMessages(myName, p);
    return { name: p, ts: msgs[msgs.length - 1]?.ts ?? 0 };
  });
  ranked.sort((a, b) => b.ts - a.ts);
  // Pretty-case: try to recover original casing from accounts
  const accountsRaw = localStorage.getItem("zolwie:zolwiki_accounts_v4");
  let accounts: Record<string, { name: string }> = {};
  try {
    if (accountsRaw) accounts = JSON.parse(accountsRaw);
  } catch {}
  return ranked.map(({ name }) => accounts[name]?.name ?? name);
}
