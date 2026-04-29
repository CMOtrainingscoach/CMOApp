"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

type Props = {
  totalXp: number;
  correct: number;
  total: number;
  onContinue: () => void;
  continueLabel?: string;
};

export function CompletionBurst({
  totalXp,
  correct,
  total,
  onContinue,
  continueLabel = "Complete lesson",
}: Props) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setShow(true), 50);
    return () => clearTimeout(t);
  }, []);

  const pct = total === 0 ? 0 : Math.round((correct / total) * 100);
  const perfect = correct === total && total > 0;

  return (
    <div
      className={cn(
        "card-premium relative overflow-hidden p-10 text-center transition-all duration-700",
        show ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2",
      )}
    >
      {/* Radiant gold backdrop */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 50% 0%, rgba(232,198,110,0.20) 0%, rgba(212,175,55,0.05) 30%, transparent 60%)",
        }}
      />
      <div className="relative">
        <span className="badge-gold mx-auto">Challenge Complete</span>
        <h3 className="mt-5 text-3xl font-semibold tracking-tight gold-text">
          {perfect ? "Flawless run." : "Lesson absorbed."}
        </h3>
        <p className="mt-3 text-text-secondary max-w-md mx-auto leading-relaxed">
          {perfect
            ? "Every question correct. You've earned the bonus."
            : "The Professor recorded your answers. Mistakes are how strategists are forged."}
        </p>

        <div className="mt-8 grid grid-cols-3 gap-3 max-w-md mx-auto">
          <Stat label="XP Earned" value={`+${totalXp}`} accent />
          <Stat label="Correct" value={`${correct} / ${total}`} />
          <Stat label="Accuracy" value={`${pct}%`} />
        </div>

        <button
          type="button"
          onClick={onContinue}
          className="btn-gold mt-9 px-7 py-3"
        >
          {continueLabel}
        </button>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-xl border border-border-subtle bg-white/[0.02] py-4">
      <div
        className={cn(
          "text-xl font-semibold tracking-tight",
          accent ? "gold-text" : "text-text-primary",
        )}
      >
        {value}
      </div>
      <div className="mt-1 text-[10px] uppercase tracking-[0.18em] text-text-muted">
        {label}
      </div>
    </div>
  );
}
