"use client";

import Link from "next/link";
import { CuteTurtle } from "@/components/CuteTurtle";
import { FallingSalads } from "@/components/FallingSalads";
import { LanguageSwitch } from "@/components/LanguageSwitch";
import { TurtleCard } from "@/components/Turtle";
import { TurtleIcon } from "@/components/TurtleIcon";
import { useT } from "@/i18n/LanguageProvider";
import { TURTLES_BY_ID } from "@/data/turtles";

const FEATURED_IDS = ["normal", "ninja", "fire", "dragon", "god", "zolwiomly_bogacz"];

export default function Home() {
  const { t, lang } = useT();
  const featured = FEATURED_IDS.map((id) => TURTLES_BY_ID[id]).filter(Boolean);
  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-br from-lime-50 via-emerald-50 to-amber-50 font-[var(--font-inter)]">
      <FallingSalads />

      <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <Link
          href="/"
          className="inline-flex items-center gap-2 font-[var(--font-fraunces)] text-xl font-semibold text-emerald-900 tracking-tight"
        >
          <TurtleIcon className="w-9 h-9" />
          Żarłoczne Żółwie
        </Link>
        <nav className="hidden md:flex items-center gap-8 text-sm text-emerald-900/70">
          <Link href="#tryby" className="hover:text-emerald-900 transition">
            {t("nav.modes")}
          </Link>
          <Link href="/zolwie" className="hover:text-emerald-900 transition">
            {t("nav.turtles")}
          </Link>
          <Link href="/ranking" className="hover:text-emerald-900 transition">
            {t("nav.ranking")}
          </Link>
          <Link href="/znajomi" className="hover:text-emerald-900 transition">
            {t("nav.friends")}
          </Link>
        </nav>
        <div className="flex items-center gap-3">
          <LanguageSwitch />
          <Link
            href="/auth"
            className="rounded-full bg-emerald-700 px-5 py-2 text-sm font-medium text-white shadow-md shadow-emerald-700/20 hover:bg-emerald-800 transition"
          >
            {t("nav.login")}
          </Link>
        </div>
      </header>

      <section className="relative z-10 mx-auto grid max-w-6xl grid-cols-1 items-center gap-12 px-6 pt-12 pb-24 md:grid-cols-2 md:pt-20">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white/60 px-4 py-1.5 text-xs font-medium text-emerald-800 backdrop-blur">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            {t("hero.badge")}
          </span>
          <h1 className="mt-6 font-[var(--font-fraunces)] text-6xl md:text-7xl font-semibold leading-[0.95] tracking-tight text-emerald-950">
            {t("hero.title.line1")}
            <br />
            <span className="italic text-emerald-700">{t("hero.title.line2")}</span>
            <span className="text-amber-500">.</span>
          </h1>
          <p className="mt-6 max-w-md text-lg leading-relaxed text-emerald-900/70">
            {t("hero.tagline")}
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-4">
            <Link
              href="/play"
              className="group relative overflow-hidden rounded-full bg-emerald-700 px-8 py-4 text-base font-semibold text-white shadow-lg shadow-emerald-700/30 hover:shadow-xl hover:shadow-emerald-700/40 transition-all hover:-translate-y-0.5"
            >
              <span className="relative z-10">{t("hero.cta.play")}</span>
              <span className="absolute inset-0 bg-gradient-to-r from-emerald-600 to-emerald-800 opacity-0 group-hover:opacity-100 transition-opacity" />
            </Link>
            <Link
              href="/zolwie"
              className="rounded-full border border-emerald-300 bg-white/60 px-8 py-4 text-base font-medium text-emerald-900 backdrop-blur hover:bg-white transition"
            >
              {t("hero.cta.turtles")}
            </Link>
          </div>
          <p className="mt-6 text-sm text-emerald-900/50">{t("hero.note")}</p>
        </div>

        <div className="relative flex justify-center">
          <div className="absolute inset-0 -z-10 mx-auto h-56 w-56 rounded-full bg-gradient-to-br from-amber-200 via-lime-200 to-emerald-300 blur-3xl opacity-60" />
          <div className="animate-turtle-bob">
            <CuteTurtle />
          </div>
        </div>
      </section>

      <section id="tryby" className="relative z-10 mx-auto max-w-6xl px-6 pb-24">
        <h2 className="mb-8 font-[var(--font-fraunces)] text-3xl font-semibold text-emerald-950">
          {t("modes.title")}
        </h2>
        <div className="grid gap-5 md:grid-cols-3">
          {[
            {
              emoji: "🥬",
              titleKey: "modes.solo.title" as const,
              descKey: "modes.solo.desc" as const,
              color: "from-lime-100 to-emerald-100",
              href: "/play/game?mode=solo",
            },
            {
              emoji: "👥",
              titleKey: "modes.duo.title" as const,
              descKey: "modes.duo.desc" as const,
              color: "from-amber-100 to-rose-100",
              href: "/play/game?mode=duo",
            },
            {
              emoji: "♾️",
              titleKey: "modes.endless.title" as const,
              descKey: "modes.endless.desc" as const,
              color: "from-sky-100 to-violet-100",
              href: "/play/game?mode=endless",
            },
          ].map((m) => (
            <Link
              key={m.titleKey}
              href={m.href}
              className={`group rounded-3xl bg-gradient-to-br ${m.color} p-7 transition hover:-translate-y-1 hover:shadow-xl block`}
            >
              <div className="mb-3 text-4xl transition-transform group-hover:scale-110">
                {m.emoji}
              </div>
              <h3 className="font-[var(--font-fraunces)] text-2xl font-semibold text-emerald-950">
                {t(m.titleKey)}
              </h3>
              <p className="mt-2 text-sm text-emerald-900/70">{t(m.descKey)}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* Turtle teaser */}
      <section className="relative z-10 mx-auto max-w-6xl px-6 pb-24">
        <div className="flex items-end justify-between mb-8">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-emerald-700 mb-2">
              {t("teaser.eyebrow")}
            </p>
            <h2 className="font-[var(--font-fraunces)] text-3xl md:text-4xl font-semibold text-emerald-950 leading-tight">
              {t("teaser.title")}
            </h2>
            <p className="mt-2 text-emerald-900/65 max-w-md">{t("teaser.subtitle")}</p>
          </div>
          <Link
            href="/zolwie"
            className="hidden md:inline-flex items-center gap-2 rounded-full border border-emerald-300 bg-white/60 px-5 py-2 text-sm font-medium text-emerald-900 backdrop-blur hover:bg-white transition"
          >
            {t("teaser.cta")}
          </Link>
        </div>
        <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
          {featured.map((turtle) => (
            <TurtleCard
              key={turtle.id}
              id={`teaser-${turtle.id}`}
              name={turtle.names[lang]}
              rarity={turtle.rarity}
              desc={turtle.descs[lang]}
              visual={turtle.visual}
            />
          ))}
        </div>
        <div className="mt-6 md:hidden text-center">
          <Link
            href="/zolwie"
            className="inline-flex items-center gap-2 rounded-full border border-emerald-300 bg-white/60 px-5 py-2 text-sm font-medium text-emerald-900 backdrop-blur hover:bg-white transition"
          >
            {t("teaser.cta")}
          </Link>
        </div>
      </section>

      <footer className="relative z-10 mx-auto max-w-6xl px-6 pb-10 pt-8 border-t border-emerald-100 flex flex-wrap items-center justify-between gap-4 text-sm text-emerald-900/60">
        <p>{t("footer.author")}</p>
        <p className="italic">{t("footer.tagline")}</p>
      </footer>
    </main>
  );
}
