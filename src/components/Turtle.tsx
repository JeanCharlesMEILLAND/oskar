import type { ReactNode } from "react";

export type TurtlePattern = "dots" | "hex" | "scales" | "crystals" | "stripes" | "none";
export type TurtleAccessory =
  | "crown"
  | "cap"
  | "helm"
  | "halo"
  | "horns"
  | "mask"
  | "glasses"
  | "wizard"
  | "diamond"
  | "trophy"
  | "none";
export type TurtleAura = "rainbow" | "fire" | "ice" | "shadow" | "gold" | "cosmic" | "thunder" | "none";
export type TurtleExpression = "happy" | "cool" | "sleepy" | "fierce" | "sparkle" | "wink";

export type TurtleProps = {
  body: string;
  shell: string;
  accent: string;
  belly?: string;
  pattern?: TurtlePattern;
  accessory?: TurtleAccessory;
  aura?: TurtleAura;
  expression?: TurtleExpression;
  withLettuce?: boolean;
  className?: string;
  /** Stable id suffix for SVG defs (avoid collisions when many on page). */
  idKey?: string;
};

export function Turtle({
  body,
  shell,
  accent,
  belly,
  pattern = "dots",
  accessory = "none",
  aura = "none",
  expression = "happy",
  withLettuce = false,
  className = "w-40",
  idKey = "t",
}: TurtleProps) {
  const shellId = `shell-${idKey}`;
  const bodyId = `body-${idKey}`;
  const auraId = `aura-${idKey}`;

  return (
    <svg viewBox="0 25 320 280" className={`${className} drop-shadow-xl`}>
      <defs>
        <radialGradient id={shellId} cx="40%" cy="35%">
          <stop offset="0%" stopColor={lighten(shell, 30)} />
          <stop offset="60%" stopColor={shell} />
          <stop offset="100%" stopColor={darken(shell, 25)} />
        </radialGradient>
        <radialGradient id={bodyId} cx="50%" cy="40%">
          <stop offset="0%" stopColor={lighten(body, 20)} />
          <stop offset="100%" stopColor={darken(body, 15)} />
        </radialGradient>
        {aura !== "none" && <AuraDef id={auraId} aura={aura} />}
      </defs>

      {/* Aura behind */}
      {aura !== "none" && (
        <circle cx="160" cy="170" r="135" fill={`url(#${auraId})`} opacity="0.55" />
      )}

      {/* Tail — small triangle peeking out of shell */}
      <path
        d="M 252 220 Q 270 222 274 230 Q 268 232 254 228 Z"
        fill={darken(body, 10)}
      />

      {/* Shadow */}
      <ellipse cx="160" cy="270" rx="100" ry="9" fill="#000" opacity="0.13" />

      {/* Legs */}
      <ellipse cx="80" cy="215" rx="22" ry="16" fill={`url(#${bodyId})`} />
      <ellipse cx="240" cy="215" rx="22" ry="16" fill={`url(#${bodyId})`} />
      <ellipse cx="100" cy="245" rx="20" ry="14" fill={`url(#${bodyId})`} />
      <ellipse cx="220" cy="245" rx="20" ry="14" fill={`url(#${bodyId})`} />

      {/* Claws — 3 tiny on each leg */}
      <Claws color={darken(body, 35)} />

      {/* Shell base */}
      <ellipse cx="160" cy="195" rx="95" ry="70" fill={`url(#${shellId})`} />
      {/* Shell rim — darker band suggesting carapace edge */}
      <ellipse
        cx="160"
        cy="195"
        rx="95"
        ry="70"
        fill="none"
        stroke={darken(shell, 30)}
        strokeWidth="3"
        opacity="0.55"
      />
      {/* Inner ridge — separates dome from rim */}
      <ellipse
        cx="160"
        cy="190"
        rx="78"
        ry="55"
        fill="none"
        stroke={darken(shell, 15)}
        strokeWidth="1.2"
        opacity="0.45"
      />
      <ShellPattern pattern={pattern} accent={accent} />

      {/* Belly hint */}
      {belly && (
        <ellipse cx="160" cy="235" rx="55" ry="18" fill={belly} opacity="0.5" />
      )}

      {/* Neck collar — visible band where head joins shell */}
      <ellipse
        cx="160"
        cy="155"
        rx="26"
        ry="8"
        fill={darken(body, 12)}
        opacity="0.7"
      />

      {/* Head */}
      <ellipse cx="160" cy="128" rx="36" ry="32" fill={`url(#${bodyId})`} />

      {/* Cheeks */}
      <ellipse cx="137" cy="120" rx="5" ry="3" fill="#fda4af" opacity="0.55" />
      <ellipse cx="183" cy="120" rx="5" ry="3" fill="#fda4af" opacity="0.55" />

      {/* Eyes & mouth based on expression */}
      <Face expression={expression} />

      {/* Beak — turtle's signature ✨ */}
      <Beak color={darken(body, 40)} />

      {/* Accessory */}
      <Accessory type={accessory} />

      {/* Lettuce */}
      {withLettuce && (
        <g transform="translate(205 110) rotate(20)">
          <circle cx="0" cy="0" r="14" fill="#86efac" />
          <circle cx="-6" cy="-4" r="9" fill="#bbf7d0" />
          <circle cx="6" cy="-2" r="8" fill="#bbf7d0" />
          <circle cx="0" cy="6" r="9" fill="#bbf7d0" />
        </g>
      )}
    </svg>
  );
}

