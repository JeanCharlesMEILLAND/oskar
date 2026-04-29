"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CuteTurtle } from "@/components/CuteTurtle";
import { FallingSalads } from "@/components/FallingSalads";
import { LanguageSwitch } from "@/components/LanguageSwitch";
import { TurtleIcon } from "@/components/TurtleIcon";
import { Turtle } from "@/components/Turtle";
import {
  ModeIconSolo,
  ModeIconDuo,
  ModeIconEndless,
} from "@/components/ModeIcons";
import { useT } from "@/i18n/LanguageProvider";
import {
  downloadAccountBackup,
  getCurrentAccount,
  isAdmin,
  logout as authLogout,
  tryBecomeAdmin,
  type Account,
} from "@/lib/auth";
import { TURTLES_BY_ID } from "@/data/turtles";
import { getTodaysChallenge, todayKey } from "@/data/daily";
import {
  eventTimeRemainingSec,
  getEventState,
  startEvent,
  stopEvent,
  type EventState,
} from "@/lib/events";

const TOTAL_CLASSES = 34;
const TOTAL_MEDALS = 16;

export default function LobbyPage() {
  const router = useRouter();
  const { t, lang } = useT();
  const [account, setAccount] = useState<Account | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [admin, setAdmin] = useState(false);
  const [event, setEvent] = useState<EventState>({ active: false, type: null, endsAt: 0 });
  const [showAdminPrompt, setShowAdminPrompt] = useState(false);

  useEffect(() => {
    const a = getCurrentAccount();
    if (!a) {
      router.replace("/auth");
      return;
    }
    setAccount(a);
    setAdmin(isAdmin());
    setEvent(getEventState());
    setLoaded(true);
    const id = setInterval(() => setEvent(getEventState()), 1000);
    return () => clearInterval(id);
  }, [router]);

  if (!loaded || !account) {
    return (
      <main className="relative min-h-screen flex items-center justify-center bg-gradient-to-br from-lime-50 via-emerald-50 to-amber-50">
        <div className="animate-turtle-bob">
          <TurtleIcon className="w-20 h-20" />
        </div>
      </main>
    );
  }

  const ownedCount = Object.keys(account.owned).length;
  const medalsCount = Object.keys(account.ach).length;
  const selectedClass = TURTLES_BY_ID[account.selectedClass] ?? TURTLES_BY_ID.normal;

  const handleLogout = () => {
    authLogout();
    router.push("/");
  };

  const handleSave = () => {
    downloadAccountBackup(account);
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-br from-lime-50 via-emerald-50 to-amber-50 font-[var(--font-inter)]">
      <FallingSalads count={4} />

      {/* Header */}
      <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between gap-2 px-4 md:px-6 py-4 md:py-6">
        <Link
          href="/"
          className="inline-flex items-center gap-2 font-[var(--font-fraunces)] text-base sm:text-lg md:text-xl font-semibold text-emerald-900 tracking-tight min-w-0"
        >
          <TurtleIcon className="w-7 h-7 md:w-9 md:h-9 shrink-0" />
          <span className="truncate">Żarłoczne Żółwie</span>
        </Link>
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          <LanguageSwitch />
          <button
            onClick={handleSave}
            className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-white/70 px-4 py-2 text-sm font-medium text-emerald-900 backdrop-blur hover:bg-white transition"
          >
            {t("lobby.save")}
          </button>
          <button
            onClick={handleLogout}
            className="rounded-full bg-emerald-700 px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-medium text-white shadow-md shadow-emerald-700/20 hover:bg-emerald-800 transition whitespace-nowrap"
          >
            {t("lobby.logout")}
          </button>
        </div>
      </header>

      <section className="relative z-10 mx-auto max-w-6xl px-4 md:px-6 pb-32 md:pb-24">
        {/* Greeting */}
        <div className="mb-6 md:mb-8">
          <h1 className="font-[var(--font-fraunces)] text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight text-emerald-950 leading-tight break-words">
            {t("lobby.greeting")}, <span className="italic text-emerald-700">{account.name}</span>
            <span className="text-amber-500">{lang === "fr" ? " !" : "!"}</span> 👋
          </h1>
        </div>

        {/* Stats grid */}
        <div className="mb-8 grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard
            icon="🥬"
            label={t("lobby.coins")}
            value={account.totalEver.toLocaleString()}
            color="from-lime-100 to-emerald-100"
          />
          <StatCard
            icon="🏆"
            label={t("lobby.bestSolo")}
            value={account.soloBest}
            color="from-amber-100 to-yellow-100"
          />
          <StatCard
            icon="🛒"
            label={t("lobby.classes")}
            value={`${ownedCount}/${TOTAL_CLASSES}`}
            color="from-violet-100 to-purple-100"
          />
          <StatCard
            icon="🏅"
            label={t("lobby.medals")}
            value={`${medalsCount}/${TOTAL_MEDALS}`}
            color="from-rose-100 to-pink-100"
          />
        </div>

        {/* Active event banner */}
        {event.active && (
          <div className="mb-6 rounded-3xl bg-gradient-to-r from-pink-100 via-amber-100 to-yellow-100 border-2 border-pink-300 p-4 sm:p-5 flex items-center gap-3 sm:gap-4 shadow-lg animate-pulse-slow">
            <div className="text-3xl sm:text-4xl shrink-0">{event.type === "double" ? "✨" : "🌧️"}</div>
            <div className="flex-1 min-w-0">
              <p className="font-[var(--font-fraunces)] text-lg sm:text-xl font-semibold text-emerald-950">
                {event.type === "double"
                  ? lang === "pl" ? "EVENT 2× ✨" : "ÉVÉNEMENT 2× ✨"
                  : lang === "pl" ? "DESZCZ SAŁAT 🌧️" : "PLUIE DE SALADES 🌧️"}
              </p>
              <p className="text-xs sm:text-sm text-emerald-900/70">
                {event.type === "double"
                  ? lang === "pl" ? "Punkty ×2 + złote sałaty częściej" : "Points ×2 + plus de salades dorées"
                  : lang === "pl" ? "Więcej sałat na mapie!" : "Plus de salades sur la carte !"}
                {" · "}<span className="font-mono">{eventTimeRemainingSec(event)}s</span>
              </p>
            </div>
            {admin && (
              <button
                onClick={() => { stopEvent(); setEvent(getEventState()); }}
                className="shrink-0 rounded-full bg-rose-600 hover:bg-rose-700 text-white text-xs font-medium px-3 py-1.5 transition"
              >
                {lang === "pl" ? "Stop" : "Stop"}
              </button>
            )}
          </div>
        )}

        {/* Admin panel */}
        {admin && !event.active && (
          <div className="mb-6 rounded-3xl border-2 border-amber-300 bg-amber-50/80 backdrop-blur p-4 sm:p-5">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-2xl">🔑</span>
              <p className="font-[var(--font-fraunces)] text-lg font-semibold text-emerald-950">
                {lang === "pl" ? "Panel Admina" : "Admin"}
              </p>
            </div>
            <p className="text-xs sm:text-sm text-emerald-900/70 mb-4">
              {lang === "pl"
                ? "Odpal event na 5 minut dla wszystkich graczy:"
                : "Lance un événement de 5 minutes pour tous :"}
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => { startEvent("double"); setEvent(getEventState()); }}
                className="rounded-full bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 text-sm font-medium shadow-md transition"
              >
                ✨ {lang === "pl" ? "Event 2× (5min)" : "Event 2× (5min)"}
              </button>
              <button
                onClick={() => { startEvent("rain"); setEvent(getEventState()); }}
                className="rounded-full bg-sky-500 hover:bg-sky-600 text-white px-4 py-2 text-sm font-medium shadow-md transition"
              >
                🌧️ {lang === "pl" ? "Deszcz sałat (5min)" : "Pluie de salades (5min)"}
              </button>
            </div>
          </div>
        )}

        {/* Become admin */}
        {!admin && (
          <button
            onClick={() => setShowAdminPrompt(true)}
            className="mb-6 inline-flex items-center gap-2 rounded-full border border-amber-300 bg-amber-50/60 px-4 py-2 text-sm font-medium text-amber-900 hover:bg-amber-100 transition"
          >
            🔑 {lang === "pl" ? "Zostań adminem" : "Devenir admin"}
          </button>
        )}

        {showAdminPrompt && (
          <AdminPrompt
            onCancel={() => setShowAdminPrompt(false)}
            onSuccess={() => {
              setShowAdminPrompt(false);
              setAdmin(isAdmin());
            }}
          />
        )}

        {/* Daily challenge */}
        <DailyChallenge daily={account.daily} />

        {/* Modes */}
        <div className="mt-8 md:mt-10">
          <h2 className="mb-4 md:mb-5 font-[var(--font-fraunces)] text-xl md:text-2xl font-semibold text-emerald-950">
            {t("lobby.modes")}
          </h2>
          <div className="grid gap-4 md:gap-5 grid-cols-1 sm:grid-cols-3">
            <ModeCard
              href="/play/game?mode=solo"
              icon={<ModeIconSolo className="w-24" />}
              title={t("lobby.modeSolo.t")}
              desc={t("lobby.modeSolo.d")}
              best={account.soloBest > 0 ? `🏆 ${account.soloBest}` : undefined}
              gradient="from-lime-100 to-emerald-100"
              ring="ring-emerald-300"
            />
            <ModeCard
              href="/play/game?mode=duo"
              icon={<ModeIconDuo className="w-32" />}
              title={t("lobby.modeDuo.t")}
              desc={t("lobby.modeDuo.d")}
              best={account.duoBest > 0 ? `🏆 ${account.duoBest}` : undefined}
              gradient="from-amber-100 to-rose-100"
              ring="ring-amber-300"
            />
            <ModeCard
              href="/play/game?mode=endless"
              icon={<ModeIconEndless className="w-24" />}
              title={t("lobby.modeEndless.t")}
              desc={t("lobby.modeEndless.d")}
              best={account.endlessBest > 0 ? `🏆 ${account.endlessBest}s` : undefined}
              gradient="from-violet-100 to-fuchsia-100"
              ring="ring-violet-300"
            />
          </div>
        </div>

        {/* Current class + Quick links */}
        <div className="mt-8 md:mt-10 grid gap-4 md:gap-5 md:grid-cols-2">
          <div className="rounded-3xl border-2 border-emerald-100 bg-white/70 backdrop-blur p-4 sm:p-6 flex items-center gap-4 sm:gap-5">
            <div className="shrink-0">
              <Turtle
                {...selectedClass.visual}
                idKey={`current-${selectedClass.id}`}
                className="w-20 sm:w-28"
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] sm:text-xs uppercase tracking-widest text-emerald-700/70 mb-1">
                {t("lobby.currentClass")}
              </p>
              <p className="font-[var(--font-fraunces)] text-xl sm:text-2xl font-semibold text-emerald-950 truncate">
                {selectedClass.names[lang]}
              </p>
              <p className="text-xs sm:text-sm text-emerald-900/65 italic line-clamp-2">
                {selectedClass.descs[lang]}
              </p>
              <Link
                href="/shop"
                className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-emerald-700 hover:text-emerald-900 transition"
              >
                {t("lobby.changeClass")} →
              </Link>
            </div>
          </div>

          <div className="rounded-3xl border-2 border-emerald-100 bg-white/70 backdrop-blur p-4 sm:p-6">
            <p className="text-[11px] sm:text-xs uppercase tracking-widest text-emerald-700/70 mb-3">
              {t("lobby.ranking")}
            </p>
            <div className="space-y-2 text-sm">
              <RankRow label={t("lobby.modeSolo.t")} value={account.soloBest} />
              <RankRow label={t("lobby.modeDuo.t")} value={account.duoBest} />
              <RankRow
                label={t("lobby.modeEndless.t")}
                value={account.endlessBest}
                suffix="s"
              />
            </div>
          </div>
        </div>

        {/* Quick links — open the legacy via /play/game and let user navigate inside */}
        <div className="mt-8 md:mt-10 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <QuickLink href="/shop" emoji="🛒" label={t("lobby.shop")} />
          <QuickLink href="/achievements" emoji="🏅" label={t("lobby.achievements")} />
          <QuickLink href="/profil" emoji="👤" label={t("lobby.profile")} />
          <QuickLink href="/znajomi" emoji="👥" label={t("lobby.friends")} />
        </div>

        {/* Big play CTA — defaults to solo. Smaller on mobile, respects notches. */}
        <Link
          href="/play/game?mode=solo"
          className="group fixed z-40 inline-flex items-center gap-2 sm:gap-3 rounded-full bg-emerald-700 px-5 py-3 sm:px-8 sm:py-5 md:px-10 md:py-6 text-sm sm:text-lg md:text-xl font-semibold text-white shadow-2xl shadow-emerald-700/40 hover:bg-emerald-800 hover:-translate-y-1 transition"
          style={{
            bottom: "max(env(safe-area-inset-bottom), 16px)",
            right: "max(env(safe-area-inset-right), 16px)",
          }}
        >
          🥬 {t("lobby.play")}
        </Link>
      </section>
    </main>
  );
}

