import { BookOpen, Target, MessageSquare, Heart, ArrowRight } from "lucide-react";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { ProgressRing } from "@/components/ui/progress-ring";
import { Button } from "@/components/ui/button";
import Link from "next/link";

const ICONS = [BookOpen, Target, MessageSquare, Heart];

function stripPrefix(label: string, value: string) {
  const re = new RegExp(`^${label}\\s*:\\s*`, "i");
  return value.replace(re, "");
}

export function TodaysMission({
  studyItem,
  taskItem,
  reflectionPrompt,
  lifestyleItem,
  progress,
}: {
  studyItem: string;
  taskItem: string;
  reflectionPrompt: string;
  lifestyleItem: string;
  progress: number;
}) {
  const items = [
    { label: "Study", body: stripPrefix("Study", studyItem) },
    { label: "Task", body: stripPrefix("Task", taskItem) },
    { label: "Reflection", body: stripPrefix("Reflection", reflectionPrompt) },
    { label: "Lifestyle", body: stripPrefix("Lifestyle", lifestyleItem) },
  ];

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <CardTitle>
          <span className="text-gold-400">★</span> Today&apos;s CMO Mission
        </CardTitle>
      </CardHeader>
      <CardBody>
        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-6 items-center">
          <ol className="space-y-3.5">
            {items.map((it, i) => {
              const Icon = ICONS[i];
              return (
                <li key={i} className="flex items-start gap-3">
                  <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full border border-border-gold bg-gold-500/5 text-gold-300 font-display text-sm">
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0 flex items-start gap-2.5 pt-0.5">
                    <Icon
                      className="size-4 shrink-0 text-gold-400 mt-0.5"
                      strokeWidth={1.6}
                    />
                    <p className="text-[14px] leading-relaxed text-text-primary">
                      <span className="font-semibold text-gold-200">
                        {it.label}:
                      </span>{" "}
                      <span className="text-text-secondary">{it.body}</span>
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>

          <div className="flex flex-col items-center gap-4 md:pl-6 md:border-l md:border-border-hairline">
            <ProgressRing
              value={progress}
              size={140}
              stroke={9}
              caption="Mission Progress"
            />
            <Button asChild className="w-full md:w-auto">
              <Link href="/coach">
                Continue Mission <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}
