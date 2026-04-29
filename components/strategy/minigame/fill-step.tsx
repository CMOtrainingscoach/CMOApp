"use client";

import { cn } from "@/lib/utils";
import type { FillPayload } from "./types";

type Props = {
  prompt: string;
  payload: FillPayload;
  selected: number | null;
  onSelect: (index: number) => void;
  locked: boolean;
  correctIndex: number | null;
};

export function FillStep({
  prompt,
  payload,
  selected,
  onSelect,
  locked,
  correctIndex,
}: Props) {
  const steps = payload.steps ?? [];
  const options = payload.options ?? [];
  const blankFilledLabel =
    selected != null ? options[selected] : null;

  return (
    <div className="space-y-5">
      <p className="text-lg leading-relaxed text-text-primary">{prompt}</p>
      <ol className="space-y-2">
        {steps.map((step, i) => (
          <li
            key={i}
            className={cn(
              "flex items-start gap-3 rounded-xl border px-4 py-3 text-sm",
              step.is_blank
                ? "border-gold-500/30 bg-gold-500/[0.04]"
                : "border-border-subtle bg-white/[0.02]",
            )}
          >
            <span
              className={cn(
                "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs",
                step.is_blank
                  ? "border-gold-500/60 text-gold-300"
                  : "border-white/10 text-text-muted",
              )}
            >
              {i + 1}
            </span>
            <span
              className={cn(
                "leading-relaxed",
                step.is_blank ? "italic text-gold-200" : "text-text-primary",
              )}
            >
              {step.is_blank ? blankFilledLabel ?? "_______" : step.text}
            </span>
          </li>
        ))}
      </ol>
      <div className="grid gap-2 sm:grid-cols-2">
        {options.map((opt, i) => {
          const isSelected = selected === i;
          const isCorrect = locked && correctIndex === i;
          const isWrong = locked && isSelected && correctIndex !== i;
          return (
            <button
              key={i}
              type="button"
              disabled={locked}
              onClick={() => onSelect(i)}
              className={cn(
                "rounded-xl border px-3 py-2.5 text-left text-sm transition-all",
                "border-border-subtle bg-white/[0.02] hover:border-border-gold hover:bg-white/[0.04]",
                isSelected && !locked && "border-gold-500/60 bg-gold-500/[0.07] text-gold-100",
                isCorrect && "border-emerald-500/60 bg-emerald-500/10 text-emerald-200",
                isWrong && "border-red-500/60 bg-red-500/10 text-red-200",
                locked && "cursor-not-allowed",
              )}
            >
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}
