import Link from "next/link";
import {
  type LucideIcon,
  Sparkles,
  ArrowRight,
  Hourglass,
} from "lucide-react";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function TrackComingSoon({
  icon: Icon,
  pillar,
  title,
  tagline,
  description,
  outcomes,
  modules,
}: {
  icon: LucideIcon;
  pillar: string;
  title: string;
  tagline: string;
  description: string;
  outcomes: string[];
  modules: { title: string; sub: string }[];
}) {
  return (
    <div className="px-6 lg:px-8 pb-12 space-y-5">
      <Card className="overflow-hidden">
        <div className="relative p-8 lg:p-10">
          <div
            className="absolute inset-0 opacity-60"
            style={{
              backgroundImage:
                "radial-gradient(circle at 30% 0%, rgba(212,175,55,0.10) 0%, transparent 60%), radial-gradient(circle at 90% 100%, rgba(139,111,47,0.10) 0%, transparent 60%)",
            }}
          />
          <div className="relative flex flex-col lg:flex-row lg:items-center gap-6">
            <div className="flex size-16 lg:size-20 items-center justify-center rounded-2xl bg-gradient-gold-soft border border-border-gold text-gold-300 shrink-0">
              <Icon className="size-8 lg:size-9" strokeWidth={1.4} />
            </div>
            <div className="flex-1">
              <div className="text-[11px] tracking-[0.22em] uppercase text-gold-500 mb-2">
                {pillar}
              </div>
              <h1 className="font-display text-4xl lg:text-5xl mb-2 text-balance">
                {title}
              </h1>
              <p className="font-display italic text-lg lg:text-xl text-gold-200">
                {tagline}
              </p>
            </div>
            <div className="badge-gold shrink-0">
              <Hourglass className="size-3" /> In Development
            </div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>
              <Sparkles className="size-3.5" /> What this track teaches
            </CardTitle>
          </CardHeader>
          <CardBody>
            <p className="text-text-secondary leading-relaxed mb-6">
              {description}
            </p>
            <div className="text-[10px] tracking-[0.18em] uppercase text-gold-500 mb-3">
              Target Outcomes
            </div>
            <ul className="space-y-2">
              {outcomes.map((o, i) => (
                <li key={i} className="flex gap-2 text-text-primary text-sm">
                  <span className="text-gold-400 shrink-0 mt-0.5">›</span>
                  <span className="leading-relaxed">{o}</span>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              <ArrowRight className="size-3.5" /> Modules
            </CardTitle>
          </CardHeader>
          <CardBody className="space-y-2.5">
            {modules.map((m, i) => (
              <div
                key={i}
                className="flex items-start gap-3 rounded-xl border border-border-subtle bg-bg-elevated/40 p-3"
              >
                <div className="font-mono text-xs text-gold-400 mt-0.5">
                  {String(i + 1).padStart(2, "0")}
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-text-primary">
                    {m.title}
                  </div>
                  <div className="text-xs text-text-muted mt-0.5 leading-snug">
                    {m.sub}
                  </div>
                </div>
              </div>
            ))}
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardBody className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 py-6">
          <div>
            <div className="text-[11px] tracking-[0.22em] uppercase text-gold-500 mb-1">
              In the meantime
            </div>
            <p className="text-text-secondary">
              Train with the AI Professor. Most of this track&apos;s thinking
              is already available there — just ask.
            </p>
          </div>
          <Button asChild>
            <Link href="/professor">
              Open the Professor <ArrowRight className="size-4" />
            </Link>
          </Button>
        </CardBody>
      </Card>
    </div>
  );
}
