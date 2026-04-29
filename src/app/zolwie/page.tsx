"use client";

import Link from "next/link";
import { TurtleCard } from "@/components/Turtle";
import { FallingSalads } from "@/components/FallingSalads";
import { LanguageSwitch } from "@/components/LanguageSwitch";
import { TurtleIcon } from "@/components/TurtleIcon";
import { useT } from "@/i18n/LanguageProvider";
import { TURTLES, RARITY_ORDER, type Rarity } from "@/data/turtles";

const RARITY_KEY: Record<Rarity, "zolwie.rarity.basic" | "zolwie.rarity.rare" | "zolwie.rarity.epic" | "zolwie.rarity.legendary" | "zolwie.rarity.limited"> = {
  basic: "zolwie.rarity.basic",
  rare: "zolwie.rarity.rare",
  epic: "zolwie.rarity.epic",
  legendary: "zolwie.rarity.legendary",
  limited: "zolwie.rarity.limited",
};

export default function ZolwiePage() {
  const { t, lang } = useT();
  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-br from-lime-50 via-emerald-50 to-amber-50 font-[var(--font-inter)]">
      <FallingSalads count={8} />

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
          <Link href="/" className="text-sm text-emerald-700 hover:text-emerald-900 transition">
            ← Lobby
          </Link>
        </div>
      </header>

      <section className="relative z-10 mx-auto max-w-6xl px-6 pt-8 pb-24">
        <div className="text-center mb-12">
          <h1 className="font-[var(--font-fraunces)] text-5xl md:text-6xl font-semibold leading-[0.95] tracking-tight text-emerald-950">
            {t("zolwie.title")}
          </h1>
          <p className="mt-4 text-emerald-900/60 italic">{t("zolwie.subtitle")}</p>
        </div>

        {RARITY_ORDER.map((rarity) => {
          const items = TURTLES.filter((t) => t.rarity === rarity);
          if (!items.length) return null;
          return (
            <section key={rarity} className="mb-14">
              <div className="mb-5 flex items-baseline justify-between">
                <h2 className="font-[var(--font-fraunces)] text-2xl md:text-3xl font-semibold text-emerald-950">
                  {t(RARITY_KEY[rarity])}
                </h2>
                <span className="text-xs uppercase tracking-widest text-emerald-900/50">
                  {items.length}
                </span>
              </div>
              <div className="grid gap-5 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                {items.map((turtle) => (
                  <TurtleCard
                    key={turtle.id}
                    id={turtle.id}
                    name={turtle.names[lang]}
                    rarity={turtle.rarity}
                    desc={turtle.descs[lang]}
                    visual={turtle.visual}
                  >
                    <div className="mt-3 flex items-center justify-between text-xs">
                      <span className="font-mono text-emerald-900/70">
                        🥬 {turtle.price.toLocaleString()}
                      </span>
                      <span className="text-base">{turtle.emoji}</span>
                    </div>
                  </TurtleCard>
                ))}
              </div>
            </section>
          );
        })}

        <div className="mt-12 rounded-2xl bg-emerald-900 text-emerald-50 p-6 text-center text-sm">
          {t("zolwie.hoverHint")}
        </div>
      </section>
    </main>
  );
}
