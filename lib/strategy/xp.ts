import "server-only";
import type { ContentLabSlug, XpLabSlug } from "./lab-slug";
import { createServiceRoleClient } from "@/lib/supabase/server";
import {
  loadXpLevelConfig,
  resolveCurrentXpLevel,
  resolveNextXpLevel,
  xpProgressInCurrentBracket,
  type XpLevelRow,
} from "@/lib/xp-level-catalog";

export type { XpLevelRow };

export type XpSource =
  | "lesson_complete"
  | "lesson_question_correct"
  | "minigame_perfect"
  | "practice_drill_complete"
  | "assignment_pass"
  | "module_complete"
  | "streak_week"
  | "reading_complete";

export const XP_AMOUNTS: Record<XpSource, number> = {
  lesson_complete: 50,
  lesson_question_correct: 5,
  minigame_perfect: 25,
  practice_drill_complete: 5,
  assignment_pass: 300,
  module_complete: 150,
  streak_week: 100,
  reading_complete: 25,
};

/** Progress computed from configurable `xp_level_config` (levels 0–100). */
export async function xpProgressForTotalXp(totalXp: number) {
  const rows = await loadXpLevelConfig();
  const current = resolveCurrentXpLevel(totalXp, rows);
  const next = resolveNextXpLevel(current, rows);
  const { pct, remaining } = xpProgressInCurrentBracket(totalXp, current, next);
  return {
    pct,
    remaining,
    current_rank_title: current.rank_title,
    current_level: current.level,
    next_rank_title: next?.rank_title ?? null,
  };
}

export type AwardOpts = {
  userId: string;
  source: XpSource | string;
  amount?: number;
  refId?: string | null;
  /** Attribution for per-lab XP; defaults to Strategy Lab legacy behavior. Use `shared` for cross-lab streak XP. */
  labSlug?: XpLabSlug;
};

/** Logs an XP event. The DB trigger recomputes user_lab_level and overall user_level. */
export async function awardXp(opts: AwardOpts) {
  const amount = opts.amount ?? XP_AMOUNTS[opts.source as XpSource];
  if (!amount || amount === 0) return;
  const labSlug = opts.labSlug ?? "strategy";
  const admin = createServiceRoleClient();
  await admin.from("xp_log").insert({
    user_id: opts.userId,
    source: opts.source,
    source_ref_id: opts.refId ?? null,
    xp_delta: amount,
    lab_slug: labSlug,
  });
}

/** Updates streak_tracking based on today's activity. Idempotent per day. */
export async function bumpStreak(userId: string) {
  const admin = createServiceRoleClient();
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);

  const { data: existing } = await admin
    .from("streak_tracking")
    .select("current_streak, longest_streak, last_active_date")
    .eq("user_id", userId)
    .maybeSingle();

  if (!existing) {
    await admin.from("streak_tracking").insert({
      user_id: userId,
      current_streak: 1,
      longest_streak: 1,
      last_active_date: todayStr,
    });
    return;
  }

  if (existing.last_active_date === todayStr) {
    return;
  }

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().slice(0, 10);

  const nextStreak =
    existing.last_active_date === yesterdayStr
      ? (existing.current_streak ?? 0) + 1
      : 1;
  const longest = Math.max(existing.longest_streak ?? 0, nextStreak);

  await admin
    .from("streak_tracking")
    .update({
      current_streak: nextStreak,
      longest_streak: longest,
      last_active_date: todayStr,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);

  if (nextStreak > 0 && nextStreak % 7 === 0) {
    await awardXp({ userId, source: "streak_week", labSlug: "shared" });
  }
}

export type UserLevelSnapshot = {
  total_xp: number;
  /** Canonical level number from DB (0–100). */
  level: number;
  /** Rank label from configurable catalog (shown in UI). */
  rank: string;
  current_streak: number;
  longest_streak: number;
  pct_to_next: number;
  remaining_to_next: number;
  /** Next tier title once current bracket is cleared. */
  next_rank: string | null;
};

export async function getOverallUserLevel(
  userId: string,
): Promise<UserLevelSnapshot> {
  const admin = createServiceRoleClient();
  const [{ data: lvl }, { data: streak }] = await Promise.all([
    admin
      .from("user_level")
      .select("total_xp, level, rank")
      .eq("user_id", userId)
      .maybeSingle(),
    admin
      .from("streak_tracking")
      .select("current_streak, longest_streak")
      .eq("user_id", userId)
      .maybeSingle(),
  ]);
  const totalXp = lvl?.total_xp ?? 0;
  const xpProg = await xpProgressForTotalXp(totalXp);

  const rows = await loadXpLevelConfig();
  const inferred = rows.length ? resolveCurrentXpLevel(totalXp, rows) : null;

  return {
    total_xp: totalXp,
    level:
      typeof lvl?.level === "number" ? lvl.level : inferred?.level ?? 0,
    rank:
      typeof lvl?.rank === "string" && lvl.rank.length ?
        lvl.rank
      : xpProg.current_rank_title,
    current_streak: streak?.current_streak ?? 0,
    longest_streak: streak?.longest_streak ?? 0,
    pct_to_next: xpProg.pct,
    remaining_to_next: xpProg.remaining,
    next_rank: xpProg.next_rank_title,
  };
}

/** @deprecated Prefer {@link getOverallUserLevel}; same behavior. */
export const getUserLevel = getOverallUserLevel;

/** Per-lab XP snapshot (strategy / pl / …). */
export async function getLabUserLevel(
  userId: string,
  labSlug: ContentLabSlug | "shared",
): Promise<UserLevelSnapshot> {
  const admin = createServiceRoleClient();
  const [{ data: lvl }, { data: streak }] = await Promise.all([
    admin
      .from("user_lab_level")
      .select("total_xp, level, rank")
      .eq("user_id", userId)
      .eq("lab_slug", labSlug)
      .maybeSingle(),
    admin
      .from("streak_tracking")
      .select("current_streak, longest_streak")
      .eq("user_id", userId)
      .maybeSingle(),
  ]);
  const totalXp = lvl?.total_xp ?? 0;
  const xpProg = await xpProgressForTotalXp(totalXp);

  const rows = await loadXpLevelConfig();
  const inferred = rows.length ? resolveCurrentXpLevel(totalXp, rows) : null;

  return {
    total_xp: totalXp,
    level:
      typeof lvl?.level === "number" ? lvl.level : inferred?.level ?? 0,
    rank:
      typeof lvl?.rank === "string" && lvl.rank.length ?
        lvl.rank
      : xpProg.current_rank_title,
    current_streak: streak?.current_streak ?? 0,
    longest_streak: streak?.longest_streak ?? 0,
    pct_to_next: xpProg.pct,
    remaining_to_next: xpProg.remaining,
    next_rank: xpProg.next_rank_title,
  };
}