function AdminPrompt({
  onCancel,
  onSuccess,
}: {
  onCancel: () => void;
  onSuccess: () => void;
}) {
  const { lang } = useT();
  const [code, setCode] = useState("");
  const [err, setErr] = useState(false);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-emerald-950/60 backdrop-blur-sm p-4">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (tryBecomeAdmin(code)) onSuccess();
          else setErr(true);
        }}
        className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl"
      >
        <p className="font-[var(--font-fraunces)] text-2xl font-semibold text-emerald-950 mb-2">
          🔑 {lang === "pl" ? "Tajny kod" : "Code secret"}
        </p>
        <p className="text-sm text-emerald-900/70 mb-4">
          {lang === "pl"
            ? "Wpisz kod admina, żeby odblokować eventy."
            : "Tape le code admin pour débloquer les événements."}
        </p>
        <input
          type="password"
          value={code}
          onChange={(e) => { setCode(e.target.value); setErr(false); }}
          autoFocus
          placeholder="••••••••"
          className={`w-full rounded-2xl border-2 px-4 py-3 outline-none transition ${
            err ? "border-rose-400 bg-rose-50" : "border-emerald-100 bg-white focus:border-emerald-500"
          }`}
        />
        {err && (
          <p className="mt-2 text-sm text-rose-600">
            {lang === "pl" ? "Zły kod !" : "Mauvais code !"}
          </p>
        )}
        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-full border border-zinc-300 px-4 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition"
          >
            {lang === "pl" ? "Anuluj" : "Annuler"}
          </button>
          <button
            type="submit"
            className="flex-1 rounded-full bg-emerald-700 text-white px-4 py-2.5 text-sm font-medium hover:bg-emerald-800 transition"
          >
            {lang === "pl" ? "Aktywuj" : "Activer"}
          </button>
        </div>
      </form>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: string;
  label: string;
  value: string | number;
  color: string;
}) {
  return (
    <div
      className={`rounded-2xl bg-gradient-to-br ${color} border border-emerald-100/60 p-3 sm:p-4 min-w-0`}
    >
      <div className="text-xl sm:text-2xl mb-1">{icon}</div>
      <p className="text-[10px] sm:text-[11px] uppercase tracking-wider text-emerald-900/55 font-medium leading-tight">
        {label}
      </p>
      <p className="font-[var(--font-fraunces)] text-xl sm:text-2xl font-semibold text-emerald-950 leading-tight truncate">
        {value}
      </p>
    </div>
  );
}

