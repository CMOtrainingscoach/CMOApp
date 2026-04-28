import { cn } from "@/lib/utils";

export function ProgressRing({
  value,
  size = 120,
  stroke = 8,
  label,
  caption,
  className,
  showValue = true,
}: {
  value: number;
  size?: number;
  stroke?: number;
  label?: string;
  caption?: string;
  className?: string;
  showValue?: boolean;
}) {
  const v = Math.max(0, Math.min(100, value));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (v / 100) * c;
  const id = `ring-${Math.random().toString(36).slice(2, 8)}`;
  return (
    <div
      className={cn("relative inline-flex items-center justify-center", className)}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#E8C66E" />
            <stop offset="60%" stopColor="#D4AF37" />
            <stop offset="100%" stopColor="#8B6F2F" />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={stroke}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={`url(#${id})`}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{
            transition: "stroke-dashoffset 700ms ease-out",
            filter: "drop-shadow(0 0 6px rgba(212,175,55,0.35))",
          }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        {showValue && (
          <span className="font-display text-3xl text-text-primary leading-none">
            {label ?? `${Math.round(v)}%`}
          </span>
        )}
        {caption && (
          <span className="mt-1 text-[10px] tracking-[0.18em] uppercase text-text-muted">
            {caption}
          </span>
        )}
      </div>
    </div>
  );
}
