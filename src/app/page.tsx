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
      <FallingSalads count={6} />

      <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between gap-2 px-4 md:px-6 py-4 md:py-6">
        <Link
          href="/"
          className="inline-flex items-center gap-2 font-[var(--font-fraunces)] text-base sm:text-lg md:text-xl font-semibold text-emerald-900 tracking-tight min-w-0"
        >
          <TurtleIcon className="w-7 h-7 md:w-9 md:h-9 shrink-0" />
          <span className="truncate">Żarłoczne Żółwie</span>
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
        <div className="flex items-center gap-2 md:gap-3 shrink-0">
          <LanguageSwitch />
          <Link
            href="/auth"
            className="rounded-full bg-emerald-700 px-3 py-1.5 md:px-5 md:py-2 text-xs md:text-sm font-medium text-white shadow-md shadow-emerald-700/20 hover:bg-emerald-800 transition whitespace-nowrap"
          >
            {t("nav.login")}
          </Link>
        </div>
      </header>

      <section className="relative z-10 mx-auto grid max-w-6xl grid-cols-1 items-center gap-8 md:gap-12 px-4 md:px-6 pt-8 pb-16 md:grid-cols-2 md:pt-20 md:pb-24">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white/60 px-3 py-1 md:px-4 md:py-1.5 text-[11px] md:text-xs font-medium text-emerald-800 backdrop-blur">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            {t("hero.badge")}
          </span>
          <h1 className="mt-5 md:mt-6 font-[var(--font-fraunces)] text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-semibold leading-[0.95] tracking-tight text-emerald-950">
            {t("hero.title.line1")}
            <br />
            <span className="italic text-emerald-700">{t("hero.title.line2")}</span>
            <span className="text-amber-500">.</span>
          </h1>
          <p className="mt-5 md:mt-6 max-w-md text-base md:text-lg leading-relaxed text-emerald-900/70">
            {t("hero.tagline")}
          </p>
          <div className="mt-8 md:mt-10 flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-3 sm:gap-4">
            <Link
              href="/play"
              className="group relative overflow-hidden rounded-full bg-emerald-700 px-6 py-3.5 md:px-8 md:py-4 text-base font-semibold text-white shadow-lg shadow-emerald-700/30 hover:shadow-xl hover:shadow-emerald-700/40 transition-all hover:-translate-y-0.5 text-center"
            >
              <span className="relative z-10">{t("hero.cta.play")}</span>
              <span className="absolute inset-0 bg-gradient-to-r from-emerald-600 to-emerald-800 opacity-0 group-hover:opacity-100 transition-opacity" />
            </Link>
            <Link
              href="/zolwie"
              className="rounded-full border border-emerald-300 bg-white/60 px-6 py-3.5 md:px-8 md:py-4 text-base font-medium text-emerald-900 backdrop-blur hover:bg-white transition text-center"
            >
              {t("hero.cta.turtles")}
            </Link>
          </div>
          <p className="mt-5 md:mt-6 text-sm text-emerald-900/50">{t("hero.note")}</p>
        </div>

        <div className="relative flex justify-center order-first md:order-last">
          <div className="absolute inset-0 -z-10 mx-auto h-44 w-44 md:h-56 md:w-56 rounded-full bg-gradient-to-br from-amber-200 via-lime-200 to-emerald-300 blur-3xl opacity-60" />
          <div className="animate-turtle-bob">
            <CuteTurtle className="w-44 sm:w-48 md:w-64" />
          </div>
        </div>
      </section>

      <section id="tryby" className="relative z-10 mx-auto max-w-6xl px-4 md:px-6 pb-16 md:pb-24">
        <h2 className="mb-6 md:mb-8 font-[var(--font-fraunces)] text-2xl md:text-3xl font-semibold text-emerald-950">
          {t("modes.title")}
        </h2>
        <div className="grid gap-4 md:gap-5 grid-cols-1 sm:grid-cols-3">
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
              className={`group rounded-3xl bg-gradient-to-br ${m.color} p-5 md:p-7 transition hover:-translate-y-1 hover:shadow-xl block`}
            >
              <div className="mb-3 text-3xl md:text-4xl transition-transform group-hover:scale-110">
                {m.emoji}
              </div>
              <h3 className="font-[var(--font-fraunces)] text-xl md:text-2xl font-semibold text-emerald-950">
                {t(m.titleKey)}
              </h3>
              <p className="mt-2 text-sm text-emerald-900/70">{t(m.descKey)}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* Turtle teaser */}
      <section className="relative z-10 mx-auto max-w-6xl px-4 md:px-6 pb-16 md:pb-24">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6 md:mb-8">
          <div>
            <p className="text-[11px] md:text-xs uppercase tracking-[0.25em] text-emerald-700 mb-2">
              {t("teaser.eyebrow")}
            </p>
            <h2 className="font-[var(--font-fraunces)] text-2xl sm:text-3xl md:text-4xl font-semibold text-emerald-950 leading-tight">
              {t("teaser.title")}
            </h2>
            <p className="mt-2 text-sm md:text-base text-emerald-900/65 max-w-md">{t("teaser.subtitle")}</p>
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

      <footer className="relative z-10 mx-auto max-w-6xl px-4 md:px-6 pb-8 md:pb-10 pt-6 md:pt-8 border-t border-emerald-100 flex flex-col sm:flex-row sm:flex-wrap items-start sm:items-center justify-between gap-2 sm:gap-4 text-xs md:text-sm text-emerald-900/60">
        <p>{t("footer.author")}</p>
        <p className="italic">{t("footer.tagline")}</p>
      </footer>
    </main>
  );
}
