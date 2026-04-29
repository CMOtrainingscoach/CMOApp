import "server-only";
import { createServiceRoleClient } from "@/lib/supabase/server";

export type XpSource =
  | "lesson_complete"
  | "lesson_question_correct"
  | "minigame_perfect"
  | "assignment_pass"
  | "module_complete"
  | "streak_week";

export const XP_AMOUNTS: Record<XpSource, number> = {
  lesson_complete: 50,
  lesson_question_correct: 5,
  minigame_perfect: 25,
  assignment_pass: 300,
  module_complete: 150,
  streak_week: 100,
};

export type Rank =
  | "Initiate"
  | "Strategist"
  | "Operator"
  | "Director"
  | "Growth Architect"
  | "CMO Candidate"
  | "Executive Operator"
  | "CMO Ascendant";

export type RankInfo = {
  name: Rank;
  threshold: number;
  next?: Rank;
  nextThreshold?: number;
};

export const RANKS: RankInfo[] = [
  { name: "Initiate",           threshold: 0,     next: "Strategist",         nextThreshold: 500 },
  { name: "Strategist",         threshold: 500,   next: "Operator",           nextThreshold: 1500 },
  { name: "Operator",           threshold: 1500,  next: "Director",           nextThreshold: 3500 },
  { name: "Director",           threshold: 3500,  next: "Growth Architect",   nextThreshold: 6500 },
  { name: "Growth Architect",   threshold: 6500,  next: "CMO Candidate",      nextThreshold: 10500 },
  { name: "CMO Candidate",      threshold: 10500, next: "Executive Operator", nextThreshold: 16000 },
  { name: "Executive Operator", threshold: 16000, next: "CMO Ascendant",      nextThreshold: 25000 },
  { name: "CMO Ascendant",      threshold: 25000 },
];

export function rankFor(totalXp: number): RankInfo {
  let current = RANKS[0];
  for (const r of RANKS) {
    if (totalXp >= r.threshold) current = r;
    else break;
  }
  return current;
}

export function levelFor(totalXp: number): number {
  return Math.max(1, Math.floor(totalXp / 100) + 1);
}

export function progressToNextRank(totalXp: number): {
  rank: RankInfo;
  pct: number;
  remaining: number;
} {
  const rank = rankFor(totalXp);
  if (!rank.nextThreshold) {
    return { rank, pct: 100, remaining: 0 };
  }
  const span = rank.nextThreshold - rank.threshold;
  const into = totalXp - rank.threshold;
  return {
    rank,
    pct: Math.max(0, Math.min(100, Math.round((into / span) * 100))),
    remaining: Math.max(0, rank.nextThreshold - totalXp),
  };
}

export type AwardOpts = {
  userId: string;
  source: XpSource | string;
  amount?: number;
  refId?: string | null;
};

/** Logs an XP event. The DB trigger recomputes user_level (total/level/rank). */
export async function awardXp(opts: AwardOpts) {
  const amount = opts.amount ?? XP_AMOUNTS[opts.source as XpSource];
  if (!amount || amount === 0) return;
  const admin = createServiceRoleClient();
  await admin.from("xp_log").insert({
    user_id: opts.userId,
    source: opts.source,
    source_ref_id: opts.refId ?? null,
    xp_delta: amount,
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
    await awardXp({ userId, source: "streak_week" });
  }
}

export type UserLevelSnapshot = {
  total_xp: number;
  level: number;
  rank: Rank;
  current_streak: number;
  longest_streak: number;
  pct_to_next: number;
  remaining_to_next: number;
  next_rank: Rank | null;
};

export async function getUserLevel(userId: string): Promise<UserLevelSnapshot> {
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
  const prog = progressToNextRank(totalXp);
  return {
    total_xp: totalXp,
    level: lvl?.level ?? levelFor(totalXp),
    rank: (lvl?.rank as Rank) ?? "Initiate",
    current_streak: streak?.current_streak ?? 0,
    longest_streak: streak?.longest_streak ?? 0,
    pct_to_next: prog.pct,
    remaining_to_next: prog.remaining,
    next_rank: (prog.rank.next as Rank) ?? null,
  };
}
