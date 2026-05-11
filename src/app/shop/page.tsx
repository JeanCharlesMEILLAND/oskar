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
  buyClass,
  getCurrentAccount,
  selectClass,
  type Account,
} from "@/lib/auth";
import { TURTLES, RARITY_ORDER, type Rarity } from "@/data/turtles";

const RARITY_LABEL: Record<Rarity, { pl: string; fr: string }> = {
  basic: { pl: "Podstawowe", fr: "Basiques" },
  rare: { pl: "Rzadkie", fr: "Rares" },
  epic: { pl: "Epickie", fr: "Épiques" },
  legendary: { pl: "Legendarne", fr: "Légendaires" },
  limited: { pl: "💎 Limitowane", fr: "💎 Limitées" },
};

const RARITY_BG: Record<Rarity, string> = {
  basic: "from-lime-50 to-emerald-100 border-emerald-200",
  rare: "from-sky-50 to-blue-100 border-sky-200",
  epic: "from-violet-50 to-purple-100 border-violet-200",
  legendary: "from-amber-50 to-yellow-100 border-amber-300",
  limited: "from-pink-50 via-fuchsia-100 to-amber-50 border-pink-300",
};

export default function ShopPage() {
  const router = useRouter();
  const { lang } = useT();
  const [account, setAccount] = useState<Account | null>(null);
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

  const handleBuy = (id: string, price: number) => {
    const result = buyClass(id, price);
    if (result.ok) {
      setAccount(result.account);
      setFeedback({
        type: "ok",
        msg: lang === "pl" ? "Kupiono ! 🎉" : "Acheté ! 🎉",
      });
    } else if (result.reason === "notEnough") {
      setFeedback({
        type: "err",
        msg: lang === "pl" ? "Brak sałatomonet" : "Pas assez de saladocoins",
      });
    } else {
      setFeedback({ type: "err", msg: "Erreur" });
    }
    setTimeout(() => setFeedback(null), 2000);
  };

  const handleSelect = (id: string) => {
    const result = selectClass(id);
    if (result.ok) {
      setAccount(result.account);
      setFeedback({
        type: "ok",
        msg: lang === "pl" ? "Wybrana !" : "Sélectionnée !",
      });
      setTimeout(() => setFeedback(null), 1500);
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-br from-lime-50 via-emerald-50 to-amber-50 font-[var(--font-inter)]">
      <FallingSalads count={4} />

      <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between gap-2 px-4 md:px-6 py-4 md:py-6">
        <Link
          href="/play"
          className="inline-flex items-center gap-2 font-[var(--font-fraunces)] text-base sm:text-lg md:text-xl font-semibold text-emerald-900 tracking-tight hover:text-emerald-700 transition min-w-0"
        >
          <TurtleIcon className="w-7 h-7 md:w-9 md:h-9 shrink-0" />
          <span className="truncate">← Lobby</span>
        </Link>
        <div className="flex items-center gap-2 md:gap-3 shrink-0">
          <LanguageSwitch />
          <div className="rounded-full bg-emerald-700 px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-medium text-white shadow-md flex items-center gap-1.5 sm:gap-2 whitespace-nowrap">
            🥬 {account.totalEver.toLocaleString()}
          </div>
        </div>
      </header>

      <section className="relative z-10 mx-auto max-w-6xl px-4 md:px-6 pb-16 md:pb-24">
        <div className="text-center mb-8 md:mb-10">
          <p className="text-[11px] md:text-xs uppercase tracking-[0.25em] text-emerald-700 mb-2">
            {lang === "pl" ? "Sklep" : "Boutique"}
          </p>
          <h1 className="font-[var(--font-fraunces)] text-4xl sm:text-5xl md:text-6xl font-semibold leading-[0.95] tracking-tight text-emerald-950">
            {lang === "pl" ? "34 żółwie" : "34 tortues"}
          </h1>
          <p className="mt-3 text-sm md:text-base text-emerald-900/65 px-2">
            {lang === "pl"
              ? "Kup raz — zostaje na zawsze."
              : "Achat unique — pour toujours."}
          </p>
        </div>

        {RARITY_ORDER.map((rarity) => {
          // Hide secret classes (e.g. beta_tester) until they're already owned via code.
          const items = TURTLES.filter(
            (t) => t.rarity === rarity && (t.id !== "beta_tester" || account.owned[t.id]),
          );
          if (!items.length) return null;
          return (
            <section key={rarity} className="mb-10 md:mb-12">
              <h2 className="mb-4 md:mb-5 font-[var(--font-fraunces)] text-xl sm:text-2xl md:text-3xl font-semibold text-emerald-950">
                {RARITY_LABEL[rarity][lang]}
              </h2>
              <div className="grid gap-3 sm:gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                {items.map((turtle) => {
                  const owned = !!account.owned[turtle.id];
                  const selected = account.selectedClass === turtle.id;
                  const canAfford = account.totalEver >= turtle.price;
                  return (
                    <article
                      key={turtle.id}
                      className={`relative overflow-hidden rounded-3xl border-2 bg-gradient-to-br p-3 sm:p-5 transition ${
                        RARITY_BG[rarity]
                      } ${selected ? "ring-4 ring-emerald-400 shadow-xl" : "hover:-translate-y-0.5 hover:shadow-lg"}`}
                    >
                      <div className="absolute right-2 top-2 sm:right-3 sm:top-3 text-[9px] sm:text-[10px] uppercase tracking-widest text-emerald-900/60">
                        {rarity}
                      </div>
                      {selected && (
                        <div className="absolute left-2 top-2 sm:left-3 sm:top-3 text-[9px] sm:text-[10px] uppercase tracking-widest font-medium text-emerald-700 bg-white/80 rounded-full px-2 py-0.5">
                          {lang === "pl" ? "✓ aktywna" : "✓ active"}
                        </div>
                      )}
                      <div className="flex justify-center py-2">
                        <Turtle
                          {...turtle.visual}
                          idKey={`shop-${turtle.id}`}
                          className="w-20 sm:w-28"
                        />
                      </div>
                      <h3 className="text-center font-[var(--font-fraunces)] text-base sm:text-lg font-semibold text-emerald-950 leading-tight">
                        {turtle.names[lang]}
                      </h3>
                      <p className="text-center text-[11px] sm:text-xs text-emerald-900/60 italic mb-3 min-h-[28px] line-clamp-2">
                        {turtle.descs[lang]}
                      </p>
                      <div className="flex items-center justify-between text-[11px] sm:text-xs mb-3">
                        <span className="font-mono text-emerald-900/70">
                          🥬 {turtle.price.toLocaleString()}
                        </span>
                        <span className="text-base">{turtle.emoji}</span>
                      </div>
                      {owned ? (
                        selected ? (
                          <button
                            disabled
                            className="w-full rounded-full bg-emerald-100 text-emerald-700 px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium cursor-default"
                          >
                            {lang === "pl" ? "Wybrana" : "Sélectionnée"}
                          </button>
                        ) : (
                          <button
                            onClick={() => handleSelect(turtle.id)}
                            className="w-full rounded-full bg-emerald-700 text-white px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium hover:bg-emerald-800 transition"
                          >
                            {lang === "pl" ? "Wybierz" : "Choisir"}
                          </button>
                        )
                      ) : (
                        <button
                          onClick={() => handleBuy(turtle.id, turtle.price)}
                          disabled={!canAfford}
                          className={`w-full rounded-full px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium transition ${
                            canAfford
                              ? "bg-amber-500 text-white hover:bg-amber-600 shadow-md"
                              : "bg-zinc-200 text-zinc-500 cursor-not-allowed"
                          }`}
                        >
                          {canAfford
                            ? lang === "pl"
                              ? "Kup"
                              : "Acheter"
                            : lang === "pl"
                              ? "Brak monet"
                              : "Manquant"}
                        </button>
                      )}
                    </article>
                  );
                })}
              </div>
            </section>
          );
        })}
      </section>

      {/* Feedback toast */}
      {feedback && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
          <div
            className={`rounded-full px-6 py-3 text-sm font-medium shadow-2xl backdrop-blur ${
              feedback.type === "ok"
                ? "bg-emerald-700 text-white"
                : "bg-rose-600 text-white"
            }`}
          >
            {feedback.msg}
          </div>
        </div>
      )}
    </main>
  );
}
