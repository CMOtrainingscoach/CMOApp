import Link from "next/link";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, Square, Target } from "lucide-react";
import { cn } from "@/lib/utils";

const STATUS_BADGE: Record<string, string> = {
  completed: "badge-success",
  reviewed: "badge-success",
  in_progress: "badge-warning",
  pending: "badge-muted",
};

const STATUS_LABEL: Record<string, string> = {
  completed: "Completed",
  reviewed: "Reviewed",
  in_progress: "In Progress",
  pending: "Pending",
};

export function TasksMissions({
  tasks,
}: {
  tasks: { id: string; title: string; status: string }[];
}) {
  const display =
    tasks.length > 0
      ? tasks.slice(0, 4)
      : [
          { id: "p1", title: "Analyze a competitor's positioning", status: "completed" },
          { id: "p2", title: "Build a financial case for your offer", status: "in_progress" },
          { id: "p3", title: "Write a LinkedIn post in executive voice", status: "pending" },
          { id: "p4", title: "Review uploaded deck and give feedback", status: "pending" },
        ];
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <Target className="size-3.5" /> Tasks & Missions
        </CardTitle>
        <Link
          href="/coach"
          className="text-[11px] tracking-[0.16em] uppercase text-text-muted hover:text-gold-300"
        >
          View All
        </Link>
      </CardHeader>
      <CardBody className="space-y-2">
        {display.map((t) => {
          const done = t.status === "completed" || t.status === "reviewed";
          return (
            <div
              key={t.id}
              className="flex items-center justify-between gap-3 rounded-lg px-2 py-2 hover:bg-white/[0.02]"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={cn(
                    "flex size-5 shrink-0 items-center justify-center rounded border",
                    done
                      ? "bg-gold-500/15 border-border-gold text-gold-300"
                      : "bg-transparent border-white/15 text-transparent",
                  )}
                >
                  {done ? (
                    <Check className="size-3.5" strokeWidth={2.5} />
                  ) : (
                    <Square className="size-3" />
                  )}
                </div>
                <span
                  className={cn(
                    "text-sm truncate",
                    done
                      ? "text-text-muted line-through"
                      : "text-text-primary",
                  )}
                >
                  {t.title}
                </span>
              </div>
              <span className={STATUS_BADGE[t.status] ?? "badge-muted"}>
                {STATUS_LABEL[t.status] ?? t.status}
              </span>
            </div>
          );
        })}
      </CardBody>
    </Card>
  );
}
