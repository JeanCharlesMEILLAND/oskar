import { Turtle } from "./Turtle";

export function ModeIconSolo({ className = "w-28" }: { className?: string }) {
  return (
    <div className={`relative ${className} flex items-center justify-center`}>
      <Turtle
        idKey="mode-solo"
        body="#4ade80"
        shell="#22c55e"
        accent="#16a34a"
        pattern="hex"
        expression="happy"
      />
    </div>
  );
}

export function ModeIconDuo({ className = "w-40" }: { className?: string }) {
  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      <div className="relative -mr-6 scale-90">
        <Turtle
          idKey="mode-duo-1"
          body="#4ade80"
          shell="#22c55e"
          accent="#16a34a"
          pattern="hex"
          expression="happy"
        />
      </div>
      <div className="relative -ml-6 scale-90">
        <Turtle
          idKey="mode-duo-2"
          body="#facc15"
          shell="#eab308"
          accent="#fde047"
          pattern="hex"
          expression="wink"
        />
      </div>
    </div>
  );
}

export function ModeIconEndless({ className = "w-28" }: { className?: string }) {
  return (
    <div className={`relative ${className} flex items-center justify-center`}>
      <Turtle
        idKey="mode-endless"
        body="#a78bfa"
        shell="#7c3aed"
        accent="#fde047"
        pattern="crystals"
        aura="cosmic"
        expression="sparkle"
      />
      <span className="absolute -top-1 -right-3 text-3xl drop-shadow" aria-hidden>
        ♾️
      </span>
    </div>
  );
}