function ShellPattern({ pattern, accent }: { pattern: TurtlePattern; accent: string }) {
  if (pattern === "none") return null;
  if (pattern === "dots") {
    return (
      <g opacity="0.6">
        <circle cx="125" cy="170" r="14" fill={accent} />
        <circle cx="160" cy="155" r="16" fill={accent} />
        <circle cx="195" cy="170" r="14" fill={accent} />
        <circle cx="140" cy="205" r="13" fill={accent} />
        <circle cx="180" cy="205" r="13" fill={accent} />
      </g>
    );
  }
  if (pattern === "hex") {
    return (
      <g fill="none" stroke={accent} strokeWidth="1.5" opacity="0.7">
        {[
          [160, 165, 18],
          [128, 185, 16],
          [192, 185, 16],
          [160, 215, 18],
          [115, 220, 14],
          [205, 220, 14],
        ].map(([cx, cy, r], i) => (
          <polygon key={i} points={hex(cx, cy, r)} />
        ))}
      </g>
    );
  }
  if (pattern === "scales") {
    return (
      <g fill={accent} opacity="0.55">
        {[
          [125, 170],
          [160, 162],
          [195, 170],
          [140, 195],
          [180, 195],
          [160, 220],
          [128, 220],
          [192, 220],
        ].map(([cx, cy], i) => (
          <path key={i} d={`M ${cx - 12} ${cy} A 12 8 0 0 1 ${cx + 12} ${cy}`} />
        ))}
      </g>
    );
  }
  if (pattern === "crystals") {
    return (
      <g opacity="0.7">
        <polygon points="160,150 173,170 160,195 147,170" fill={accent} />
        <polygon points="125,180 135,195 125,215 115,195" fill={accent} />
        <polygon points="195,180 205,195 195,215 185,195" fill={accent} />
      </g>
    );
  }
  if (pattern === "stripes") {
    return (
      <g stroke={accent} strokeWidth="3" opacity="0.55" fill="none" strokeLinecap="round">
        <path d="M 90 175 Q 160 145 230 175" />
        <path d="M 95 200 Q 160 175 225 200" />
        <path d="M 105 225 Q 160 205 215 225" />
      </g>
    );
  }
  return null;
}

function Claws({ color }: { color: string }) {
  const claw = (cx: number, cy: number) => (
    <>
      <path d={`M ${cx - 5} ${cy} L ${cx - 3} ${cy + 5} L ${cx - 1} ${cy} Z`} fill={color} />
      <path d={`M ${cx} ${cy + 1} L ${cx + 2} ${cy + 6} L ${cx + 4} ${cy + 1} Z`} fill={color} />
      <path d={`M ${cx + 5} ${cy} L ${cx + 7} ${cy + 5} L ${cx + 9} ${cy} Z`} fill={color} />
    </>
  );
  return (
    <>
      {/* upper feet */}
      <g>{claw(74, 226)}</g>
      <g>{claw(234, 226)}</g>
      {/* lower feet */}
      <g>{claw(94, 254)}</g>
      <g>{claw(214, 254)}</g>
    </>
  );
}

function Beak({ color }: { color: string }) {
  return (
    <g>
      <path
        d="M 153 140 Q 160 154 167 140 Q 160 146 153 140 Z"
        fill={color}
        opacity="0.85"
      />
      <line
        x1="155"
        y1="146"
        x2="165"
        y2="146"
        stroke={color}
        strokeWidth="0.8"
        opacity="0.5"
      />
    </g>
  );
}