function ModeCard({
  href,
  icon,
  title,
  desc,
  best,
  gradient,
  ring,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  desc: string;
  best?: string;
  gradient: string;
  ring: string;
}) {
  return (
    <Link
      href={href}
      className={`group relative rounded-3xl bg-gradient-to-br ${gradient} border border-emerald-100/40 p-5 md:p-6 transition hover:-translate-y-1 hover:shadow-2xl hover:ring-4 ${ring}`}
    >
      <div className="flex justify-center mb-3 md:mb-4 transition-transform group-hover:scale-105">
        {icon}
      </div>
      <h3 className="font-[var(--font-fraunces)] text-xl md:text-2xl font-semibold text-emerald-950 text-center">
        {title}
      </h3>
      <p className="mt-1 text-sm text-emerald-900/65 text-center">{desc}</p>
      {best && (
        <p className="mt-3 text-center text-xs font-medium text-emerald-800 bg-white/60 rounded-full py-1 px-3 inline-block w-full">
          {best}
        </p>
      )}
    </Link>
  );
}

function RankRow({
  label,
  value,
  suffix = "",
}: {
  label: string;
  value: number;
  suffix?: string;
}) {
  return (
    <div className="flex items-center justify-between border-b border-emerald-100/60 last:border-0 py-2">
      <span className="text-emerald-900/70">{label}</span>
      <span className="font-[var(--font-fraunces)] text-lg font-semibold text-emerald-950">
        {value > 0 ? `${value}${suffix}` : <span className="text-emerald-900/35 italic text-sm">—</span>}
      </span>
    </div>
  );
}

