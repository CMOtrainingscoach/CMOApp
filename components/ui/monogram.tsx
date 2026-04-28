import { cn } from "@/lib/utils";

export function Monogram({
  size = 56,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative flex items-center justify-center rounded-md",
        className,
      )}
      style={{ width: size, height: size }}
    >
      <span
        className="font-display font-bold leading-none tracking-tight gold-text"
        style={{ fontSize: size * 0.62 }}
      >
        ME
      </span>
    </div>
  );
}

export function CrownMark({ className }: { className?: string }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden
    >
      <path
        d="M3 19h18l-1.6-9-4.4 3-3-6-3 6-4.4-3L3 19z"
        fill="url(#crown-grad)"
        stroke="#D4AF37"
        strokeWidth="0.5"
      />
      <defs>
        <linearGradient id="crown-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#E8C66E" />
          <stop offset="100%" stopColor="#8B6F2F" />
        </linearGradient>
      </defs>
    </svg>
  );
}