function Face({ expression }: { expression: TurtleExpression }) {
  if (expression === "sleepy") {
    return (
      <>
        <path d="M 145 128 Q 150 125 155 128" stroke="#0a0a0a" strokeWidth="2.2" fill="none" strokeLinecap="round" />
        <path d="M 165 128 Q 170 125 175 128" stroke="#0a0a0a" strokeWidth="2.2" fill="none" strokeLinecap="round" />
        <text x="178" y="118" fontSize="14">💤</text>
      </>
    );
  }
  if (expression === "fierce") {
    return (
      <>
        <path d="M 140 120 L 154 126" stroke="#0a0a0a" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        <path d="M 166 126 L 180 120" stroke="#0a0a0a" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        <ellipse cx="148" cy="130" rx="4" ry="5" fill="#0a0a0a" />
        <ellipse cx="172" cy="130" rx="4" ry="5" fill="#0a0a0a" />
      </>
    );
  }
  if (expression === "cool") {
    return (
      <>
        <rect x="140" y="122" width="14" height="8" rx="2" fill="#0a0a0a" />
        <rect x="166" y="122" width="14" height="8" rx="2" fill="#0a0a0a" />
        <line x1="154" y1="126" x2="166" y2="126" stroke="#0a0a0a" strokeWidth="1.5" />
      </>
    );
  }
  if (expression === "sparkle") {
    return (
      <>
        <path d="M 144 124 L 148 130 L 154 124" stroke="#0a0a0a" strokeWidth="2.2" fill="none" strokeLinecap="round" />
        <path d="M 166 124 L 170 130 L 176 124" stroke="#0a0a0a" strokeWidth="2.2" fill="none" strokeLinecap="round" />
        <text x="125" y="115" fontSize="11">✨</text>
        <text x="180" y="115" fontSize="11">✨</text>
      </>
    );
  }
  if (expression === "wink") {
    return (
      <>
        <path d="M 144 128 Q 150 124 156 128" stroke="#0a0a0a" strokeWidth="2.2" fill="none" strokeLinecap="round" />
        <ellipse cx="170" cy="128" rx="5" ry="6" fill="white" />
        <circle cx="171" cy="129" r="2.5" fill="#0a0a0a" />
      </>
    );
  }
  // happy default
  return (
    <>
      <ellipse cx="148" cy="128" rx="5" ry="6" fill="white" />
      <ellipse cx="172" cy="128" rx="5" ry="6" fill="white" />
      <circle cx="149" cy="130" r="2.6" fill="#0a0a0a" />
      <circle cx="173" cy="130" r="2.6" fill="#0a0a0a" />
      <circle cx="150" cy="129" r="0.9" fill="white" />
      <circle cx="174" cy="129" r="0.9" fill="white" />
    </>
  );
}

