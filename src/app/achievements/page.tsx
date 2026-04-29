"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { TurtleIcon } from "@/components/TurtleIcon";
import { FallingSalads } from "@/components/FallingSalads";
import { LanguageSwitch } from "@/components/LanguageSwitch";
import { useT } from "@/i18n/LanguageProvider";
import { getCurrentAccount, type Account } from "@/lib/auth";
import { ACHIEVEMENTS, ACH_REWARD } from "@/data/achievements";

export default function AchievementsPage() {
  const router = useRouter();
  const { lang } = useT();
  const [account, setAccount] = useState<Account | null>(null);

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

  const ach = account.ach ?? {};
  const unlockedCount = ACHIEVEMENTS.filter((a) => ach[a.id]).length;
  const total = ACHIEVEMENTS.length;
  const allUnlocked = unlockedCount === total;

  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-br from-lime-50 via-emerald-50 to-amber-50 font-[var(--font-inter)]">
      <FallingSalads count={5} />

      <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <Link
          href="/play"
          className="inline-flex items-center gap-2 font-[var(--font-fraunces)] text-xl font-semibold text-emerald-900 tracking-tight hover:text-emerald-700 transition"
        >
          <TurtleIcon className="w-9 h-9" />
          ← Lobby
        </Link>
        <div className="flex items-center gap-3">
          <LanguageSwitch />
          <div className="rounded-full bg-emerald-700 px-4 py-2 text-sm font-medium text-white shadow-md">
            🏅 {unlockedCount}/{total}
          </div>
        </div>
      </header>

      <section className="relative z-10 mx-auto max-w-5xl px-6 pb-24">
        <div className="text-center mb-10">
          <p className="text-xs uppercase tracking-[0.25em] text-emerald-700 mb-2">
            {lang === "pl" ? "Odznaki" : "Médailles"}
          </p>
          <h1 className="font-[var(--font-fraunces)] text-5xl md:text-6xl font-semibold leading-[0.95] tracking-tight text-emerald-950">
            {lang === "pl" ? "15 odznak do zdobycia" : "15 médailles à gagner"}
          </h1>
          <p className="mt-3 text-emerald-900/65">
            {lang === "pl"
              ? `Każda odznaka = +${ACH_REWARD} sałatomonet 🥬`
              : `Chaque médaille = +${ACH_REWARD} saladocoins 🥬`}
          </p>
        </div>

        {allUnlocked && (
          <div className="mb-8 rounded-3xl bg-gradient-to-br from-amber-100 via-yellow-100 to-pink-100 border-2 border-amber-300 p-6 text-center shadow-xl">
            <p className="text-4xl mb-2">💎</p>
            <h2 className="font-[var(--font-fraunces)] text-2xl font-semibold text-emerald-950">
              {lang === "pl" ? "VIP Master !" : "Master !"}
            </h2>
            <p className="text-sm text-emerald-900/75 mt-1">
              {lang === "pl"
                ? "Zdobyłeś wszystkie odznaki. Tęczowy avatar odblokowany !"
                : "Toutes les médailles sont à toi. Avatar arc-en-ciel débloqué !"}
            </p>
          </div>
        )}

        <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
          {ACHIEVEMENTS.map((a) => {
            const unlocked = !!ach[a.id];
            return (
              <article
                key={a.id}
                className={`rounded-3xl border-2 p-5 text-center transition ${
                  unlocked
                    ? "bg-gradient-to-br from-amber-50 to-yellow-100 border-amber-300 shadow-md"
                    : "bg-zinc-50 border-zinc-200 opacity-60"
                }`}
              >
                <div className={`text-5xl mb-2 ${unlocked ? "" : "grayscale"}`}>
                  {unlocked ? a.emoji : "🔒"}
                </div>
                <h3 className="font-[var(--font-fraunces)] text-base font-semibold text-emerald-950 leading-tight">
                  {a.names[lang]}
                </h3>
                <p
                  className={`mt-2 text-[10px] uppercase tracking-widest font-medium ${
                    unlocked ? "text-amber-700" : "text-zinc-400"
                  }`}
                >
                  {unlocked
                    ? lang === "pl"
                      ? "✓ zdobyte"
                      : "✓ obtenue"
                    : lang === "pl"
                      ? "🔒 zablokowane"
                      : "🔒 verrouillée"}
                </p>
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
}
