"use client";

import Link from "next/link";
import { ArrowRight, Puzzle, Table2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function LabPlHomeTabs({
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
              Minigames &amp; drills
            </h2>
            <p className="text-text-muted text-sm mt-1">
              Jargon matchup (+5 XP per round finished) and sheet drills (10 / 20 /
              50 XP by difficulty on a correct answer).
            </p>
          </div>
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            <Link
              href="/pl-lab/jargon-match"
              className="block h-full card-premium-hover p-6 flex flex-col"
            >
              <span className="badge-gold inline-flex items-center gap-1 w-fit">
                <Puzzle className="size-3" /> Matchup
              </span>
              <h3 className="mt-4 font-display text-xl tracking-tight text-text-primary">
                P&amp;L jargon matchup
              </h3>
              <p className="mt-2 text-sm text-text-muted leading-relaxed flex-1">
                Pair each term with its definition — ten pairs per round. Five
                wrong matches lock the desk; restart for a fresh draw. Built for
                how finance shows up in the board conversation, not textbook
                trivia.
              </p>
              <div className="mt-5 flex items-center justify-between text-[11px] uppercase tracking-[0.18em] text-text-muted">
                <span>5 XP / round</span>
                <span className="inline-flex items-center gap-1 text-gold-300 text-sm font-normal normal-case tracking-normal">
                  Start <ArrowRight className="size-4" />
                </span>
              </div>
            </Link>

            <Link
              href="/pl-lab/pl-sheet-drill"
              className="block h-full card-premium-hover p-6 flex flex-col"
            >
              <span className="badge-gold inline-flex items-center gap-1 w-fit">
                <Table2 className="size-3" /> Sheet drill
              </span>
              <h3 className="mt-4 font-display text-xl tracking-tight text-text-primary">
                P&amp;L sheet drill
              </h3>
              <p className="mt-2 text-sm text-text-muted leading-relaxed flex-1">
                Simulated income-statement excerpts and one graded question per
                sheet. Three attempts; easy / medium / hard unlock 10, 20, or 50
                XP when you get it right.
              </p>
              <div className="mt-5 flex items-center justify-between text-[11px] uppercase tracking-[0.18em] text-text-muted">
                <span>10 · 20 · 50 XP</span>
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