function Accessory({ type }: { type: TurtleAccessory }) {
  if (type === "none") return null;
  if (type === "crown") {
    return (
      <g>
        <path
          d="M 132 105 L 138 90 L 148 100 L 160 85 L 172 100 L 182 90 L 188 105 Z"
          fill="#fde047"
          stroke="#a16207"
          strokeWidth="1.5"
        />
        <circle cx="160" cy="98" r="3" fill="#ef4444" />
        <circle cx="145" cy="103" r="2" fill="#3b82f6" />
        <circle cx="175" cy="103" r="2" fill="#10b981" />
      </g>
    );
  }
  if (type === "cap") {
    return (
      <g>
        <path d="M 130 108 Q 160 80 190 108 Z" fill="#1e3a8a" />
        <rect x="125" y="106" width="70" height="6" rx="2" fill="#0f172a" />
        <circle cx="160" cy="92" r="6" fill="#ef4444" />
      </g>
    );
  }
  if (type === "helm") {
    return (
      <g>
        <path d="M 122 110 Q 122 80 160 78 Q 198 80 198 110 Z" fill="#94a3b8" stroke="#475569" strokeWidth="2" />
        <rect x="138" y="108" width="44" height="6" fill="#475569" />
        <path d="M 158 78 L 162 78 L 165 70 L 155 70 Z" fill="#dc2626" />
      </g>
    );
  }
  if (type === "halo") {
    return (
      <g>
        <ellipse cx="160" cy="92" rx="42" ry="8" fill="none" stroke="#fde047" strokeWidth="3" />
        <ellipse cx="160" cy="92" rx="42" ry="8" fill="none" stroke="#fef9c3" strokeWidth="1" opacity="0.7" />
      </g>
    );
  }
  if (type === "horns") {
    return (
      <g fill="#dc2626" stroke="#7f1d1d" strokeWidth="1">
        <path d="M 138 105 Q 130 85 134 75 Q 142 92 142 108 Z" />
        <path d="M 182 105 Q 190 85 186 75 Q 178 92 178 108 Z" />
      </g>
    );
  }
  if (type === "mask") {
    return (
      <g>
        <path d="M 128 122 Q 160 110 192 122 L 192 134 Q 160 130 128 134 Z" fill="#0a0a0a" opacity="0.85" />
      </g>
    );
  }
  if (type === "glasses") {
    return (
      <g>
        <circle cx="148" cy="128" r="9" fill="none" stroke="#0a0a0a" strokeWidth="2" />
        <circle cx="172" cy="128" r="9" fill="none" stroke="#0a0a0a" strokeWidth="2" />
        <line x1="157" y1="128" x2="163" y2="128" stroke="#0a0a0a" strokeWidth="2" />
      </g>
    );
  }
  if (type === "wizard") {
    return (
      <g>
        <path d="M 130 108 L 160 60 L 190 108 Z" fill="#7c3aed" stroke="#4c1d95" strokeWidth="1.5" />
        <text x="155" y="92" fontSize="16">⭐</text>
        <rect x="125" y="106" width="70" height="6" rx="2" fill="#4c1d95" />
      </g>
    );
  }
  if (type === "diamond") {
    return (
      <g>
        <polygon
          points="160,75 178,92 160,118 142,92"
          fill="#67e8f9"
          stroke="#0e7490"
          strokeWidth="1.5"
        />
        <polygon points="160,75 178,92 160,98" fill="#cffafe" opacity="0.8" />
        <polygon points="160,98 178,92 160,118" fill="#22d3ee" opacity="0.6" />
      </g>
    );
  }
  if (type === "trophy") {
    return (
      <g>
        <path d="M 145 100 Q 145 85 160 85 Q 175 85 175 100 L 170 110 L 150 110 Z" fill="#fbbf24" stroke="#a16207" />
        <rect x="155" y="108" width="10" height="6" fill="#a16207" />
        <ellipse cx="160" cy="116" rx="14" ry="3" fill="#a16207" />
      </g>
    );
  }
  return null;
}

function AuraDef({ id, aura }: { id: string; aura: TurtleAura }) {
  if (aura === "rainbow") {
    return (
      <radialGradient id={id} cx="50%" cy="50%">
        <stop offset="0%" stopColor="#fef9c3" stopOpacity="0" />
        <stop offset="50%" stopColor="#a78bfa" stopOpacity="0.6" />
        <stop offset="100%" stopColor="#f472b6" stopOpacity="0" />
      </radialGradient>
    );
  }
  if (aura === "fire") {
    return (
      <radialGradient id={id} cx="50%" cy="50%">
        <stop offset="0%" stopColor="#fef08a" stopOpacity="0" />
        <stop offset="40%" stopColor="#fb923c" stopOpacity="0.6" />
        <stop offset="100%" stopColor="#dc2626" stopOpacity="0" />
      </radialGradient>
    );
  }
  if (aura === "ice") {
    return (
      <radialGradient id={id} cx="50%" cy="50%">
        <stop offset="0%" stopColor="#f0f9ff" stopOpacity="0" />
        <stop offset="50%" stopColor="#7dd3fc" stopOpacity="0.6" />
        <stop offset="100%" stopColor="#0284c7" stopOpacity="0" />
      </radialGradient>
    );
  }
  if (aura === "shadow") {
    return (
      <radialGradient id={id} cx="50%" cy="50%">
        <stop offset="0%" stopColor="#1e1b4b" stopOpacity="0" />
        <stop offset="50%" stopColor="#312e81" stopOpacity="0.7" />
        <stop offset="100%" stopColor="#0a0a0a" stopOpacity="0" />
      </radialGradient>
    );
  }
  if (aura === "gold") {
    return (
      <radialGradient id={id} cx="50%" cy="50%">
        <stop offset="0%" stopColor="#fef9c3" stopOpacity="0" />
        <stop offset="50%" stopColor="#fbbf24" stopOpacity="0.7" />
        <stop offset="100%" stopColor="#a16207" stopOpacity="0" />
      </radialGradient>
    );
  }
  if (aura === "cosmic") {
    return (
      <radialGradient id={id} cx="50%" cy="50%">
        <stop offset="0%" stopColor="#ddd6fe" stopOpacity="0" />
        <stop offset="50%" stopColor="#7c3aed" stopOpacity="0.6" />
        <stop offset="100%" stopColor="#1e1b4b" stopOpacity="0" />
      </radialGradient>
    );
  }
  if (aura === "thunder") {
    return (
      <radialGradient id={id} cx="50%" cy="50%">
        <stop offset="0%" stopColor="#fef9c3" stopOpacity="0" />
        <stop offset="50%" stopColor="#facc15" stopOpacity="0.7" />
        <stop offset="100%" stopColor="#1e3a8a" stopOpacity="0" />
      </radialGradient>
    );
  }
  return null;
}

