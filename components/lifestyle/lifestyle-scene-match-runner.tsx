"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { ArrowRight, Globe, MapPin } from "lucide-react";
import { JargonMatchRunner } from "@/components/practice/jargon-match-runner";
import { LIFESTYLE_SCENE_ROUND_SIZE } from "@/lib/lifestyle/scene-match-constants";
import type { LifestyleSceneId } from "@/lib/lifestyle/scene-match-constants";
import {
  gradeLifestyleSceneRound,
  getLifestyleSceneGameOverReveal,
  startLifestyleSceneRound,
  validateLifestyleScenePair,
} from "@/lib/lifestyle/scene-match-actions";

const PROFESSOR_TIPS = [
  "Five wrong pairings end the round — treat each tap like a reputational bet.",
  "Match the **person** to the **one line** that best captures their public professional signature.",
  "Read every “known for” strip before locking a face — lazy reads burn chances.",
  "When two blur together, ask: which firm arc or role headline fits only one?",
];

export function LifestyleSceneMatchRunner({
  professorName,
  professorAvatarUrl,
}: {
  professorName: string;
  professorAvatarUrl: string | null;
}) {
  const [scene, setScene] = useState<LifestyleSceneId | null>(null);

  const startRound = useCallback(() => {
    if (!scene) return Promise.resolve({ error: "Pick a scene first." } as const);
    return startLifestyleSceneRound(scene);
  }, [scene]);

  if (scene == null) {
    return (
      <div className="space-y-8">
        <header className="space-y-2 max-w-2xl">
          <span className="badge-gold inline-flex items-center gap-1">Practice</span>
          <h1 className="font-display text-3xl sm:text-4xl tracking-tight gold-text">
            Business scene matchup
          </h1>
          <p className="text-sm text-text-muted leading-relaxed">
            Choose whether you want figures linked to the{" "}
            <strong className="text-text-primary">Belgium</strong> business scene or a broader{" "}
            <strong className="text-text-primary">international</strong> set. Then match each person
            to what they&apos;re known for.{" "}
            <span className="text-gold-300/90">Five wrong pairings</span> end the round; finishing a
            round earns <span className="text-gold-300/90">+5 Lifestyle Lab XP</span>.
          </p>
        </header>

        <div className="grid gap-5 sm:grid-cols-2 max-w-3xl">
          <button
            type="button"
            onClick={() => setScene("belgium")}
            className="card-premium-hover p-8 text-left border border-border-subtle rounded-xl transition-colors hover:border-gold-500/40"
          >
            <span className="badge-gold inline-flex items-center gap-1">
              <MapPin className="size-3" /> Belgium scene
            </span>
            <h2 className="mt-4 font-display text-xl text-text-primary">
              Belgian business circle
            </h2>
            <p className="mt-2 text-sm text-text-muted leading-relaxed">
              Operators, founders, and executives commonly associated with Belgium&apos;s corporate
              and scale-up fabric.
            </p>
            <span className="mt-6 inline-flex items-center gap-2 text-sm text-gold-300">
              Start <ArrowRight className="size-4" />
            </span>
          </button>

          <button
            type="button"
            onClick={() => setScene("international")}
            className="card-premium-hover p-8 text-left border border-border-subtle rounded-xl transition-colors hover:border-gold-500/40"
          >
            <span className="badge-gold inline-flex items-center gap-1">
              <Globe className="size-3" /> International scene
            </span>
            <h2 className="mt-4 font-display text-xl text-text-primary">
              Global business names
            </h2>
            <p className="mt-2 text-sm text-text-muted leading-relaxed">
              Widely cited leaders and builders — the kind of names that surface in cross-border
              executive education and media.
            </p>
            <span className="mt-6 inline-flex items-center gap-2 text-sm text-gold-300">
              Start <ArrowRight className="size-4" />
            </span>
          </button>
        </div>

        <Link
          href="/lifestyle"
          className="inline-flex text-xs uppercase tracking-[0.18em] text-text-muted hover:text-gold-300 transition-colors"
        >
          ← Lifestyle Lab home
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setScene(null)}
          className="text-xs uppercase tracking-[0.18em] text-text-muted hover:text-gold-300 transition-colors"
        >
          ← Change scene
        </button>
        <span className="text-[11px] uppercase tracking-[0.2em] text-gold-500/90">
          {scene === "belgium" ? "Belgium scene" : "International scene"}
        </span>
      </div>
      <JargonMatchRunner
        key={scene}
        roundSize={LIFESTYLE_SCENE_ROUND_SIZE}
        labBackHref="/lifestyle"
        labBackLabel="Lifestyle Lab"
        title="Business scene matchup"
        subtitle={`Match each person to what they are known for — ${LIFESTYLE_SCENE_ROUND_SIZE} pairs. Five wrong pairings end the round. +5 Lifestyle Lab XP when you complete a round.`}
        headerImageUrl={null}
        headerImageAlt="Business scene matchup"
        professorName={professorName}
        professorAvatarUrl={professorAvatarUrl}
        professorTips={PROFESSOR_TIPS}
        feedbackPath="/api/lifestyle/scene-match/feedback"
        startRound={startRound}
        gradeRound={gradeLifestyleSceneRound}
        validatePair={validateLifestyleScenePair}
        fetchGameOverAnswers={getLifestyleSceneGameOverReveal}
        gameOverRevealTitle="Correct pairings"
        gameOverRevealSubtitle="Here’s the full answer key for this round — use it to learn, then restart for a new board."
        loadingAsideLine="Drawing people and reputation strips for your round…"
        wrongMatchLimit={5}
        leftColumnTitle="People"
        rightColumnTitle="Known for"
      />
    </div>
  );
}