function QuickLink({ href, emoji, label }: { href: string; emoji: string; label: string }) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-3 rounded-2xl bg-white/70 backdrop-blur border border-emerald-100 px-4 py-3 hover:bg-white hover:border-emerald-300 transition"
    >
      <span className="text-2xl group-hover:scale-110 transition-transform">
        {emoji}
      </span>
      <span className="text-sm font-medium text-emerald-900 truncate">{label}</span>
    </Link>
  );
}

function DailyChallenge({ daily }: { daily: Account["daily"] }) {
  const { t, lang } = useT();
  const todayCh = getTodaysChallenge();
  const today = todayKey();
  const isToday = daily?.day === today;
  const progress = isToday ? Math.min(daily.progress, todayCh.target) : 0;
  const done = isToday && daily.claimed;
  const targetMode = todayCh.type === "endless_sec" ? "endless" : "solo";

  return (
    <div className="rounded-3xl border-2 border-amber-200 bg-gradient-to-br from-amber-50 via-yellow-50 to-lime-50 p-5 md:p-6 flex flex-col md:flex-row gap-4 md:items-center">
      <div className="flex-1">
        <p className="font-[var(--font-fraunces)] text-xl font-semibold text-emerald-950">
          {t("lobby.daily")}
        </p>
        <p className="text-sm text-emerald-900/70 mt-1">
          {done ? t("lobby.dailyDone") : todayCh.names[lang]}
        </p>
        {!done && (
          <div className="mt-3 max-w-xs">
            <div className="h-2 bg-white/60 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-400 to-emerald-500 transition-all"
                style={{ width: `${(progress / todayCh.target) * 100}%` }}
              />
            </div>
            <p className="text-xs text-emerald-900/55 mt-1">
              {progress}/{todayCh.target}
              {!done && (lang === "pl" ? " · nagroda 100 🥬" : " · récompense 100 🥬")}
            </p>
          </div>
        )}
      </div>
      <Link
        href={`/play/game?mode=${targetMode}`}
        className="shrink-0 rounded-full bg-emerald-700 px-5 py-2.5 text-sm font-medium text-white shadow-md hover:bg-emerald-800 transition text-center"
      >
        {done ? "✓" : "Graj →"}
      </Link>
    </div>
  );
}
