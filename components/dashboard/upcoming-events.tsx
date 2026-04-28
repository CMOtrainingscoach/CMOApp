import Link from "next/link";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Star, Phone } from "lucide-react";

const ICON_BY_INDEX = [Calendar, Star, Phone];

function fmt(date: Date) {
  const d = date.toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const t = date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
  return `${d} • ${t}`;
}

export function UpcomingEvents({
  events,
}: {
  events: { id: string; title: string; deadline: string }[];
}) {
  const display =
    events.length > 0
      ? events.slice(0, 3)
      : [
          {
            id: "p1",
            title: "Case Study Review",
            deadline: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          },
          {
            id: "p2",
            title: "Strategy Critique Session",
            deadline: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
          },
          {
            id: "p3",
            title: "Weekly Review Call",
            deadline: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(),
          },
        ];
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <Calendar className="size-3.5" /> Upcoming Events
        </CardTitle>
      </CardHeader>
      <CardBody className="space-y-2.5">
        {display.map((e, i) => {
          const Icon = ICON_BY_INDEX[i % ICON_BY_INDEX.length];
          return (
            <div key={e.id} className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-lg bg-gold-500/8 text-gold-300 border border-border-subtle">
                <Icon className="size-4" strokeWidth={1.6} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-text-primary truncate">
                  {e.title}
                </div>
                <div className="text-[11px] text-text-muted">
                  {fmt(new Date(e.deadline))}
                </div>
              </div>
            </div>
          );
        })}
      </CardBody>
      <div className="flex justify-center pb-4">
        <Link
          href="/coach"
          className="text-xs tracking-[0.16em] uppercase text-gold-300 hover:text-gold-200"
        >
          View Calendar
        </Link>
      </div>
    </Card>
  );
}
