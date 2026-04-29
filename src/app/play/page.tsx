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
  logout as authLogout,
  type Account,
} from "@/lib/auth";
import { TURTLES_BY_ID } from "@/data/turtles";

const TOTAL_CLASSES = 34;
const TOTAL_MEDALS = 16;

export default function LobbyPage() {
  const router = useRouter();
  const { t, lang } = useT();
  const [account, setAccount] = useState<Account | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const a = getCurrentAccount();
    if (!a) {
      router.replace("/auth");
      return;
    }
    setAccount(a);
    setLoaded(true);
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
      <FallingSalads count={6} />

      {/* Header */}
      <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <Link
          href="/"
          className="inline-flex items-center gap-2 font-[var(--font-fraunces)] text-xl font-semibold text-emerald-900 tracking-tight"
        >
          <TurtleIcon className="w-9 h-9" />
          Żarłoczne Żółwie
        </Link>
        <div className="flex items-center gap-3">
          <LanguageSwitch />
          <button
            onClick={handleSave}
            className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-white/70 px-4 py-2 text-sm font-medium text-emerald-900 backdrop-blur hover:bg-white transition"
          >
            {t("lobby.save")}
          </button>
          <button
            onClick={handleLogout}
            className="rounded-full bg-emerald-700 px-4 py-2 text-sm font-medium text-white shadow-md shadow-emerald-700/20 hover:bg-emerald-800 transition"
          >
            {t("lobby.logout")}
          </button>
        </div>
      </header>

      <section className="relative z-10 mx-auto max-w-6xl px-6 pb-24">
        {/* Greeting */}
        <div className="mb-8">
          <h1 className="font-[var(--font-fraunces)] text-4xl md:text-5xl font-semibold tracking-tight text-emerald-950">
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

        {/* Daily challenge */}
        <DailyChallenge daily={account.daily} />

        {/* Modes */}
        <div className="mt-10">
          <h2 className="mb-5 font-[var(--font-fraunces)] text-2xl font-semibold text-emerald-950">
            {t("lobby.modes")}
          </h2>
          <div className="grid gap-5 md:grid-cols-3">
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
        <div className="mt-10 grid gap-5 md:grid-cols-2">
          <div className="rounded-3xl border-2 border-emerald-100 bg-white/70 backdrop-blur p-6 flex items-center gap-5">
            <div className="shrink-0">
              <Turtle
                {...selectedClass.visual}
                idKey={`current-${selectedClass.id}`}
                className="w-28"
              />
            </div>
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-widest text-emerald-700/70 mb-1">
                {t("lobby.currentClass")}
              </p>
              <p className="font-[var(--font-fraunces)] text-2xl font-semibold text-emerald-950 truncate">
                {selectedClass.names[lang]}
              </p>
              <p className="text-sm text-emerald-900/65 italic">
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

          <div className="rounded-3xl border-2 border-emerald-100 bg-white/70 backdrop-blur p-6">
            <p className="text-xs uppercase tracking-widest text-emerald-700/70 mb-3">
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
        <div className="mt-10 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <QuickLink href="/shop" emoji="🛒" label={t("lobby.shop")} />
          <QuickLink href="/shop" emoji="💎" label={t("lobby.limited")} />
          <QuickLink href="/play/game?mode=solo" emoji="🏅" label={t("lobby.achievements")} />
          <QuickLink href="/play/game?mode=solo" emoji="👤" label={t("lobby.profile")} />
        </div>

        {/* Big play CTA — defaults to solo */}
        <Link
          href="/play/game?mode=solo"
          className="group fixed bottom-6 right-6 z-40 inline-flex items-center gap-3 rounded-full bg-emerald-700 px-8 py-5 text-lg font-semibold text-white shadow-2xl shadow-emerald-700/40 hover:bg-emerald-800 hover:-translate-y-1 transition md:px-10 md:py-6 md:text-xl"
        >
          🥬 {t("lobby.play")}
        </Link>
      </section>
    </main>
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
      className={`rounded-2xl bg-gradient-to-br ${color} border border-emerald-100/60 p-4`}
    >
      <div className="text-2xl mb-1">{icon}</div>
      <p className="text-[11px] uppercase tracking-wider text-emerald-900/55 font-medium">
        {label}
      </p>
      <p className="font-[var(--font-fraunces)] text-2xl font-semibold text-emerald-950 leading-tight">
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
      className={`group relative rounded-3xl bg-gradient-to-br ${gradient} border border-emerald-100/40 p-6 transition hover:-translate-y-1 hover:shadow-2xl hover:ring-4 ${ring}`}
    >
      <div className="flex justify-center mb-4 transition-transform group-hover:scale-105">
        {icon}
      </div>
      <h3 className="font-[var(--font-fraunces)] text-2xl font-semibold text-emerald-950 text-center">
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

function DailyChallenge({
  daily,
}: {
  daily: Account["daily"];
}) {
  const { t, lang } = useT();
  const today = new Date().toISOString().slice(0, 10);
  const isToday = daily.day === today;
  const target = 2; // We don't have the challenge map here; use a placeholder
  const progress = isToday ? Math.min(daily.progress, target) : 0;
  const done = daily.claimed;
  const challengeText =
    lang === "pl" ? "Dzisiejsze wyzwanie czeka w grze!" : "Le défi du jour t'attend dans le jeu !";

  return (
    <div className="rounded-3xl border-2 border-amber-200 bg-gradient-to-br from-amber-50 via-yellow-50 to-lime-50 p-5 md:p-6 flex flex-col md:flex-row gap-4 md:items-center">
      <div className="flex-1">
        <p className="font-[var(--font-fraunces)] text-xl font-semibold text-emerald-950">
          {t("lobby.daily")}
        </p>
        <p className="text-sm text-emerald-900/70 mt-1">
          {done ? t("lobby.dailyDone") : challengeText}
        </p>
        {isToday && !done && (
          <div className="mt-3 max-w-xs">
            <div className="h-2 bg-white/60 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-400 to-emerald-500 transition-all"
                style={{ width: `${(progress / target) * 100}%` }}
              />
            </div>
            <p className="text-xs text-emerald-900/55 mt-1">
              {progress}/{target}
            </p>
          </div>
        )}
      </div>
      <Link
        href="/play/game?mode=solo"
        className="shrink-0 rounded-full bg-emerald-700 px-5 py-2.5 text-sm font-medium text-white shadow-md hover:bg-emerald-800 transition text-center"
      >
        {done ? "✓" : "Graj →"}
      </Link>
    </div>
  );
}
