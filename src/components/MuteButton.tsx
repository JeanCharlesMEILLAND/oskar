"use client";

import { useEffect, useState } from "react";
import { isMuted, toggleMute } from "@/game/audio";

export function MuteButton({ className }: { className?: string }) {
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    setMuted(isMuted());
  }, []);

  const handleToggle = () => {
    const newState = toggleMute();
    setMuted(newState);
  };

  return (
    <button
      onClick={handleToggle}
      type="button"
      className={
        className ??
        "rounded-full border border-emerald-200 bg-white/70 px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-medium text-emerald-900 backdrop-blur hover:bg-white transition whitespace-nowrap"
      }
      aria-label={muted ? "Unmute" : "Mute"}
      title={muted ? "Włącz dźwięk" : "Wycisz"}
    >
      {muted ? "🔇" : "🔊"}
    </button>
  );
}
