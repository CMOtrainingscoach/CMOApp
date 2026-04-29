"use client";

import { cn } from "@/lib/utils";
import type { McPayload } from "./types";

type Props = {
  prompt: string;
  payload: McPayload;
  selected: number | null;
  onSelect: (index: number) => void;
  locked: boolean;
  correctIndex: number | null;
};

export function MultipleChoice({
  prompt,
  payload,
  selected,
  onSelect,
  locked,
  correctIndex,
}: Props) {
  return (
    <div className="space-y-5">
      <p className="text-lg leading-relaxed text-text-primary">{prompt}</p>
      <div className="grid gap-3">
        {payload.options.map((opt, i) => {
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
                "group relative w-full text-left px-4 py-3.5 rounded-xl border transition-all",
                "border-border-subtle bg-white/[0.02] hover:border-border-gold hover:bg-white/[0.04]",
                isSelected && !locked && "border-gold-500/60 bg-gold-500/[0.07]",
                isCorrect && "border-emerald-500/60 bg-emerald-500/10",
                isWrong && "border-red-500/60 bg-red-500/10",
                locked && "cursor-not-allowed",
              )}
            >
              <div className="flex items-start gap-3">
                <span
                  className={cn(
                    "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-medium",
                    "border-white/10 text-text-muted",
                    isSelected && !locked && "border-gold-500/60 text-gold-300",
                    isCorrect && "border-emerald-500/60 text-emerald-400",
                    isWrong && "border-red-500/60 text-red-400",
                  )}
                >
                  {String.fromCharCode(65 + i)}
                </span>
                <span className="text-sm leading-relaxed text-text-primary">
                  {opt}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
