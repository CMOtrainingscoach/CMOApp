import { NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { getContentLabSlugForLessonId } from "@/lib/strategy/lab-slug";
import { awardXp, bumpStreak, XP_AMOUNTS } from "@/lib/strategy/xp";

export const maxDuration = 30;

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id: lessonId } = await ctx.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as { score?: number };
  const score = Math.max(0, Math.min(100, Math.round(body.score ?? 0)));

  const admin = createServiceRoleClient();

  // Determine lesson XP from the lesson row
  const { data: lesson } = await admin
    .from("strategy_lessons")
    .select("id, xp_reward, module_id")
    .eq("id", lessonId)
    .maybeSingle();
  if (!lesson) {
    return NextResponse.json({ error: "lesson_not_found" }, { status: 404 });
  }

  const { data: existing } = await admin
    .from("lesson_progress")
    .select("status, attempts, best_score")
    .eq("user_id", user.id)
    .eq("lesson_id", lessonId)
    .maybeSingle();

  const wasCompleted = existing?.status === "completed";
  const nextBest = Math.max(existing?.best_score ?? 0, score);

  await admin.from("lesson_progress").upsert(
    {
      user_id: user.id,
      lesson_id: lessonId,
      status: "completed",
      best_score: nextBest,
      attempts: (existing?.attempts ?? 0) + 1,
      completed_at: new Date().toISOString(),
      last_seen_at: new Date().toISOString(),
    },
    { onConflict: "user_id,lesson_id" },
  );

  const labSlug = await getContentLabSlugForLessonId(lessonId);

  // Only award lesson XP the first time it's completed
  let xp_awarded = 0;
  if (!wasCompleted) {
    const lessonXp = (lesson.xp_reward as number) ?? XP_AMOUNTS.lesson_complete;
    await awardXp({
      userId: user.id,
      source: "lesson_complete",
      amount: lessonXp,
      refId: lessonId,
      labSlug,
    });
    xp_awarded += lessonXp;
    if (score >= 100) {
      await awardXp({
        userId: user.id,
        source: "minigame_perfect",
        amount: XP_AMOUNTS.minigame_perfect,
        refId: lessonId,
        labSlug,
      });
      xp_awarded += XP_AMOUNTS.minigame_perfect;
    }
  }

  await bumpStreak(user.id);

  // Find the next lesson in this module (or the module's assignment)
  const { data: siblings } = await admin
    .from("strategy_lessons")
    .select("id, ord")
    .eq("module_id", lesson.module_id)
    .order("ord", { ascending: true });

  const currentOrd = siblings?.find((s) => s.id === lessonId)?.ord ?? 0;
  const nextLesson = siblings?.find((s) => (s.ord as number) > currentOrd) ?? null;
  const isLastLesson = !nextLesson;

  return NextResponse.json({
    completed: true,
    xp_awarded,
    next_lesson_id: nextLesson?.id ?? null,
    is_last_lesson: isLastLesson,
    module_id: lesson.module_id,
  });
}
