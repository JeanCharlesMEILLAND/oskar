export function TurtleSoft({ className = "w-48" }: { className?: string }) {
  return (
    <svg viewBox="0 0 320 300" className={`${className} drop-shadow-xl`}>
      <defs>
        <radialGradient id="ts-shell" cx="40%" cy="35%">
          <stop offset="0%" stopColor="#86efac" />
          <stop offset="60%" stopColor="#22c55e" />
          <stop offset="100%" stopColor="#15803d" />
        </radialGradient>
        <radialGradient id="ts-body" cx="50%" cy="40%">
          <stop offset="0%" stopColor="#4ade80" />
          <stop offset="100%" stopColor="#16a34a" />
        </radialGradient>
      </defs>
      {/* tail */}
      <path d="M 252 220 Q 270 222 274 230 Q 268 232 254 228 Z" fill="#15803d" />
      <ellipse cx="160" cy="270" rx="100" ry="9" fill="#000" opacity="0.13" />
      {/* legs */}
      <ellipse cx="80" cy="215" rx="22" ry="16" fill="url(#ts-body)" />
      <ellipse cx="240" cy="215" rx="22" ry="16" fill="url(#ts-body)" />
      <ellipse cx="100" cy="245" rx="20" ry="14" fill="url(#ts-body)" />
      <ellipse cx="220" cy="245" rx="20" ry="14" fill="url(#ts-body)" />
      {/* claws */}
      {[
        [74, 226],
        [234, 226],
        [94, 254],
        [214, 254],
      ].map(([x, y], i) => (
        <g key={i}>
          <path d={`M ${x - 5} ${y} L ${x - 3} ${y + 5} L ${x - 1} ${y} Z`} fill="#0f5e2a" />
          <path d={`M ${x} ${y + 1} L ${x + 2} ${y + 6} L ${x + 4} ${y + 1} Z`} fill="#0f5e2a" />
          <path d={`M ${x + 5} ${y} L ${x + 7} ${y + 5} L ${x + 9} ${y} Z`} fill="#0f5e2a" />
        </g>
      ))}
      {/* shell */}
      <ellipse cx="160" cy="195" rx="95" ry="70" fill="url(#ts-shell)" />
      <ellipse cx="160" cy="195" rx="95" ry="70" fill="none" stroke="#0f5e2a" strokeWidth="3" opacity="0.55" />
      <ellipse cx="160" cy="190" rx="78" ry="55" fill="none" stroke="#15803d" strokeWidth="1.2" opacity="0.45" />
      {/* hexagonal scutes */}
      {[
        [160, 165, 18],
        [128, 185, 16],
        [192, 185, 16],
        [160, 215, 18],
        [115, 220, 14],
        [205, 220, 14],
      ].map(([cx, cy, r], i) => (
        <polygon
          key={i}
          points={hex(cx, cy, r)}
          fill="none"
          stroke="#16a34a"
          strokeWidth="1.5"
          opacity="0.7"
        />
      ))}
      {/* neck collar */}
      <ellipse cx="160" cy="155" rx="26" ry="8" fill="#15803d" opacity="0.6" />
      {/* head */}
      <ellipse cx="160" cy="128" rx="36" ry="32" fill="url(#ts-body)" />
      {/* cheeks */}
      <ellipse cx="137" cy="120" rx="5" ry="3" fill="#fda4af" opacity="0.55" />
      <ellipse cx="183" cy="120" rx="5" ry="3" fill="#fda4af" opacity="0.55" />
      {/* eyes */}
      <ellipse cx="148" cy="128" rx="5" ry="6" fill="white" />
      <ellipse cx="172" cy="128" rx="5" ry="6" fill="white" />
      <circle cx="149" cy="130" r="2.6" fill="#0a0a0a" />
      <circle cx="173" cy="130" r="2.6" fill="#0a0a0a" />
      <circle cx="150" cy="129" r="0.9" fill="white" />
      <circle cx="174" cy="129" r="0.9" fill="white" />
      {/* beak */}
      <path d="M 153 140 Q 160 154 167 140 Q 160 146 153 140 Z" fill="#0a3a1a" opacity="0.85" />
    </svg>
  );
}

function hex(cx: number, cy: number, r: number) {
  const pts: string[] = [];
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i - Math.PI / 6;
    pts.push(`${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`);
  }
  return pts.join(" ");
}

export function TurtleSoftTop({ className = "w-28" }: { className?: string }) {
  return (
    <svg viewBox="0 0 160 160" className={`${className} drop-shadow-md`}>
      <defs>
        <radialGradient id="tst-shell" cx="40%" cy="40%">
          <stop offset="0%" stopColor="#86efac" />
          <stop offset="60%" stopColor="#22c55e" />
          <stop offset="100%" stopColor="#15803d" />
        </radialGradient>
        <radialGradient id="tst-body" cx="50%" cy="50%">
          <stop offset="0%" stopColor="#4ade80" />
          <stop offset="100%" stopColor="#16a34a" />
        </radialGradient>
      </defs>
      <ellipse cx="80" cy="82" rx="62" ry="6" fill="#000" opacity="0.12" />
      <ellipse cx="32" cy="50" rx="13" ry="10" fill="url(#tst-body)" />
      <ellipse cx="128" cy="50" rx="13" ry="10" fill="url(#tst-body)" />
      <ellipse cx="32" cy="115" rx="13" ry="10" fill="url(#tst-body)" />
      <ellipse cx="128" cy="115" rx="13" ry="10" fill="url(#tst-body)" />
      <path d="M 73 138 L 80 152 L 87 138 Z" fill="#15803d" />
      <ellipse cx="80" cy="24" rx="17" ry="15" fill="url(#tst-body)" />
      <circle cx="73" cy="20" r="2" fill="#0a0a0a" />
      <circle cx="87" cy="20" r="2" fill="#0a0a0a" />
      <ellipse cx="80" cy="82" rx="55" ry="50" fill="url(#tst-shell)" />
      <ellipse cx="80" cy="82" rx="55" ry="50" fill="none" stroke="#0f5e2a" strokeWidth="2" opacity="0.55" />
      {[
        [80, 60, 13],
        [55, 78, 12],
        [105, 78, 12],
        [80, 92, 14],
        [55, 105, 11],
        [105, 105, 11],
      ].map(([cx, cy, r], i) => (
        <polygon
          key={i}
          points={hex(cx, cy, r)}
          fill="none"
          stroke="#16a34a"
          strokeWidth="1.2"
          opacity="0.65"
        />
      ))}
    </svg>
  );
}