function hex(cx: number, cy: number, r: number): string {
  const pts: string[] = [];
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i - Math.PI / 6;
    pts.push(`${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`);
  }
  return pts.join(" ");
}

function lighten(hex: string, percent: number): string {
  return shade(hex, percent);
}
function darken(hex: string, percent: number): string {
  return shade(hex, -percent);
}
function shade(color: string, percent: number): string {
  const c = color.replace("#", "");
  const num = parseInt(c, 16);
  let r = (num >> 16) + Math.round((percent / 100) * 255);
  let g = ((num >> 8) & 0xff) + Math.round((percent / 100) * 255);
  let b = (num & 0xff) + Math.round((percent / 100) * 255);
  r = Math.max(0, Math.min(255, r));
  g = Math.max(0, Math.min(255, g));
  b = Math.max(0, Math.min(255, b));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

export function TurtleTop({
  body,
  shell,
  accent,
  pattern = "hex",
  accessory = "none",
  aura = "none",
  className = "w-32",
  idKey = "tt",
}: Pick<TurtleProps, "body" | "shell" | "accent" | "pattern" | "accessory" | "aura" | "className" | "idKey">) {
  const shellId = `tt-shell-${idKey}`;
  const bodyId = `tt-body-${idKey}`;
  const auraId = `tt-aura-${idKey}`;
  return (
    <svg viewBox="0 0 160 160" className={`${className} drop-shadow-md`}>
      <defs>
        <radialGradient id={shellId} cx="40%" cy="40%">
          <stop offset="0%" stopColor={lighten(shell, 30)} />
          <stop offset="60%" stopColor={shell} />
          <stop offset="100%" stopColor={darken(shell, 25)} />
        </radialGradient>
        <radialGradient id={bodyId} cx="50%" cy="50%">
          <stop offset="0%" stopColor={lighten(body, 20)} />
          <stop offset="100%" stopColor={darken(body, 15)} />
        </radialGradient>
        {aura !== "none" && <AuraDef id={auraId} aura={aura} />}
      </defs>
      {aura !== "none" && (
        <circle cx="80" cy="82" r="78" fill={`url(#${auraId})`} opacity="0.55" />
      )}
      <ellipse cx="80" cy="84" rx="62" ry="6" fill="#000" opacity="0.13" />
      {/* legs */}
      <ellipse cx="32" cy="50" rx="13" ry="10" fill={`url(#${bodyId})`} />
      <ellipse cx="128" cy="50" rx="13" ry="10" fill={`url(#${bodyId})`} />
      <ellipse cx="32" cy="115" rx="13" ry="10" fill={`url(#${bodyId})`} />
      <ellipse cx="128" cy="115" rx="13" ry="10" fill={`url(#${bodyId})`} />
      {/* tiny claws */}
      {[
        [32, 60],
        [128, 60],
        [32, 105],
        [128, 105],
      ].map(([cx, cy], i) => {
        const dy = i < 2 ? 2 : -2;
        const c = darken(body, 35);
        return (
          <g key={i} fill={c}>
            <path d={`M ${cx - 5} ${cy + dy} L ${cx - 3} ${cy + dy + 3} L ${cx - 1} ${cy + dy} Z`} />
            <path d={`M ${cx} ${cy + dy + 1} L ${cx + 2} ${cy + dy + 4} L ${cx + 4} ${cy + dy + 1} Z`} />
            <path d={`M ${cx + 5} ${cy + dy} L ${cx + 7} ${cy + dy + 3} L ${cx + 9} ${cy + dy} Z`} />
          </g>
        );
      })}
      {/* tail */}
      <path d="M 73 138 L 80 152 L 87 138 Z" fill={darken(body, 20)} />
      {/* head */}
      <ellipse cx="80" cy="24" rx="17" ry="15" fill={`url(#${bodyId})`} />
      <circle cx="73" cy="20" r="2" fill="#0a0a0a" />
      <circle cx="87" cy="20" r="2" fill="#0a0a0a" />
      {/* tiny beak */}
      <path d="M 76 32 L 80 38 L 84 32 Z" fill={darken(body, 40)} opacity="0.85" />
      {/* shell */}
      <ellipse cx="80" cy="82" rx="55" ry="50" fill={`url(#${shellId})`} />
      <ellipse cx="80" cy="82" rx="55" ry="50" fill="none" stroke={darken(shell, 30)} strokeWidth="2" opacity="0.55" />
      <ellipse cx="80" cy="78" rx="42" ry="34" fill="none" stroke={darken(shell, 15)} strokeWidth="1" opacity="0.4" />
      <ShellPatternTop pattern={pattern} accent={accent} />
      <AccessoryTop type={accessory} />
    </svg>
  );
}

function ShellPatternTop({ pattern, accent }: { pattern: TurtlePattern; accent: string }) {
  if (pattern === "none") return null;
  if (pattern === "dots") {
    return (
      <g opacity="0.6">
        <circle cx="55" cy="78" r="9" fill={accent} />
        <circle cx="105" cy="78" r="9" fill={accent} />
        <circle cx="80" cy="65" r="10" fill={accent} />
        <circle cx="80" cy="100" r="10" fill={accent} />
        <circle cx="55" cy="105" r="8" fill={accent} />
        <circle cx="105" cy="105" r="8" fill={accent} />
      </g>
    );
  }
  if (pattern === "hex") {
    return (
      <g fill="none" stroke={accent} strokeWidth="1.2" opacity="0.7">
        {[
          [80, 60, 13],
          [55, 78, 12],
          [105, 78, 12],
          [80, 92, 14],
          [55, 105, 11],
          [105, 105, 11],
        ].map(([cx, cy, r], i) => (
          <polygon key={i} points={hex(cx, cy, r)} />
        ))}
      </g>
    );
  }
  if (pattern === "scales") {
    return (
      <g fill={accent} opacity="0.5">
        {[
          [60, 65],
          [80, 60],
          [100, 65],
          [55, 85],
          [80, 82],
          [105, 85],
          [60, 105],
          [80, 105],
          [100, 105],
        ].map(([cx, cy], i) => (
          <path key={i} d={`M ${cx - 9} ${cy} A 9 6 0 0 1 ${cx + 9} ${cy}`} />
        ))}
      </g>
    );
  }
  if (pattern === "crystals") {
    return (
      <g opacity="0.7">
        <polygon points="80,60 90,75 80,90 70,75" fill={accent} />
        <polygon points="55,85 63,95 55,105 47,95" fill={accent} />
        <polygon points="105,85 113,95 105,105 97,95" fill={accent} />
      </g>
    );
  }
  if (pattern === "stripes") {
    return (
      <g stroke={accent} strokeWidth="2.5" opacity="0.5" fill="none" strokeLinecap="round">
        <ellipse cx="80" cy="65" rx="40" ry="6" />
        <ellipse cx="80" cy="82" rx="48" ry="6" />
        <ellipse cx="80" cy="100" rx="40" ry="6" />
      </g>
    );
  }
  return null;
}

function AccessoryTop({ type }: { type: TurtleAccessory }) {
  if (type === "none") return null;
  if (type === "crown") {
    return (
      <g>
        <path
          d="M 67 11 L 70 4 L 75 9 L 80 2 L 85 9 L 90 4 L 93 11 Z"
          fill="#fde047"
          stroke="#a16207"
          strokeWidth="0.8"
        />
      </g>
    );
  }
  if (type === "halo") {
    return <ellipse cx="80" cy="9" rx="22" ry="3.5" fill="none" stroke="#fde047" strokeWidth="1.6" />;
  }
  if (type === "horns") {
    return (
      <g fill="#dc2626" stroke="#7f1d1d" strokeWidth="0.5">
        <path d="M 67 14 L 63 4 L 70 12 Z" />
        <path d="M 93 14 L 97 4 L 90 12 Z" />
      </g>
    );
  }
  if (type === "mask") {
    return <rect x="64" y="20" width="32" height="6" rx="1" fill="#0a0a0a" opacity="0.85" />;
  }
  if (type === "helm") {
    return (
      <g>
        <path d="M 64 18 Q 64 8 80 8 Q 96 8 96 18 Z" fill="#94a3b8" stroke="#475569" strokeWidth="0.8" />
      </g>
    );
  }
  if (type === "wizard") {
    return (
      <g>
        <path d="M 70 14 L 80 -2 L 90 14 Z" fill="#7c3aed" stroke="#4c1d95" strokeWidth="0.6" />
      </g>
    );
  }
  if (type === "diamond") {
    return (
      <g>
        <polygon
          points="80,55 90,68 80,82 70,68"
          fill="#67e8f9"
          stroke="#0e7490"
          strokeWidth="0.8"
        />
      </g>
    );
  }
  if (type === "trophy") {
    return (
      <g>
        <path d="M 73 60 Q 73 52 80 52 Q 87 52 87 60 L 84 65 L 76 65 Z" fill="#fbbf24" stroke="#a16207" strokeWidth="0.6" />
      </g>
    );
  }
  if (type === "glasses") {
    return (
      <g fill="none" stroke="#0a0a0a" strokeWidth="1">
        <circle cx="73" cy="22" r="3" />
        <circle cx="87" cy="22" r="3" />
        <line x1="76" y1="22" x2="84" y2="22" />
      </g>
    );
  }
  if (type === "cap") {
    return (
      <g>
        <path d="M 65 14 Q 80 4 95 14 Z" fill="#1e3a8a" />
      </g>
    );
  }
  return null;
}

export function TurtleCard({
  id,
  name,
  rarity,
  desc,
  visual,
  children,
}: {
  id: string;
  name: string;
  rarity: string;
  desc: string;
  visual: TurtleProps;
  children?: ReactNode;
}) {
  const rarityStyles: Record<string, string> = {
    basic: "from-lime-50 to-emerald-100 border-emerald-200",
    rare: "from-sky-50 to-blue-100 border-sky-200",
    epic: "from-violet-50 to-purple-100 border-violet-200",
    legendary: "from-amber-50 to-yellow-100 border-amber-300 shadow-amber-200/40",
    limited:
      "from-pink-50 via-fuchsia-100 to-amber-50 border-pink-300 shadow-pink-300/40",
  };
  return (
    <article
      className={`group relative overflow-hidden rounded-3xl border-2 bg-gradient-to-br p-3 sm:p-5 transition hover:-translate-y-1 hover:shadow-xl ${rarityStyles[rarity] ?? rarityStyles.basic}`}
    >
      <div className="absolute right-2 top-2 sm:right-3 sm:top-3 text-[9px] sm:text-[10px] uppercase tracking-widest text-emerald-900/60 z-10">
        {rarity}
      </div>
      <div className="flex justify-center py-2 [perspective:900px]">
        <div className="relative h-28 sm:h-36 md:h-40 w-24 sm:w-32 md:w-36 transition-transform duration-700 [transform-style:preserve-3d] group-hover:[transform:rotateY(180deg)]">
          <div className="absolute inset-0 flex items-center justify-center [backface-visibility:hidden]">
            <Turtle {...visual} idKey={id} className="w-24 sm:w-32 md:w-36" />
          </div>
          <div className="absolute inset-0 flex items-center justify-center [backface-visibility:hidden] [transform:rotateY(180deg)]">
            <TurtleTop
              body={visual.body}
              shell={visual.shell}
              accent={visual.accent}
              pattern={visual.pattern}
              accessory={visual.accessory}
              aura={visual.aura}
              idKey={`top-${id}`}
              className="w-20 sm:w-28 md:w-32"
            />
          </div>
        </div>
      </div>
      <h3 className="mt-1 text-center font-[var(--font-fraunces)] text-sm sm:text-lg font-semibold text-emerald-950 leading-tight">
        {name}
      </h3>
      <p className="mt-1 text-center text-[11px] sm:text-xs text-emerald-900/60 italic line-clamp-2">{desc}</p>
      {children}
      <p className="mt-2 text-center text-[9px] uppercase tracking-widest text-emerald-700/40 opacity-0 group-hover:opacity-100 transition">
        sprite ↻
      </p>
    </article>
  );
}
