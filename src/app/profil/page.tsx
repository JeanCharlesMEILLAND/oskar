"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { TurtleIcon } from "@/components/TurtleIcon";
import { FallingSalads } from "@/components/FallingSalads";
import { LanguageSwitch } from "@/components/LanguageSwitch";
import { Turtle } from "@/components/Turtle";
import { useT } from "@/i18n/LanguageProvider";
import {
  downloadAccountBackup,
  getCurrentAccount,
  isAdmin,
  levelFromXp,
  type Account,
} from "@/lib/auth";
import { TURTLES_BY_ID } from "@/data/turtles";
import { ACHIEVEMENTS, ACH_REWARD } from "@/data/achievements";

const TOTAL_CLASSES = 34;
const TOTAL_ACH = ACHIEVEMENTS.length;

export default function ProfilePage() {
  const router = useRouter();
  const { t, lang } = useT();
  const [account, setAccount] = useState<Account | null>(null);
  const [admin, setAdmin] = useState(false);

  useEffect(() => {
    const a = getCurrentAccount();
    if (!a) {
      router.replace("/auth");
      return;
    }
    setAccount(a);
    setAdmin(isAdmin());
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

  const xpInfo = levelFromXp(account.totalEverEaten ?? 0);
  const xpPct = Math.min(100, (xpInfo.currentXp / xpInfo.neededXp) * 100);
  const selectedClass = TURTLES_BY_ID[account.selectedClass] ?? TURTLES_BY_ID.normal;
  const ownedCount = Object.keys(account.owned).filter((id) => id !== "beta_tester").length;
  const achCount = Object.keys(account.ach ?? {}).length;
  const totalCoinsEverEarned = account.totalEverEaten + achCount * ACH_REWARD; // approx

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
          <button
            onClick={() => downloadAccountBackup(account)}
            className="rounded-full border border-emerald-200 bg-white/70 px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-medium text-emerald-900 backdrop-blur hover:bg-white transition whitespace-nowrap"
          >
            💾 {lang === "pl" ? "Zapisz" : "Sauver"}
          </button>
        </div>
      </header>

      <section className="relative z-10 mx-auto max-w-4xl px-4 md:px-6 pb-20">
        {/* Hero card with avatar + name + level */}
        <div className="rounded-3xl border-2 border-emerald-100 bg-white/80 backdrop-blur p-6 md:p-8 shadow-xl">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="relative shrink-0">
              <div className="absolute inset-0 -z-10 mx-auto h-32 w-32 rounded-full bg-gradient-to-br from-amber-200 via-lime-200 to-emerald-300 blur-2xl opacity-60" />
              <div className="animate-turtle-bob">
                <Turtle
                  {...selectedClass.visual}
                  idKey={`profil-${selectedClass.id}`}
                  className="w-32"
                />
              </div>
            </div>
            <div className="text-center sm:text-left flex-1 min-w-0">
              <p className="text-xs uppercase tracking-[0.2em] text-emerald-700/70 mb-1">
                {lang === "pl" ? "Profil" : "Profil"}
                {admin && (
                  <span className="ml-2 inline-block bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full text-[10px]">
                    🔑 ADMIN
                  </span>
                )}
                {account.isBetaTester && (
                  <span className="ml-2 inline-block bg-gradient-to-r from-violet-300 to-fuchsia-300 text-violet-950 px-2 py-0.5 rounded-full text-[10px] font-semibold">
                    🧪 BETA TESTER
                  </span>
                )}
              </p>
              <h1 className="font-[var(--font-fraunces)] text-3xl sm:text-4xl md:text-5xl font-semibold text-emerald-950 leading-tight break-words">
                {account.name}
              </h1>
              <p className="mt-2 text-sm text-emerald-900/65 italic">
                {selectedClass.emoji} {selectedClass.names[lang]} — {selectedClass.descs[lang]}
              </p>

              {/* Level + XP bar */}
              <div className="mt-5">
                <div className="flex items-baseline justify-between mb-1">
                  <span className="text-sm font-medium text-emerald-900">
                    {lang === "pl" ? "Poziom" : "Niveau"}{" "}
                    <span className="font-[var(--font-fraunces)] text-2xl text-emerald-700">
                      {xpInfo.level}
                    </span>
                  </span>
                  <span className="text-xs text-emerald-900/55 font-mono">
                    {xpInfo.currentXp}/{xpInfo.neededXp} XP
                  </span>
                </div>
                <div className="h-3 bg-emerald-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-amber-400 via-emerald-400 to-emerald-600 transition-all"
                    style={{ width: `${xpPct}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Records grid */}
        <div className="mt-6 grid gap-3 grid-cols-2 sm:grid-cols-4">
          <Stat icon="🥬" label={t("lobby.coins")} value={account.totalEver.toLocaleString()} />
          <Stat icon="🏆" label={t("lobby.bestSolo")} value={account.soloBest} />
          <Stat icon="🐢🐢" label={t("lobby.bestDuo")} value={account.duoBest} />
          <Stat icon="♾️" label={t("lobby.bestEndless")} value={`${account.endlessBest}s`} />
        </div>

        {/* Collection */}
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <Link
            href="/shop"
            className="rounded-2xl bg-gradient-to-br from-violet-50 to-purple-100 border border-violet-200 p-5 hover:-translate-y-0.5 hover:shadow-md transition"
          >
            <p className="text-xs uppercase tracking-widest text-violet-700/70 mb-1">
              {lang === "pl" ? "Klasy żółwi" : "Classes de tortues"}
            </p>
            <p className="font-[var(--font-fraunces)] text-3xl font-semibold text-emerald-950">
              {ownedCount} / {TOTAL_CLASSES}
            </p>
            <div className="mt-3 h-2 bg-white/60 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-violet-400 to-violet-600"
                style={{ width: `${(ownedCount / TOTAL_CLASSES) * 100}%` }}
              />
            </div>
            <p className="mt-3 text-xs text-violet-700">→ {lang === "pl" ? "Sklep" : "Boutique"}</p>
          </Link>
          <Link
            href="/achievements"
            className="rounded-2xl bg-gradient-to-br from-rose-50 to-pink-100 border border-pink-200 p-5 hover:-translate-y-0.5 hover:shadow-md transition"
          >
            <p className="text-xs uppercase tracking-widest text-pink-700/70 mb-1">
              {lang === "pl" ? "Odznaki" : "Médailles"}
            </p>
            <p className="font-[var(--font-fraunces)] text-3xl font-semibold text-emerald-950">
              {achCount} / {TOTAL_ACH}
            </p>
            <div className="mt-3 h-2 bg-white/60 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-pink-400 to-rose-500"
                style={{ width: `${(achCount / TOTAL_ACH) * 100}%` }}
              />
            </div>
            <p className="mt-3 text-xs text-pink-700">→ {lang === "pl" ? "Galeria" : "Galerie"}</p>
          </Link>
        </div>

        {/* Lifetime stats */}
        <div className="mt-6 rounded-2xl border border-emerald-100 bg-white/70 backdrop-blur p-5">
          <p className="text-xs uppercase tracking-widest text-emerald-700/70 mb-3">
            {lang === "pl" ? "Statystyki" : "Statistiques"}
          </p>
          <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
            <Stat2 label={lang === "pl" ? "Sałaty życiowo" : "Salades à vie"} value={account.totalEverEaten.toLocaleString()} />
            <Stat2 label={lang === "pl" ? "Wygrane" : "Victoires"} value={account.stats?.wins ?? 0} />
            <Stat2 label={lang === "pl" ? "Power-upy" : "Power-ups"} value={account.stats?.powerups ?? 0} />
            <Stat2 label={lang === "pl" ? "Złote sałaty" : "Salades dorées"} value={account.stats?.gold ?? 0} />
          </dl>
        </div>
      </section>
    </main>
  );
}

function Stat({ icon, label, value }: { icon: string; label: string; value: string | number }) {
  return (
    <div className="rounded-2xl bg-white/70 backdrop-blur border border-emerald-100 p-4">
      <div className="text-2xl mb-1">{icon}</div>
      <p className="text-[11px] uppercase tracking-wider text-emerald-900/55 font-medium leading-tight">
        {label}
      </p>
      <p className="font-[var(--font-fraunces)] text-2xl font-semibold text-emerald-950 leading-tight mt-1">
        {value}
      </p>
    </div>
  );
}

function Stat2({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <p className="font-[var(--font-fraunces)] text-2xl sm:text-3xl font-semibold text-emerald-950 leading-none">
        {value}
      </p>
      <p className="mt-1 text-[10px] sm:text-[11px] uppercase tracking-widest text-emerald-900/55">
        {label}
      </p>
    </div>
  );
}
