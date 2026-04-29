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
      {/* Back-to-lobby button — top-center on mobile (avoids minimap top-right and
          joysticks at bottom). Sits between score cards (left) and minimap (right). */}
      <Link
        href="/play"
        className="fixed left-1/2 -translate-x-1/2 z-50 inline-flex items-center gap-1.5 rounded-full bg-white/85 backdrop-blur px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-medium text-emerald-900 shadow-lg hover:bg-white transition"
        style={{
          top: "max(env(safe-area-inset-top), 12px)",
        }}
      >
        <TurtleIcon className="w-4 h-4 sm:w-5 sm:h-5" />
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
