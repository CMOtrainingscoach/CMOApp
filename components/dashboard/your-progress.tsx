import Link from "next/link";
import { Card, CardBody, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { ProgressRing } from "@/components/ui/progress-ring";
import { SkillBar } from "@/components/ui/skill-bar";
import { ChevronDown, ArrowRight } from "lucide-react";
import { SKILL_LABELS, type SkillKey } from "@/types/database";

export function YourProgress({
  overall,
  skills,
}: {
  overall: number;
  skills: { skill_key: SkillKey; score: number }[];
}) {
  const top = skills.slice(0, 5);
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <span className="text-gold-400">◆</span> Your Progress
        </CardTitle>
        <button className="inline-flex items-center gap-1.5 text-[11px] tracking-[0.16em] uppercase text-text-muted hover:text-gold-300 transition-colors">
          This Week <ChevronDown className="size-3.5" />
        </button>
      </CardHeader>
      <CardBody>
        <div className="grid grid-cols-1 md:grid-cols-[auto_1fr] gap-6 items-center">
          <ProgressRing
            value={overall}
            size={140}
            stroke={9}
            label={String(Math.round(overall))}
            caption="Overall Score"
          />
          <div className="space-y-3">
            {top.map((s) => (
              <SkillBar
                key={s.skill_key}
                label={SKILL_LABELS[s.skill_key]}
                value={s.score}
              />
            ))}
          </div>
        </div>
      </CardBody>
      <CardFooter className="justify-center">
        <Link
          href="/progress"
          className="inline-flex items-center gap-1.5 text-xs tracking-[0.16em] uppercase text-gold-300 hover:text-gold-200"
        >
          View Progress Dashboard <ArrowRight className="size-3.5" />
        </Link>
      </CardFooter>
    </Card>
  );
}
