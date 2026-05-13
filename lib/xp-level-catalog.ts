import "server-only";

import { cache } from "react";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";

export type XpLevelRow = {
  level: number;
  rank_title: string;
  min_total_xp: number;
};

/** All tier rows sorted by level (0–100). Readable by authenticated; admin edits via service role. */
export const loadXpLevelConfig = cache(async (): Promise<XpLevelRow[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("xp_level_config")
    .select("level, rank_title, min_total_xp")
    .order("level", { ascending: true });
  if (error) {
    console.error("[xp_level_config]", error.message);
    return [];
  }
  return (data ?? []).map((r) => ({
    level: r.level as number,
    rank_title: r.rank_title as string,
    min_total_xp: r.min_total_xp as number,
  }));
});

export function resolveCurrentXpLevel(totalXp: number, rows: XpLevelRow[]): XpLevelRow {
  const t = Math.max(0, totalXp);
  if (!rows.length) {
    return { level: 0, rank_title: "Initiate", min_total_xp: 0 };
  }
  const eligible = rows.filter((r) => t >= r.min_total_xp);
  eligible.sort((a, b) => a.level - b.level);
  return eligible.length ? eligible[eligible.length - 1]! : rows[0]!;
}

export function resolveNextXpLevel(current: XpLevelRow, rows: XpLevelRow[]): XpLevelRow | null {
  const after = rows
    .filter((r) => r.level > current.level)
    .sort((a, b) => a.level - b.level);
  return after[0] ?? null;
}

export function xpProgressInCurrentBracket(
  totalXp: number,
  current: XpLevelRow,
  next: XpLevelRow | null,
): { pct: number; remaining: number } {
  if (!next) return { pct: 100, remaining: 0 };
  const span = next.min_total_xp - current.min_total_xp;
  if (span <= 0) return { pct: 100, remaining: 0 };
  const into = Math.max(0, totalXp - current.min_total_xp);
  return {
    pct: Math.max(0, Math.min(100, Math.round((into / span) * 100))),
    remaining: Math.max(0, next.min_total_xp - totalXp),
  };
}

/** After admin edits XP thresholds — re-sync everyone’s stored rank/level. */
export async function refreshXpLevelSnapshots(): Promise<{ error?: string }> {
  try {
    const admin = createServiceRoleClient();
    const { error } = await admin.rpc("refresh_xp_level_snapshots");
    if (error) return { error: error.message };
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "refresh failed" };
  }
}
