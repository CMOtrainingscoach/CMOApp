import { Target } from "lucide-react";
import { parseLearningOutcomes } from "@/lib/strategy/parse-learning-outcomes";
import { cn } from "@/lib/utils";

/**
 * Turns learning objective prose (possibly one concatenated block) into a
 * scannable outcomes list instead of a wall of text.
 */
export function LearningObjectivePanel({
  text,
  className,
}: {
  text: string | null | undefined;
  className?: string;
}) {
  const items = parseLearningOutcomes(text);
  if (items.length === 0) return null;

  if (items.length === 1) {
    const only = items[0];
    return (
      <div className={cn("mt-5 max-w-3xl rounded-2xl border border-border-subtle bg-white/[0.02] px-5 py-4", className)}>
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-gold-400 mb-3">
          <Target className="size-3.5" aria-hidden /> Learning objective
        </div>
        <p className="text-sm md:text-[15px] text-text-secondary leading-relaxed">
          {only}
        </p>
      </div>
    );
  }

  return (
    <section
      className={cn(
        "mt-5 max-w-3xl rounded-2xl border border-border-gold/20 bg-[linear-gradient(165deg,rgba(212,175,55,0.07)_0%,rgba(10,10,10,0.5)_42%,rgba(10,10,10,0.85)_100%)] px-5 py-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]",
        className,
      )}
      aria-labelledby="lesson-outcomes-heading"
    >
      <div id="lesson-outcomes-heading" className="flex items-center gap-2 mb-4">
        <span className="flex size-8 items-center justify-center rounded-full border border-gold-500/40 bg-gold-500/[0.12]">
          <Target className="size-4 text-gold-300" aria-hidden />
        </span>
        <div>
          <p className="text-[11px] uppercase tracking-[0.22em] text-gold-300 font-medium">
            What you&apos;ll master
          </p>
          <p className="text-xs text-text-muted mt-0.5">
            {items.length} learning outcomes — use this as your checklist through
            the lesson.
          </p>
        </div>
      </div>
      <ol className="space-y-3 list-none ml-0 p-0">
        {items.map((item, i) => (
          <li key={i} className="flex gap-3 text-sm md:text-[15px] leading-relaxed">
            <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg border border-gold-500/25 bg-gold-500/[0.08] text-[11px] font-semibold text-gold-200 tabular-nums">
              {i + 1}
            </span>
            <span className="text-text-primary/92 pt-[1px]">{item}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
