import "server-only";

import type { createClient } from "@/lib/supabase/server";

type SB = Awaited<ReturnType<typeof createClient>>;

/** GitHub-style grid length (12 weeks × 7 days). */
export const DISCIPLINE_HEATMAP_DAYS = 84;

/** Local calendar YYYY-MM-DD in the server's local TZ (matches existing Progress grid). */
export function localCalendarYmd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Oldest → newest, length {@link DISCIPLINE_HEATMAP_DAYS}. */
export function disciplineHeatmapDates(): string[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const keys: string[] = [];
  for (let i = DISCIPLINE_HEATMAP_DAYS - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    keys.push(localCalendarYmd(d));
  }
  return keys;
}

function intensityFromSignals(xpSum: number, hadNonXpActivity: boolean): number {
  const effective = xpSum > 0 ? xpSum : hadNonXpActivity ? 28 : 0;
  if (effective <= 0) return 0;
  if (effective < 50) return 1;
  if (effective < 150) return 2;
  return 3;
}

export type DisciplineCell = {
  date: string;
  intensity: number;
  xpSum: number;
  hadFallbackActivity: boolean;
};

/**
 * Builds 12-week activity cells from XP totals per day plus fallback signals when no XP logged
 * (reflections, completed tasks, lesson visits, finished module books).
 */
export async function computeDisciplineHeatmap(
  supabase: SB,
  userId: string,
): Promise<DisciplineCell[]> {
  const ymOrder = disciplineHeatmapDates();
  if (!ymOrder.length) return [];

  const oldest = ymOrder[0]!;
  const [oy, om, od] = oldest.split("-").map(Number);
  const padStart = new Date(oy, om - 1, od, 0, 0, 0, 0);
  padStart.setDate(padStart.getDate() - 1);
  const rangeStartIso = padStart.toISOString();

  const [
    { data: xpRows },
    { data: reflRows },
    { data: tasksRows },
    { data: lessonRows },
    { data: bookRows },
  ] = await Promise.all([
    supabase
      .from("xp_log")
      .select("xp_delta, created_at")
      .eq("user_id", userId)
      .gte("created_at", rangeStartIso),
    supabase
      .from("reflections")
      .select("created_at")
      .eq("user_id", userId)
      .gte("created_at", rangeStartIso),
    supabase
      .from("tasks")
      .select("completed_at")
      .eq("user_id", userId)
      .not("completed_at", "is", null)
      .gte("completed_at", rangeStartIso),
    supabase
      .from("lesson_progress")
      .select("last_seen_at")
      .eq("user_id", userId)
      .gte("last_seen_at", rangeStartIso),
    supabase
      .from("user_module_book_read_completion")
      .select("completed_at")
      .eq("user_id", userId)
      .gte("completed_at", rangeStartIso),
  ]);

  const xpByDay = new Map<string, number>();
  for (const r of xpRows ?? []) {
    const row = r as { xp_delta: number; created_at: string };
    const ymd = localCalendarYmd(new Date(row.created_at));
    xpByDay.set(ymd, (xpByDay.get(ymd) ?? 0) + (row.xp_delta ?? 0));
  }

  const fallbackDays = new Set<string>();

  for (const raw of reflRows ?? []) {
    const ts = (raw as { created_at: string }).created_at;
    if (!ts) continue;
    fallbackDays.add(localCalendarYmd(new Date(ts)));
  }

  for (const raw of tasksRows ?? []) {
    const ts = (raw as { completed_at: string | null }).completed_at;
    if (!ts) continue;
    fallbackDays.add(localCalendarYmd(new Date(ts)));
  }

  for (const raw of lessonRows ?? []) {
    const ts = (raw as { last_seen_at: string }).last_seen_at;
    if (!ts) continue;
    fallbackDays.add(localCalendarYmd(new Date(ts)));
  }

  for (const raw of bookRows ?? []) {
    const ts = (raw as { completed_at: string }).completed_at;
    if (!ts) continue;
    fallbackDays.add(localCalendarYmd(new Date(ts)));
  }

  return ymOrder.map((date) => {
    const xpSum = xpByDay.get(date) ?? 0;
    const hadFallbackActivity = xpSum === 0 && fallbackDays.has(date);
    const intensity = intensityFromSignals(xpSum, hadFallbackActivity);
    return {
      date,
      intensity,
      xpSum,
      hadFallbackActivity,
    };
  });
}
