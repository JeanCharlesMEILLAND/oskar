"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { TurtleIcon } from "@/components/TurtleIcon";
import { FallingSalads } from "@/components/FallingSalads";
import { LanguageSwitch } from "@/components/LanguageSwitch";
import { useT } from "@/i18n/LanguageProvider";
import { getCurrentAccount, type Account } from "@/lib/auth";
import {
  acceptFriendRequest,
  declineFriendRequest,
  getMessages,
  removeFriend,
  sendFriendRequest,
  sendMessage,
  type Message,
} from "@/lib/friends";

type Tab = "list" | "requests" | "add";

export default function FriendsPage() {
  const router = useRouter();
  const { t, lang } = useT();
  const [account, setAccount] = useState<Account | null>(null);
  const [tab, setTab] = useState<Tab>("list");
  const [openChatWith, setOpenChatWith] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: "ok" | "err"; msg: string } | null>(null);

  useEffect(() => {
    const a = getCurrentAccount();
    if (!a) {
      router.replace("/auth");
      return;
    }
    setAccount(a);
  }, [router]);

  if (!account) {
    return (
      <main className="relative min-h-screen flex items-center justify-center bg-gradient-to-br from-lime-50 via-emerald-50 to-amber-50">
        <div className="animate-turtle-bob">
          <TurtleIcon className="w-20 h-20" />
        </div>
      </main>
    );
  }

  const friends = account.friends ?? [];
  const requests = account.friendRequests ?? [];

  const refresh = () => {
    const fresh = getCurrentAccount();
    if (fresh) setAccount(fresh);
  };

  const flash = (msg: string, type: "ok" | "err" = "ok") => {
    setFeedback({ type, msg });
    setTimeout(() => setFeedback(null), 1800);
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-br from-lime-50 via-emerald-50 to-amber-50 font-[var(--font-inter)]">
      <FallingSalads count={4} />

      <header className="relative z-10 mx-auto flex max-w-4xl items-center justify-between gap-2 px-4 md:px-6 py-4 md:py-6">
        <Link
          href="/play"
          className="inline-flex items-center gap-2 font-[var(--font-fraunces)] text-base sm:text-lg md:text-xl font-semibold text-emerald-900 tracking-tight hover:text-emerald-700 transition min-w-0"
        >
          <TurtleIcon className="w-7 h-7 md:w-9 md:h-9 shrink-0" />
          <span className="truncate">← Lobby</span>
        </Link>
        <div className="flex items-center gap-2 md:gap-3 shrink-0">
          <LanguageSwitch />
        </div>
      </header>

      <section className="relative z-10 mx-auto max-w-4xl px-4 md:px-6 pb-24">
        <div className="text-center mb-6 md:mb-8">
          <h1 className="font-[var(--font-fraunces)] text-4xl sm:text-5xl md:text-6xl font-semibold leading-[0.95] tracking-tight text-emerald-950">
            {t("friends.title")} 👥
          </h1>
          <p className="mt-3 text-sm md:text-base text-emerald-900/65 max-w-xl mx-auto px-2">
            {t("friends.subtitle")}
          </p>
        </div>

        {/* Local-only notice */}
        <div className="mb-6 rounded-2xl bg-amber-50 border border-amber-200 px-4 py-3 text-center text-xs sm:text-sm text-amber-900">
          ⚠️ {t("friends.localOnly")}
        </div>

        {/* Tabs */}
        <div className="flex p-1 bg-emerald-100/60 rounded-full mb-6 max-w-md mx-auto">
          <TabBtn current={tab} value="list" onClick={() => setTab("list")} count={friends.length}>
            {t("friends.tab.list")}
          </TabBtn>
          <TabBtn current={tab} value="requests" onClick={() => setTab("requests")} count={requests.length}>
            {t("friends.tab.requests")}
          </TabBtn>
          <TabBtn current={tab} value="add" onClick={() => setTab("add")}>
            {t("friends.tab.add")}
          </TabBtn>
        </div>

        {tab === "list" && (
          <FriendList
            friends={friends}
            myName={account.name}
            onRemove={(name) => {
              removeFriend(name);
              flash(t("friends.remove"));
              refresh();
            }}
            onOpenChat={setOpenChatWith}
          />
        )}

        {tab === "requests" && (
          <RequestsList
            requests={requests}
            onAccept={(name) => {
              acceptFriendRequest(name);
              flash(t("friends.success.accepted"));
              refresh();
            }}
            onDecline={(name) => {
              declineFriendRequest(name);
              flash(t("friends.decline"));
              refresh();
            }}
          />
        )}

        {tab === "add" && (
          <AddFriend
            onSubmit={(name) => {
              const r = sendFriendRequest(name);
              if (r.ok) {
                flash(t("friends.success.sent"));
                setTab("list");
              } else {
                const msgKey =
                  r.reason === "empty"
                    ? "friends.err.empty"
                    : r.reason === "notFound"
                      ? "friends.err.notFound"
                      : r.reason === "self"
                        ? "friends.err.self"
                        : r.reason === "alreadyFriend"
                          ? "friends.err.alreadyFriend"
                          : r.reason === "alreadyRequested"
                            ? "friends.err.alreadyRequested"
                            : "friends.err.notFound";
                flash(t(msgKey as never), "err");
              }
            }}
          />
        )}
      </section>

      {/* Chat overlay */}
      {openChatWith && (
        <ChatOverlay
          friendName={openChatWith}
          myName={account.name}
          lang={lang}
          onClose={() => setOpenChatWith(null)}
        />
      )}

      {feedback && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
          <div
            className={`rounded-full px-6 py-3 text-sm font-medium shadow-2xl backdrop-blur ${
              feedback.type === "ok" ? "bg-emerald-700 text-white" : "bg-rose-600 text-white"
            }`}
          >
            {feedback.msg}
          </div>
        </div>
      )}
    </main>
  );
}

