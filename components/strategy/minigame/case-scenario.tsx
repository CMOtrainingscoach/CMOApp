"use client";

import { cn } from "@/lib/utils";

type Props = {
  prompt: string;
  value: string;
  onChange: (text: string) => void;
  locked: boolean;
};

export function CaseScenario({ prompt, value, onChange, locked }: Props) {
  return (
    <div className="space-y-5">
      <p className="text-lg leading-relaxed text-text-primary">{prompt}</p>
      <textarea
        disabled={locked}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={6}
        placeholder="Write your answer. Be specific. Use names, numbers, frameworks."
        className={cn(
          "input-field min-h-[160px] resize-y leading-relaxed",
          locked && "cursor-not-allowed opacity-80",
        )}
      />
      <p className="text-xs text-text-muted">
        Tip: 2 to 4 sentences. Reference at least one framework or P&L term.
      </p>
    </div>
  );
}
