"use client";

import { JargonMatchRunner } from "@/components/practice/jargon-match-runner";
import { JARGON_ROUND_SIZE } from "@/lib/pl/jargon-match-bank";
import {
  startPlJargonRound,
  gradePlJargonRound,
  validatePlJargonPair,
} from "@/lib/pl/jargon-match-actions";

const PROFESSOR_TIPS = [
  "Match each label to how it behaves on or around the P&L—not vibes, lines.",
  "Read each definition twice before locking a pair.",
  "When two blur together, mentally translate both into CFO language first.",
];

export function PlJargonMatchRunner({
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
      labBackHref="/pl-lab"
      labBackLabel="P&L Lab"
      title="P&L jargon matchup"
      subtitle="Pair each term with its definition — ten pairs per round."
      headerImageUrl={headerImageUrl}
      headerImageAlt="P&L jargon matchup"
      professorName={professorName}
      professorAvatarUrl={professorAvatarUrl}
      professorTips={PROFESSOR_TIPS}
      feedbackPath="/api/pl/jargon-match/feedback"
      startRound={startPlJargonRound}
      gradeRound={gradePlJargonRound}
      validatePair={validatePlJargonPair}
      loadingAsideLine="Preparing terms from the CFO↔CMO glossary…"
    />
  );
}
