"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { CuteTurtle } from "@/components/CuteTurtle";
import { FallingSalads } from "@/components/FallingSalads";
import { LanguageSwitch } from "@/components/LanguageSwitch";
import { TurtleIcon } from "@/components/TurtleIcon";
import { useT } from "@/i18n/LanguageProvider";
import type { StringKey } from "@/i18n/strings";
import { login, register, importAccount, type AuthError } from "@/lib/auth";

const ERR_KEY: Record<AuthError, StringKey> = {
  empty: "auth.err.empty",
  badLogin: "auth.err.badLogin",
  exists: "auth.err.exists",
  passMatch: "auth.err.passMatch",
  passShort: "auth.err.passShort",
  fileBad: "auth.err.fileBad",
};

export default function AuthPage() {
  const { t, lang } = useT();
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [err, setErr] = useState<AuthError | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const isLogin = mode === "login";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    const result = isLogin ? login(name, pw, lang) : register(name, pw, pw2, lang);
    if (!result.ok) {
      setErr(result.error);
      setBusy(false);
      return;
    }
    setSuccess(isLogin ? t("auth.success") : t("auth.successNew"));
    setTimeout(() => router.push("/play"), 700);
  };

  const handleFile = async (file: File) => {
    setErr(null);
    setBusy(true);
    try {
      const text = await file.text();
      const result = importAccount(text, lang);
      if (!result.ok) {
        setErr(result.error);
        setBusy(false);
        return;
      }
      setSuccess(t("auth.success"));
      setTimeout(() => router.push("/play"), 700);
    } catch {
      setErr("fileBad");
      setBusy(false);
    }
  };

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
          <Link
            href="/"
            className="text-sm text-emerald-700 hover:text-emerald-900 transition"
          >
            ← Lobby
          </Link>
        </div>
      </header>

      <section className="relative z-10 mx-auto max-w-md px-6 pt-8 pb-24">
        {/* Hero illustration */}
        <div className="flex justify-center mb-2">
          <div className="relative">
            <div className="absolute inset-0 -z-10 mx-auto h-32 w-32 rounded-full bg-gradient-to-br from-amber-200 via-lime-200 to-emerald-300 blur-2xl opacity-60" />
            <div className="animate-turtle-bob">
              <CuteTurtle className="w-32" withLettuce={false} />
            </div>
          </div>
        </div>

        <h1 className="text-center font-[var(--font-fraunces)] text-4xl md:text-5xl font-semibold leading-tight tracking-tight text-emerald-950">
          {isLogin ? t("auth.welcome") : t("auth.welcomeNew")}
        </h1>
        <p className="mt-3 text-center text-emerald-900/65 max-w-sm mx-auto">
          {isLogin ? t("auth.subtitle") : t("auth.subtitleNew")}
        </p>

        {/* Card */}
        <div className="mt-8 rounded-3xl border-2 border-emerald-100 bg-white/80 backdrop-blur-md p-6 md:p-8 shadow-xl shadow-emerald-900/5">
          {/* Tabs */}
          <div className="flex p-1 bg-emerald-100/60 rounded-full mb-6">
            <button
              type="button"
              onClick={() => {
                setMode("login");
                setErr(null);
                setSuccess(null);
              }}
              className={`flex-1 px-4 py-2 text-sm font-medium rounded-full transition ${
                isLogin
                  ? "bg-emerald-700 text-white shadow-sm"
                  : "text-emerald-900/60 hover:text-emerald-900"
              }`}
              aria-pressed={isLogin}
            >
              {t("auth.tab.login")}
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("register");
                setErr(null);
                setSuccess(null);
              }}
              className={`flex-1 px-4 py-2 text-sm font-medium rounded-full transition ${
                !isLogin
                  ? "bg-emerald-700 text-white shadow-sm"
                  : "text-emerald-900/60 hover:text-emerald-900"
              }`}
              aria-pressed={!isLogin}
            >
              {t("auth.tab.register")}
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-emerald-800/70 mb-1.5">
                {t("auth.field.name")}
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="username"
                disabled={busy}
                className="w-full rounded-2xl border-2 border-emerald-100 bg-white/80 px-4 py-3 text-emerald-950 outline-none transition focus:border-emerald-500 focus:bg-white disabled:opacity-50"
                placeholder={lang === "pl" ? "np. Oskar" : "ex. Oskar"}
              />
            </div>

            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-emerald-800/70 mb-1.5">
                {t("auth.field.password")}
              </label>
              <input
                type="password"
                value={pw}
                onChange={(e) => setPw(e.target.value)}
                autoComplete={isLogin ? "current-password" : "new-password"}
                disabled={busy}
                className="w-full rounded-2xl border-2 border-emerald-100 bg-white/80 px-4 py-3 text-emerald-950 outline-none transition focus:border-emerald-500 focus:bg-white disabled:opacity-50"
              />
            </div>

            {!isLogin && (
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-emerald-800/70 mb-1.5">
                  {t("auth.field.passwordConfirm")}
                </label>
                <input
                  type="password"
                  value={pw2}
                  onChange={(e) => setPw2(e.target.value)}
                  autoComplete="new-password"
                  disabled={busy}
                  className="w-full rounded-2xl border-2 border-emerald-100 bg-white/80 px-4 py-3 text-emerald-950 outline-none transition focus:border-emerald-500 focus:bg-white disabled:opacity-50"
                />
              </div>
            )}

            {err && (
              <div className="rounded-2xl bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-800">
                {t(ERR_KEY[err])}
              </div>
            )}
            {success && (
              <div className="rounded-2xl bg-emerald-50 border border-emerald-300 px-4 py-3 text-sm text-emerald-900">
                {success}
              </div>
            )}

            <button
              type="submit"
              disabled={busy}
              className="group relative w-full overflow-hidden rounded-full bg-emerald-700 px-6 py-4 text-base font-semibold text-white shadow-lg shadow-emerald-700/25 transition hover:shadow-xl hover:shadow-emerald-700/35 hover:-translate-y-0.5 disabled:opacity-60 disabled:hover:translate-y-0"
            >
              <span className="relative z-10">
                {isLogin ? t("auth.btn.login") : t("auth.btn.register")}
              </span>
              <span className="absolute inset-0 bg-gradient-to-r from-emerald-600 to-emerald-800 opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>

            <p className="text-center text-xs text-emerald-900/55">{t("auth.tip")}</p>
          </form>

          {/* Divider */}
          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-emerald-100" />
            <span className="text-[11px] uppercase tracking-[0.2em] text-emerald-700/60">
              {t("auth.divider")}
            </span>
            <div className="h-px flex-1 bg-emerald-100" />
          </div>

          {/* Import */}
          <div>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={busy}
              className="w-full rounded-2xl border-2 border-dashed border-emerald-300 bg-emerald-50/50 px-4 py-4 text-sm font-medium text-emerald-900 hover:bg-emerald-50 hover:border-emerald-400 transition disabled:opacity-50"
            >
              {t("auth.import")}
            </button>
            <p className="mt-2 text-center text-xs text-emerald-900/55">
              {t("auth.importHint")}
            </p>
            <input
              ref={fileRef}
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
                e.target.value = "";
              }}
            />
          </div>
        </div>
      </section>
    </main>
  );
}
