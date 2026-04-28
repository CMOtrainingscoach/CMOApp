import { cn } from "@/lib/utils";

export function SkillBar({
  label,
  value,
  className,
}: {
  label: string;
  value: number;
  className?: string;
}) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-center justify-between text-xs">
        <span className="text-text-secondary">{label}</span>
        <span className="font-mono text-gold-300">{Math.round(v)}%</span>
      </div>
      <div className="skill-bar-track">
        <div
          className="skill-bar-fill transition-[width] duration-700 ease-out"
          style={{ width: `${v}%` }}
        />
      </div>
    </div>
  );
}
