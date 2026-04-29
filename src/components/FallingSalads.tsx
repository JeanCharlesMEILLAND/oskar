const SALADS = [
  { left: 5, delay: 0, duration: 14, size: 22, drift: 30 },
  { left: 18, delay: 3, duration: 18, size: 28, drift: -20 },
  { left: 32, delay: 7, duration: 12, size: 20, drift: 40 },
  { left: 45, delay: 1, duration: 20, size: 32, drift: -30 },
  { left: 58, delay: 5, duration: 16, size: 24, drift: 25 },
  { left: 72, delay: 9, duration: 14, size: 22, drift: -35 },
  { left: 85, delay: 2, duration: 22, size: 28, drift: 20 },
  { left: 92, delay: 11, duration: 15, size: 20, drift: -25 },
  { left: 12, delay: 13, duration: 19, size: 26, drift: 35 },
  { left: 38, delay: 6, duration: 17, size: 24, drift: -40 },
  { left: 65, delay: 8, duration: 13, size: 22, drift: 30 },
  { left: 78, delay: 4, duration: 21, size: 30, drift: -20 },
];

export function FallingSalads({ count }: { count?: number }) {
  const items = count ? SALADS.slice(0, count) : SALADS;
  // On mobile, halve the visible count to avoid overlapping critical content.
  const halfCount = Math.max(2, Math.ceil(items.length / 2));
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden -z-0">
      {items.map((s, i) => (
        <span
          key={i}
          className={`absolute top-0 animate-salad-fall opacity-0 ${
            i >= halfCount ? "hidden sm:inline" : ""
          }`}
          style={{
            left: `${s.left}%`,
            fontSize: `${s.size}px`,
            animationDelay: `${s.delay}s`,
            animationDuration: `${s.duration}s`,
            ["--drift" as string]: `${s.drift}px`,
          }}
        >
          🥬
        </span>
      ))}
    </div>
  );
}
