"use server";

import { randomUUID } from "crypto";
import { createClient } from "@/lib/supabase/server";
import { awardXp, bumpStreak } from "@/lib/strategy/xp";
import type {
  GradePlJargonRoundResult,
  JargonMiss,
  JargonMatchRoundStartResult,
  JargonSurfaceCell,
  SubmitMatchesPayload,
} from "@/lib/pl/jargon-match-actions";
import {
  bankForScene,
  type LifestyleSceneBankEntry,
} from "@/lib/lifestyle/scene-match-bank";
import {
  LIFESTYLE_SCENE_ROUND_SIZE,
  type LifestyleSceneId,
} from "@/lib/lifestyle/scene-match-constants";

type CorrectPairsJson = { pairs: [string, string][] };

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

function sampleEntries(pool: LifestyleSceneBankEntry[]): LifestyleSceneBankEntry[] {
  return shuffle([...pool]).slice(0, LIFESTYLE_SCENE_ROUND_SIZE);
}

const ROUND_TTL_MS = 45 * 60 * 1000;

export async function startLifestyleSceneRound(
  scene: LifestyleSceneId,
): Promise<JargonMatchRoundStartResult> {
  if (scene !== "belgium" && scene !== "international") {
    return { error: "Invalid scene." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const pool = bankForScene(scene);
  if (pool.length < LIFESTYLE_SCENE_ROUND_SIZE) {
    return { error: "Not enough entries in this scene bank." };
  }

  const picked = sampleEntries(pool);
  const termSide = shuffle(
    picked.map((p) => ({
      canonId: p.id,
      surface: {
        id: randomUUID(),
        label: p.person,
        ...(p.imageUrl ? { imageUrl: p.imageUrl } : {}),
      } satisfies JargonSurfaceCell,
    })),
  );
  const defSide = shuffle(
    picked.map((p) => ({
      canonId: p.id,
      surface: {
        id: randomUUID(),
        label: p.knownFor,
      } satisfies JargonSurfaceCell,
    })),
  );

  const pairs: [string, string][] = termSide.map((t) => {
    const matchedDef = defSide.find((d) => d.canonId === t.canonId);
    if (!matchedDef)
      throw new Error("Invariant: missing definition for lifestyle scene pair.");
    return [t.surface.id, matchedDef.surface.id];
  });

  const expiresAt = new Date(Date.now() + ROUND_TTL_MS).toISOString();

  await supabase
    .from("lifestyle_scene_match_rounds")
    .delete()
    .eq("user_id", user.id);

  const { data: row, error } = await supabase
    .from("lifestyle_scene_match_rounds")
    .insert({
      user_id: user.id,
      scene,
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

export async function gradeLifestyleSceneRound(opts: {
  roundId: string;
  submission: SubmitMatchesPayload;
}): Promise<GradePlJargonRoundResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { data: row, error } = await supabase
    .from("lifestyle_scene_match_rounds")
    .select("terms_snapshot, defs_snapshot, correct_pairs, expires_at")
    .eq("id", opts.roundId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) return { error: error.message };
  if (!row) return { error: "Round expired or unknown." };

  if (new Date(row.expires_at as string).getTime() < Date.now()) {
    await supabase
      .from("lifestyle_scene_match_rounds")
      .delete()
      .eq("id", opts.roundId);
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
        choseDef:
          chose ? defById.get(chose)?.label ?? "Unknown strip" : "(no pairing)",
      });
    }
  }

  await supabase
    .from("lifestyle_scene_match_rounds")
    .delete()
    .eq("id", opts.roundId);

  await awardXp({
    userId: user.id,
    source: "practice_drill_complete",
    labSlug: "lifestyle",
    refId: opts.roundId,
  });
  await bumpStreak(user.id);

  return {
    score,
    total: LIFESTYLE_SCENE_ROUND_SIZE,
    misses,
  };
}

export async function validateLifestyleScenePair(opts: {
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
    .from("lifestyle_scene_match_rounds")
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

/** For game-over UX: human-readable correct pairs (does not delete the round). */
export async function getLifestyleSceneGameOverReveal(roundId: string): Promise<
  | {
      ok: true;
      rows: {
        leftLabel: string;
        rightLabel: string;
        imageUrl?: string | null;
      }[];
    }
  | { ok: false; error: string }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const { data: row, error } = await supabase
    .from("lifestyle_scene_match_rounds")
    .select("terms_snapshot, defs_snapshot, correct_pairs, expires_at")
    .eq("id", roundId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) return { ok: false, error: error.message };
  if (!row) return { ok: false, error: "Round not found or already cleared." };

  if (new Date(row.expires_at as string).getTime() < Date.now()) {
    return { ok: false, error: "This round has expired." };
  }

  const terms = row.terms_snapshot as JargonSurfaceCell[];
  const defs = row.defs_snapshot as JargonSurfaceCell[];
  const parsed = row.correct_pairs as CorrectPairsJson;
  const pairsArr =
    parsed?.pairs && Array.isArray(parsed.pairs)
      ? (parsed.pairs as [string, string][])
      : [];

  const termById = new Map(terms.map((t) => [t.id, t]));
  const defById = new Map(defs.map((d) => [d.id, d]));

  const rows = pairsArr.map(([termId, defId]) => {
    const t = termById.get(termId);
    const d = defById.get(defId);
    return {
      leftLabel: t?.label ?? "",
      rightLabel: d?.label ?? "",
      imageUrl: t?.imageUrl ?? null,
    };
  });

  rows.sort((a, b) => a.leftLabel.localeCompare(b.leftLabel));

  return { ok: true, rows };
}
