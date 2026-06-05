"use client";



import Link from "next/link";

import { ArrowRight, Sparkles, Users } from "lucide-react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";



export function LabLifestyleHomeTabs({

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

              Quick lifestyle reps — same practice pattern as Strategy and P&amp;L Lab. More games

              will join this tab over time.

            </p>

          </div>

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">

            <Link

              href="/lifestyle/scene-match"

              className="block h-full card-premium-hover p-6 flex flex-col"

            >

              <span className="badge-gold inline-flex items-center gap-1 w-fit">

                <Users className="size-3" /> Scene

              </span>

              <h3 className="mt-4 font-display text-xl tracking-tight text-text-primary">

                Business scene matchup

              </h3>

              <p className="mt-2 text-sm text-text-muted leading-relaxed flex-1">

                Pick Belgium or international business figures, then match each person to what

                they&apos;re known for. Five wrong pairings end the round. +5 Lifestyle Lab XP when

                you complete a round.

              </p>

              <div className="mt-5 flex items-center justify-between text-[11px] uppercase tracking-[0.18em] text-text-muted">

                <span>5 XP / round</span>

                <span className="inline-flex items-center gap-1 text-gold-300 text-sm font-normal normal-case tracking-normal">

                  Start <ArrowRight className="size-4" />

                </span>

              </div>

            </Link>



            <div className="card-premium p-6 border border-dashed border-border-gold/35 bg-white/[0.02]">

              <span className="badge-muted inline-flex items-center gap-1 w-fit">

                <Sparkles className="size-3" /> Coming soon

              </span>

              <h3 className="mt-4 font-display text-xl tracking-tight text-text-primary">

                More drills

              </h3>

              <p className="mt-2 text-sm text-text-muted leading-relaxed">

                Additional lifestyle minigames will show up here as they ship.

              </p>

            </div>

          </div>

        </section>

      </TabsContent>

    </Tabs>

  );

}

