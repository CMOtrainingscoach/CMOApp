"use server";

import { randomUUID } from "crypto";
import { createClient } from "@/lib/supabase/server";
import { awardXp, bumpStreak } from "@/lib/strategy/xp";
import {
  STRATEGY_MARKETING_JARGON_BANK,
  JARGON_ROUND_SIZE,
} from "@/lib/strategy/marketing-jargon-bank";
import type {
  JargonSurfaceCell,
  StartPlJargonRoundResult,
  GradePlJargonRoundResult,
  SubmitMatchesPayload,
  JargonMiss,
} from "@/lib/pl/jargon-match-actions";

export type {
  JargonSurfaceCell,
  JargonMiss,
} from "@/lib/pl/jargon-match-actions";

export type StartStrategyMarketingRoundResult = StartPlJargonRoundResult;
export type GradeStrategyMarketingRoundResult = GradePlJargonRoundResult;

type CorrectPairsJson = {
  pairs: [string, string][];
};

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const t = a[i]!;
    a[i] = a[j]!;
    a[j] = t;
  }
  return a;
}

type JargonPair = (typeof STRATEGY_MARKETING_JARGON_BANK)[number];

function samplePairs(): JargonPair[] {
  return shuffle([...STRATEGY_MARKETING_JARGON_BANK]).slice(
    0,
    JARGON_ROUND_SIZE,
  );
}

const ROUND_TTL_MS = 45 * 60 * 1000;

export async function startStrategyMarketingJargonRound(): Promise<StartStrategyMarketingRoundResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const picked = samplePairs();
  const termSide = shuffle(
    picked.map((p) => ({
      canonId: p.id,
      surface: {
        id: randomUUID(),
        label: p.term,
      } satisfies JargonSurfaceCell,
    })),
  );
  const defSide = shuffle(
    picked.map((p) => ({
      canonId: p.id,
      surface: {
        id: randomUUID(),
        label: p.definition,
      } satisfies JargonSurfaceCell,
    })),
  );

  const pairs: [string, string][] = termSide.map((t) => {
    const matchedDef = defSide.find((d) => d.canonId === t.canonId);
    if (!matchedDef)
      throw new Error("Invariant: missing definition for jargon pair.");
    return [t.surface.id, matchedDef.surface.id];
  });

  const expiresAt = new Date(Date.now() + ROUND_TTL_MS).toISOString();

  await supabase.from("strategy_jargon_rounds").delete().eq("user_id", user.id);

  const { data: row, error } = await supabase
    .from("strategy_jargon_rounds")
    .insert({
      user_id: user.id,
      terms_snapshot: termSide.map((t) => t.surface),
      defs_snapshot: defSide.map((d) => d.surface),
      correct_pairs: { pairs } satisfies CorrectPairsJson,
      expires_at: expiresAt,
    })
    .select("id")
    .single();

  if (error || !row?.id)
    return { error: error?.message ?? "Could not create round." };

  return {
    roundId: row.id as string,
    terms: termSide.map((t) => t.surface),
    defs: defSide.map((d) => d.surface),
  };
}

export async function gradeStrategyMarketingJargonRound(opts: {
  roundId: string;
  submission: SubmitMatchesPayload;
}): Promise<GradeStrategyMarketingRoundResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { data: row, error } = await supabase
    .from("strategy_jargon_rounds")
    .select("terms_snapshot, defs_snapshot, correct_pairs, expires_at")
    .eq("id", opts.roundId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) return { error: error.message };
  if (!row) return { error: "Round expired or unknown." };

  if (new Date(row.expires_at as string).getTime() < Date.now()) {
    await supabase.from("strategy_jargon_rounds").delete().eq("id", opts.roundId);
    return { error: "Round expired. Start again." };
  }

  const terms = row.terms_snapshot as JargonSurfaceCell[];
  const defs = row.defs_snapshot as JargonSurfaceCell[];
  const parsed = row.correct_pairs as CorrectPairsJson;
  const pairs =
    parsed?.pairs && Array.isArray(parsed.pairs)
      ? (parsed.pairs as [string, string][])
      : [];

  const termById = new Map(terms.map((t) => [t.id, t]));
  const defById = new Map(defs.map((d) => [d.id, d]));
  const answerMap = new Map<string, string>(pairs);

  let score = 0;
  const misses: JargonMiss[] = [];

  for (const [termId, expectedDefId] of answerMap) {
    const chose = opts.submission[termId] ?? "";
    if (chose === expectedDefId) {
      score += 1;
    } else {
      misses.push({
        term: termById.get(termId)?.label ?? termId,
        expectedDef: defById.get(expectedDefId)?.label ?? "",
        choseDef: chose
          ? (defById.get(chose)?.label ?? "Unknown definition")
          : "(no pairing)",
      });
    }
  }

  await supabase.from("strategy_jargon_rounds").delete().eq("id", opts.roundId);

  await awardXp({
    userId: user.id,
    source: "practice_drill_complete",
    labSlug: "strategy",
    refId: opts.roundId,
  });
  await bumpStreak(user.id);

  return {
    score,
    total: JARGON_ROUND_SIZE,
    misses,
  };
}

export async function validateStrategyMarketingJargonPair(opts: {
  roundId: string;
  termId: string;
  defId: string;
}): Promise<{ ok: boolean } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { data: row, error } = await supabase
    .from("strategy_jargon_rounds")
    .select("correct_pairs, expires_at")
    .eq("id", opts.roundId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) return { error: error.message };
  if (!row) return { error: "Round expired or unknown." };
  if (new Date(row.expires_at as string).getTime() < Date.now()) {
    return { error: "Round expired." };
  }

  const parsed = row.correct_pairs as CorrectPairsJson;
  const pairs =
    parsed?.pairs && Array.isArray(parsed.pairs)
      ? (parsed.pairs as [string, string][])
      : [];
  const answerMap = new Map<string, string>(pairs);
  const ok = answerMap.get(opts.termId) === opts.defId;
  return { ok };
}