function TabBtn({
  current,
  value,
  onClick,
  count,
  children,
}: {
  current: Tab;
  value: Tab;
  onClick: () => void;
  count?: number;
  children: React.ReactNode;
}) {
  const active = current === value;
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`flex-1 px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium rounded-full transition flex items-center justify-center gap-1.5 ${
        active ? "bg-emerald-700 text-white shadow-sm" : "text-emerald-900/60 hover:text-emerald-900"
      }`}
    >
      <span>{children}</span>
      {count !== undefined && count > 0 && (
        <span
          className={`text-[10px] rounded-full px-1.5 py-0.5 ${
            active ? "bg-white/25" : "bg-emerald-200/70 text-emerald-900"
          }`}
        >
          {count}
        </span>
      )}
    </button>
  );
}

function FriendList({
  friends,
  myName,
  onRemove,
  onOpenChat,
}: {
  friends: string[];
  myName: string;
  onRemove: (name: string) => void;
  onOpenChat: (name: string) => void;
}) {
  const { t } = useT();
  if (!friends.length) {
    return (
      <div className="text-center py-12 text-emerald-900/60">
        <p className="text-5xl mb-3">🐢</p>
        <p>{t("friends.list.empty")}</p>
      </div>
    );
  }
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {friends.map((name) => {
        const lastMsgs = getMessages(myName, name);
        const last = lastMsgs[lastMsgs.length - 1];
        return (
          <li
            key={name}
            className="rounded-2xl border-2 border-emerald-100 bg-white/70 backdrop-blur p-4 flex items-center gap-3"
          >
            <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center text-2xl shrink-0">
              🐢
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-emerald-950 truncate">{name}</p>
              {last ? (
                <p className="text-xs text-emerald-900/55 truncate">
                  {last.from === myName ? `→ ${last.text}` : `← ${last.text}`}
                </p>
              ) : (
                <p className="text-xs text-emerald-900/40 italic">—</p>
              )}
            </div>
            <div className="flex gap-2 shrink-0">
              <button
                onClick={() => onOpenChat(name)}
                className="rounded-full bg-emerald-700 text-white px-3 py-1.5 text-xs font-medium hover:bg-emerald-800 transition"
              >
                💬
              </button>
              <button
                onClick={() => onRemove(name)}
                className="rounded-full border border-rose-200 text-rose-700 px-3 py-1.5 text-xs hover:bg-rose-50 transition"
              >
                ✗
              </button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function RequestsList({
  requests,
  onAccept,
  onDecline,
}: {
  requests: string[];
  onAccept: (name: string) => void;
  onDecline: (name: string) => void;
}) {
  const { t } = useT();
  if (!requests.length) {
    return (
      <div className="text-center py-12 text-emerald-900/60">
        <p className="text-5xl mb-3">📬</p>
        <p>{t("friends.requests.empty")}</p>
      </div>
    );
  }
  return (
    <ul className="grid gap-3">
      {requests.map((name) => (
        <li
          key={name}
          className="rounded-2xl border-2 border-amber-200 bg-amber-50/60 backdrop-blur p-4 flex items-center gap-3"
        >
          <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center text-2xl shrink-0">
            🐢
          </div>
          <p className="flex-1 font-semibold text-emerald-950 truncate">{name}</p>
          <div className="flex gap-2 shrink-0">
            <button
              onClick={() => onAccept(name)}
              className="rounded-full bg-emerald-700 text-white px-3 py-1.5 text-xs font-medium hover:bg-emerald-800 transition"
            >
              ✓ {t("friends.accept")}
            </button>
            <button
              onClick={() => onDecline(name)}
              className="rounded-full border border-zinc-300 text-zinc-700 px-3 py-1.5 text-xs hover:bg-zinc-100 transition"
            >
              ✗
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}

function AddFriend({ onSubmit }: { onSubmit: (name: string) => void }) {
  const { t } = useT();
  const [name, setName] = useState("");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(name.trim());
        setName("");
      }}
      className="max-w-md mx-auto rounded-3xl border-2 border-emerald-100 bg-white/80 backdrop-blur p-6 shadow-md"
    >
      <p className="font-[var(--font-fraunces)] text-xl font-semibold text-emerald-950 mb-4">
        {t("friends.add.title")}
      </p>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder={t("friends.add.placeholder")}
        className="w-full rounded-2xl border-2 border-emerald-100 bg-white px-4 py-3 text-emerald-950 outline-none transition focus:border-emerald-500 mb-3"
        autoFocus
      />
      <button
        type="submit"
        className="w-full rounded-full bg-emerald-700 text-white px-5 py-3 font-medium hover:bg-emerald-800 transition"
      >
        {t("friends.add.button")}
      </button>
    </form>
  );
}

function ChatOverlay({
  friendName,
  myName,
  lang,
  onClose,
}: {
  friendName: string;
  myName: string;
  lang: "pl" | "fr";
  onClose: () => void;
}) {
  const { t } = useT();
  const [messages, setMessages] = useState<Message[]>(() => getMessages(myName, friendName));
  const [text, setText] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Refresh messages every 1.5s (poll for messages from same browser other tabs / windows)
  useEffect(() => {
    const interval = setInterval(() => {
      setMessages(getMessages(myName, friendName));
    }, 1500);
    return () => clearInterval(interval);
  }, [myName, friendName]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    const msg = sendMessage(friendName, text);
    if (msg) {
      setMessages(getMessages(myName, friendName));
      setText("");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-emerald-950/60 backdrop-blur-sm p-0 sm:p-4">
      <div className="w-full sm:max-w-md h-[85vh] sm:h-[70vh] sm:rounded-3xl bg-white shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <header className="flex items-center justify-between gap-3 border-b border-emerald-100 px-5 py-3 bg-gradient-to-r from-emerald-50 to-lime-50">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-xl shrink-0">
              🐢
            </div>
            <p className="font-[var(--font-fraunces)] text-lg font-semibold text-emerald-950 truncate">
              {friendName}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full bg-zinc-100 hover:bg-zinc-200 transition w-9 h-9 flex items-center justify-center text-zinc-700"
            aria-label={t("friends.closeChat")}
          >
            ✗
          </button>
        </header>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-2 bg-gradient-to-b from-lime-50/40 to-amber-50/40">
          {messages.length === 0 ? (
            <p className="text-center text-emerald-900/55 italic mt-8">{t("friends.noMessages")}</p>
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
                    <span className={`block text-[10px] mt-0.5 ${mine ? "text-emerald-100/70" : "text-emerald-900/40"}`}>
                      {new Date(m.ts).toLocaleTimeString(lang === "pl" ? "pl-PL" : "fr-FR", {
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
        <form onSubmit={handleSend} className="border-t border-emerald-100 p-3 flex gap-2 bg-white">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={t("friends.message")}
            className="flex-1 rounded-full border-2 border-emerald-100 bg-emerald-50/40 px-4 py-2.5 text-sm outline-none focus:border-emerald-500 focus:bg-white transition"
            maxLength={500}
            autoFocus
          />
          <button
            type="submit"
            disabled={!text.trim()}
            className="rounded-full bg-emerald-700 text-white px-4 py-2.5 text-sm font-medium hover:bg-emerald-800 disabled:opacity-40 disabled:cursor-not-allowed transition shrink-0"
          >
            {t("friends.send")} →
          </button>
        </form>
      </div>
    </div>
  );
}
