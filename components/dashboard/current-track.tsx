import Link from "next/link";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";

export function CurrentTrack({
  trackTitle,
  trackDescription,
  trackIndex,
  trackTotal,
  percent,
  nextLessonTitle,
  nextLessonSub,
}: {
  trackTitle: string;
  trackDescription: string;
  trackIndex: number;
  trackTotal: number;
  percent: number;
  nextLessonTitle: string;
  nextLessonSub: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <span className="text-gold-400">◇</span> Current Track
        </CardTitle>
        <span className="text-[11px] tracking-[0.16em] uppercase text-text-muted">
          {trackIndex} of {trackTotal}
        </span>
      </CardHeader>
      <CardBody>
        <h3 className="font-display text-2xl text-text-primary mb-2">
          {trackTitle}
        </h3>
        <p className="text-sm text-text-muted leading-relaxed mb-4">
          {trackDescription}
        </p>

        <div className="mb-5">
          <div className="flex items-center justify-between mb-1.5 text-xs">
            <span className="text-text-muted">Progress</span>
            <span className="font-mono text-gold-300">{Math.round(percent)}%</span>
          </div>
          <div className="skill-bar-track">
            <div className="skill-bar-fill" style={{ width: `${percent}%` }} />
          </div>
        </div>

        <div className="text-[10px] tracking-[0.18em] uppercase text-gold-500 mb-2">
          Next Lesson
        </div>
        <Link
          href="/professor"
          className={cn(
            "flex items-center gap-3 rounded-xl border border-border-subtle bg-bg-elevated/60 p-3.5",
            "hover:border-border-gold transition-colors group",
          )}
        >
          <div className="flex size-10 items-center justify-center rounded-lg bg-gold-500/10 text-gold-300 border border-border-gold">
            <BarChart3 className="size-5" strokeWidth={1.6} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-text-primary truncate">
              {nextLessonTitle}
            </div>
            <div className="text-xs text-text-muted truncate">
              {nextLessonSub}
            </div>
          </div>
          <ArrowRight className="size-4 text-text-muted group-hover:text-gold-300 group-hover:translate-x-0.5 transition-all" />
        </Link>
      </CardBody>
      <div className="flex justify-center pb-4">
        <Link
          href="/professor"
          className="inline-flex items-center gap-1.5 text-xs tracking-[0.16em] uppercase text-gold-300 hover:text-gold-200"
        >
          Continue Learning <ArrowRight className="size-3.5" />
        </Link>
      </div>
    </Card>
  );
}
