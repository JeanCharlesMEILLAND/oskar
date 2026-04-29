"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { getCurrentSession } from "@/lib/auth";
import { TurtleIcon } from "@/components/TurtleIcon";
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
      <main className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-lime-50 via-emerald-50 to-amber-50">
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
    <>
      <Link
        href="/play"
        className="fixed top-4 right-4 z-50 inline-flex items-center gap-2 rounded-full bg-white/85 backdrop-blur px-4 py-2 text-sm font-medium text-emerald-900 shadow-lg hover:bg-white transition"
        style={{ display: "none" }}
      >
        <TurtleIcon className="w-5 h-5" />
        Lobby
      </Link>
      <GameCanvas mode={mode} />
      {/* Discrete back-to-lobby button bottom-left */}
      <Link
        href="/play"
        className="fixed bottom-4 left-4 z-50 inline-flex items-center gap-2 rounded-full bg-white/85 backdrop-blur px-4 py-2 text-sm font-medium text-emerald-900 shadow-lg hover:bg-white transition"
      >
        <TurtleIcon className="w-5 h-5" />
        Lobby
      </Link>
    </>
  );
}

export default function GamePage() {
  return (
    <Suspense
      fallback={
        <main className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-lime-50 via-emerald-50 to-amber-50">
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
