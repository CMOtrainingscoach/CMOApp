import "server-only";

import { localMidnightBoundsIso } from "@/lib/dashboard/date-bounds";
import type { createClient } from "@/lib/supabase/server";

type DashboardSupabase = Awaited<ReturnType<typeof createClient>>;

type MissionRow = {
  mission_date: string;
  reflection_prompt: string;
};

function slugOfLessonRow(row: unknown): string | undefined {
  const r = row as {
    strategy_modules?: {
      strategy_tracks?: { lab_slug?: string } | null;
    } | null;
  };
  return r.strategy_modules?.strategy_tracks?.lab_slug ?? undefined;
}

/**
 * Four pillars × 25%: study (strategy/pl/career lab lesson), lifestyle lab lesson,
 * daily_mission task, reflection matching today's prompt — all on the mission calendar day
 * (local midnight semantics aligned with todayIso).
 */
export async function computeDailyMissionProgressPercent(
  supabase: DashboardSupabase,
  userId: string,
  mission: MissionRow | null | undefined,
): Promise<number> {
  if (!mission?.mission_date) return 0;
  const { startIso, endExclusiveIso } = localMidnightBoundsIso(mission.mission_date);

  const [
    { data: completions, error: compErr },
    { data: dailyTasks },
    { data: refls },
  ] = await Promise.all([
    supabase
      .from("lesson_progress")
      .select(
        `
        status,
        completed_at,
        strategy_lessons (
          strategy_modules (
            strategy_tracks ( lab_slug )
          )
        )
      `,
      )
      .eq("user_id", userId)
      .eq("status", "completed")
      .not("completed_at", "is", null)
      .gte("completed_at", startIso)
      .lt("completed_at", endExclusiveIso),
    supabase
      .from("tasks")
      .select("status, completed_at, category")
      .eq("user_id", userId)
      .eq("category", "daily_mission")
      .not("completed_at", "is", null)
      .gte("completed_at", startIso)
      .lt("completed_at", endExclusiveIso)
      .in("status", ["completed", "reviewed"]),
    supabase
      .from("reflections")
      .select("id")
      .eq("user_id", userId)
      .eq("prompt", mission.reflection_prompt)
      .gte("created_at", startIso)
      .lt("created_at", endExclusiveIso)
      .limit(1),
  ]);

  if (compErr) {
    console.error("[computeDailyMissionProgressPercent] completions:", compErr);
  }

  let studyDone = false;
  let lifestyleDone = false;
  const rows = (completions ?? []) as { strategy_lessons?: unknown | unknown[] }[];
  for (const row of rows) {
    const sl = row.strategy_lessons;
    const lesson = Array.isArray(sl) ? sl[0] : sl;
    const lab = slugOfLessonRow(lesson);
    if (lab === "strategy" || lab === "pl" || lab === "career") studyDone = true;
    if (lab === "lifestyle") lifestyleDone = true;
  }

  const taskDone = (dailyTasks ?? []).length > 0;
  const reflectionDone = (refls ?? []).length > 0;

  let done = 0;
  if (studyDone) done += 1;
  if (taskDone) done += 1;
  if (reflectionDone) done += 1;
  if (lifestyleDone) done += 1;

  return Math.round((done / 4) * 100);
}
