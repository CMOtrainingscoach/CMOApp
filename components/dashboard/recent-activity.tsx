import Link from "next/link";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import {
  FileUp,
  GraduationCap,
  Trophy,
  CheckCircle2,
  Activity,
} from "lucide-react";
import { timeAgo } from "@/lib/utils";

export type ActivityItem = {
  id: string;
  kind: "upload" | "feedback" | "lesson" | "score";
  title: string;
  at: string;
};

const KIND_ICON = {
  upload: FileUp,
  feedback: GraduationCap,
  lesson: CheckCircle2,
  score: Trophy,
};

export function RecentActivity({ items }: { items: ActivityItem[] }) {
  const display =
    items.length > 0
      ? items.slice(0, 4)
      : [
          {
            id: "p1",
            kind: "upload" as const,
            title: "Uploaded document: Growth Strategy Deck.pdf",
            at: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
          },
          {
            id: "p2",
            kind: "feedback" as const,
            title: "Professor feedback on your strategy",
            at: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
          },
          {
            id: "p3",
            kind: "lesson" as const,
            title: "Completed lesson: Contribution Margin Deep Dive",
            at: new Date(Date.now() - 26 * 3600 * 1000).toISOString(),
          },
          {
            id: "p4",
            kind: "score" as const,
            title: "Score updated: P&L Quiz — 85%",
            at: new Date(Date.now() - 28 * 3600 * 1000).toISOString(),
          },
        ];
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <Activity className="size-3.5" /> Recent Activity
        </CardTitle>
        <Link
          href="/progress"
          className="text-[11px] tracking-[0.16em] uppercase text-text-muted hover:text-gold-300"
        >
          View All
        </Link>
      </CardHeader>
      <CardBody className="space-y-3">
        {display.map((it) => {
          const Icon = KIND_ICON[it.kind];
          return (
            <div key={it.id} className="flex items-start gap-3">
              <Icon
                className="size-4 mt-0.5 text-gold-400 shrink-0"
                strokeWidth={1.6}
              />
              <div className="flex-1 min-w-0">
                <div className="text-sm text-text-primary truncate">
                  {it.title}
                </div>
              </div>
              <span className="text-[11px] text-text-muted whitespace-nowrap">
                {timeAgo(it.at)}
              </span>
            </div>
          );
        })}
      </CardBody>
    </Card>
  );
}
