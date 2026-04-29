type Props = { className?: string };

export function TurtleIcon({ className = "w-8 h-8" }: Props) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <defs>
        <radialGradient id="ti-shell" cx="40%" cy="35%">
          <stop offset="0%" stopColor="#86efac" />
          <stop offset="60%" stopColor="#22c55e" />
          <stop offset="100%" stopColor="#15803d" />
        </radialGradient>
        <radialGradient id="ti-body" cx="50%" cy="40%">
          <stop offset="0%" stopColor="#4ade80" />
          <stop offset="100%" stopColor="#16a34a" />
        </radialGradient>
      </defs>
      {/* legs */}
      <ellipse cx="6" cy="20" rx="3" ry="2" fill="url(#ti-body)" />
      <ellipse cx="26" cy="20" rx="3" ry="2" fill="url(#ti-body)" />
      <ellipse cx="9" cy="25" rx="2.5" ry="1.8" fill="url(#ti-body)" />
      <ellipse cx="23" cy="25" rx="2.5" ry="1.8" fill="url(#ti-body)" />
      {/* tail */}
      <path d="M 27 22 L 30 23 L 27 24 Z" fill="#15803d" />
      {/* shell */}
      <ellipse cx="16" cy="19" rx="11" ry="8" fill="url(#ti-shell)" />
      <ellipse cx="16" cy="19" rx="11" ry="8" fill="none" stroke="#0f5e2a" strokeWidth="0.6" opacity="0.6" />
      {/* hex scutes */}
      <polygon
        points="16,15 19,17 19,21 16,23 13,21 13,17"
        fill="none"
        stroke="#16a34a"
        strokeWidth="0.5"
        opacity="0.7"
      />
      <polygon
        points="9,17 11,18.5 11,21 9,22 7,21 7,18.5"
        fill="none"
        stroke="#16a34a"
        strokeWidth="0.5"
        opacity="0.7"
      />
      <polygon
        points="23,17 25,18.5 25,21 23,22 21,21 21,18.5"
        fill="none"
        stroke="#16a34a"
        strokeWidth="0.5"
        opacity="0.7"
      />
      {/* head */}
      <ellipse cx="16" cy="10" rx="5" ry="4.5" fill="url(#ti-body)" />
      {/* eyes */}
      <circle cx="14" cy="10" r="0.9" fill="#0a0a0a" />
      <circle cx="18" cy="10" r="0.9" fill="#0a0a0a" />
      {/* beak */}
      <path d="M 14.5 12.5 Q 16 14.5 17.5 12.5 Q 16 13.5 14.5 12.5 Z" fill="#0a3a1a" opacity="0.85" />
    </svg>
  );
}
