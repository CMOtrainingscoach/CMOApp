"use client";

import { JargonMatchRunner } from "@/components/practice/jargon-match-runner";
import { JARGON_ROUND_SIZE } from "@/lib/strategy/marketing-jargon-bank";
import {
  startStrategyMarketingJargonRound,
  gradeStrategyMarketingJargonRound,
  validateStrategyMarketingJargonPair,
} from "@/lib/strategy/marketing-jargon-actions";

const PROFESSOR_TIPS = [
  "Match abbreviations to what they actually measure in market strategy—not buzzwords.",
  "When two definitions overlap, ask which one names a stage vs a lens vs a metric.",
  "Read the full definition once for scope (growth vs efficiency vs positioning).",
];

export function MarketingJargonMatchRunner({
  professorName,
  professorAvatarUrl,
  headerImageUrl,
}: {
  professorName: string;
  professorAvatarUrl: string | null;
  headerImageUrl: string | null;
}) {
  return (
    <JargonMatchRunner
      roundSize={JARGON_ROUND_SIZE}
      labBackHref="/strategy-lab"
      labBackLabel="Strategy Lab"
      title="Marketing jargon matchup"
      subtitle="Pair each term or abbreviation with its definition — ten pairs per round. +5 lab XP when you finish a round."
      headerImageUrl={headerImageUrl}
      headerImageAlt="Marketing jargon matchup"
      professorName={professorName}
      professorAvatarUrl={professorAvatarUrl}
      professorTips={PROFESSOR_TIPS}
      feedbackPath="/api/strategy/jargon-match/feedback"
      startRound={startStrategyMarketingJargonRound}
      gradeRound={gradeStrategyMarketingJargonRound}
      validatePair={validateStrategyMarketingJargonPair}
      loadingAsideLine="Preparing terms from the strategy lexicon…"
    />
  );
}
