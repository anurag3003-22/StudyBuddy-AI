export function ProgressRing({
  value,
  size = 112,
  stroke = 10,
  label,
  sublabel,
  tone = "brand",
}: {
  value: number;
  size?: number;
  stroke?: number;
  label?: string;
  sublabel?: string;
  tone?: "brand" | "emerald" | "amber";
}) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, value));
  const offset = circumference - (clamped / 100) * circumference;
  const colors = {
    brand: ["#6366f1", "#8b5cf6"],
    emerald: ["#10b981", "#34d399"],
    amber: ["#f59e0b", "#fbbf24"],
  }[tone];
  const gradientId = `ring-${tone}-${size}`;

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={colors[0]} />
            <stop offset="100%" stopColor={colors[1]} />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#eef2f7" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 700ms cubic-bezier(0.22, 1, 0.36, 1)" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl font-extrabold tracking-tight text-ink-900">{label ?? `${Math.round(clamped)}%`}</span>
        {sublabel && <span className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-ink-400">{sublabel}</span>}
      </div>
    </div>
  );
}
