"use client";

import Link from "next/link";
import { ArrowRight, Puzzle } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function LabStrategyHomeTabs({
  tracksSection,
}: {
  tracksSection: React.ReactNode;
}) {
  return (
    <Tabs defaultValue="tracks" className="space-y-8">
      <TabsList className="w-full sm:w-auto grid grid-cols-2 sm:inline-flex">
        <TabsTrigger value="tracks">Tracks</TabsTrigger>
        <TabsTrigger value="practice">Practice</TabsTrigger>
      </TabsList>
      <TabsContent value="tracks" className="mt-0 focus-visible:outline-none">
        {tracksSection}
      </TabsContent>
      <TabsContent value="practice" className="mt-0 focus-visible:outline-none">
        <section className="space-y-5">
          <div>
            <h2 className="font-display text-2xl tracking-tight gold-text">
              Practice drills
            </h2>
            <p className="text-text-muted text-sm mt-1">
              Short reps that sharpen vocabulary. Each round you finish earns{" "}
              <span className="text-gold-300/90">+5 Strategy Lab XP</span>.
            </p>
          </div>
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            <Link
              href="/strategy-lab/jargon-match"
              className="block h-full card-premium-hover p-6 flex flex-col"
            >
              <span className="badge-gold inline-flex items-center gap-1 w-fit">
                <Puzzle className="size-3" /> Jargon
              </span>
              <h3 className="mt-4 font-display text-xl tracking-tight text-text-primary">
                Marketing jargon matchup
              </h3>
              <p className="mt-2 text-sm text-text-muted leading-relaxed flex-1">
                Match abbreviations and marketing terms to sharp definitions — same
                mechanic as the P&L desk, built for strategy fluency.
              </p>
              <div className="mt-5 flex items-center justify-between text-[11px] uppercase tracking-[0.18em] text-text-muted">
                <span>5 XP / round</span>
                <span className="inline-flex items-center gap-1 text-gold-300 text-sm font-normal normal-case tracking-normal">
                  Start <ArrowRight className="size-4" />
                </span>
              </div>
            </Link>
          </div>
        </section>
      </TabsContent>
    </Tabs>
  );
}
