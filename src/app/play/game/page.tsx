"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { getCurrentSession } from "@/lib/auth";
import { TurtleIcon } from "@/components/TurtleIcon";
import { FallingSalads } from "@/components/FallingSalads";
import { GameCanvas } from "@/components/GameCanvas";

function GameInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const session = getCurrentSession();
    if (!session.name) {
      router.replace("/auth");
      return;
    }
    setReady(true);
  }, [router]);

  if (!ready) {
    return (
      <main className="relative min-h-screen flex items-center justify-center bg-gradient-to-br from-lime-50 via-emerald-50 to-amber-50">
        <div className="animate-turtle-bob">
          <TurtleIcon className="w-20 h-20" />
        </div>
      </main>
    );
  }

  const modeParam = searchParams.get("mode");
  const mode: "solo" | "duo" | "endless" =
    modeParam === "duo" ? "duo" : modeParam === "endless" ? "endless" : "solo";

  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-br from-lime-50 via-emerald-50 to-amber-50">
      <FallingSalads count={5} />

      <Link
        href="/play"
        className="fixed top-4 left-4 z-50 inline-flex items-center gap-2 rounded-full bg-emerald-700 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-emerald-700/30 hover:bg-emerald-800 transition"
      >
        <TurtleIcon className="w-5 h-5" />
        ← Lobby
      </Link>

      <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
        <GameCanvas mode={mode} />
      </div>
    </main>
  );
}

export default function GamePage() {
  return (
    <Suspense
      fallback={
        <main className="relative min-h-screen flex items-center justify-center bg-gradient-to-br from-lime-50 via-emerald-50 to-amber-50">
          <div className="animate-turtle-bob">
            <TurtleIcon className="w-20 h-20" />
          </div>
        </main>
      }
    >
      <GameInner />
    </Suspense>
  );
}
