"use client";

import { useT } from "@/i18n/LanguageProvider";

export function LanguageSwitch() {
  const { lang, setLang } = useT();
  return (
    <div
      className="inline-flex items-center rounded-full border border-emerald-200 bg-white/70 p-0.5 backdrop-blur text-xs font-medium"
      role="group"
      aria-label="Language"
    >
      <button
        onClick={() => setLang("pl")}
        className={`px-3 py-1 rounded-full transition ${
          lang === "pl"
            ? "bg-emerald-700 text-white shadow-sm"
            : "text-emerald-900/60 hover:text-emerald-900"
        }`}
        aria-pressed={lang === "pl"}
      >
        🇵🇱 PL
      </button>
      <button
        onClick={() => setLang("fr")}
        className={`px-3 py-1 rounded-full transition ${
          lang === "fr"
            ? "bg-emerald-700 text-white shadow-sm"
            : "text-emerald-900/60 hover:text-emerald-900"
        }`}
        aria-pressed={lang === "fr"}
      >
        🇫🇷 FR
      </button>
    </div>
  );
}
