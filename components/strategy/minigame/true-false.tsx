"use client";

import { cn } from "@/lib/utils";

type Props = {
  prompt: string;
  selected: boolean | null;
  onSelect: (value: boolean) => void;
  locked: boolean;
  correctValue: boolean | null;
};

export function TrueFalse({
  prompt,
  selected,
  onSelect,
  locked,
  correctValue,
}: Props) {
  const renderBtn = (value: boolean, label: string) => {
    const isSelected = selected === value;
    const isCorrect = locked && correctValue === value;
    const isWrong = locked && isSelected && correctValue !== value;
    return (
      <button
        key={label}
        type="button"
        disabled={locked}
        onClick={() => onSelect(value)}
        className={cn(
          "flex-1 px-6 py-5 rounded-xl border text-base font-medium tracking-wide transition-all",
          "border-border-subtle bg-white/[0.02] hover:border-border-gold hover:bg-white/[0.04]",
          isSelected && !locked && "border-gold-500/60 bg-gold-500/[0.07] text-gold-200",
          isCorrect && "border-emerald-500/60 bg-emerald-500/10 text-emerald-300",
          isWrong && "border-red-500/60 bg-red-500/10 text-red-300",
          locked && "cursor-not-allowed",
        )}
      >
        {label}
      </button>
    );
  };

  return (
    <div className="space-y-5">
      <p className="text-lg leading-relaxed text-text-primary">{prompt}</p>
      <div className="flex gap-3">
        {renderBtn(true, "True")}
        {renderBtn(false, "False")}
      </div>
    </div>
  );
}
