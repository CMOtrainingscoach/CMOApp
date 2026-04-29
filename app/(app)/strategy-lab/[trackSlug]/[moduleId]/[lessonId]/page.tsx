import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Clock, Sparkles } from "lucide-react";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { Topbar } from "@/components/shell/topbar";
import { getOrGenerateTheory } from "@/lib/strategy/theory";
import { getOrGenerateMinigame } from "@/lib/strategy/minigame";
import { LessonRunner } from "./lesson-runner";
import { LessonObjectivesProfessorRow } from "@/components/strategy/lesson-objectives-professor-row";
import { LearningObjectivePanel } from "@/components/strategy/learning-objective-panel";
import { getProfessorConfig } from "@/lib/professor-config.server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export default async function LessonPage({
  params,
}: {
  params: Promise<{ trackSlug: string; moduleId: string; lessonId: string }>;
}) {
  const { trackSlug, moduleId, lessonId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createServiceRoleClient();

  const { data: track } = await admin
    .from("strategy_tracks")
    .select("id, slug, title")
    .eq("slug", trackSlug)
    .maybeSingle();
  if (!track) notFound();

  const { data: module } = await admin
    .from("strategy_modules")
    .select("id, ord, title, summary, track_id")
    .eq("id", moduleId)
    .eq("track_id", track.id)
    .maybeSingle();
  if (!module) notFound();

  const { data: unlockedRaw } = await admin.rpc("module_is_unlocked", {
    p_user_id: user.id,
    p_module_id: module.id,
  });
  const unlocked = Boolean(unlockedRaw);
  if (!unlocked) {
    redirect(`/strategy-lab/${trackSlug}`);
  }

  const { data: lesson } = await admin
    .from("strategy_lessons")
    .select(
      "id, ord, title, learning_objective, estimated_minutes, xp_reward, module_id, hero_image_url",
    )
    .eq("id", lessonId)
    .eq("module_id", module.id)
    .maybeSingle();
  if (!lesson) notFound();

  const [{ data: profile }, theory, minigame, { data: progressRow }, professorCfg] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("display_name, avatar_url")
        .eq("id", user.id)
        .maybeSingle(),
      getOrGenerateTheory(user.id, lesson.id),
      getOrGenerateMinigame(lesson.id),
      admin
        .from("lesson_progress")
        .select("status, attempts, best_score")
        .eq("user_id", user.id)
        .eq("lesson_id", lesson.id)
        .maybeSingle(),
      getProfessorConfig(),
    ]);

  // Touch progress as in_progress so the user appears on this lesson
  await admin.from("lesson_progress").upsert(
    {
      user_id: user.id,
      lesson_id: lesson.id,
      status: progressRow?.status ?? "in_progress",
      best_score: progressRow?.best_score ?? 0,
      attempts: progressRow?.attempts ?? 0,
      last_seen_at: new Date().toISOString(),
    },
    { onConflict: "user_id,lesson_id" },
  );

  // Determine the next lesson within this module (for nav after completion)
  const { data: siblings } = await admin
    .from("strategy_lessons")
    .select("id, ord")
    .eq("module_id", module.id)
    .order("ord", { ascending: true });
  const nextLesson = siblings?.find((s) => (s.ord as number) > (lesson.ord as number)) ?? null;
  const lessonTotal = siblings?.length ?? 0;

  const displayName = profile?.display_name ?? "Operator";

  const learningObjectiveSlot = lesson.learning_objective ?
      <LearningObjectivePanel
        text={lesson.learning_objective as string}
        className="mt-0 max-w-none"
      />
    : null;

  const objectivesProfessorRowHeader = (
    <LessonObjectivesProfessorRow
      lessonId={lesson.id as string}
      learningObjectiveSlot={learningObjectiveSlot}
      professorName={professorCfg.professor_name}
      professorAvatarUrl={professorCfg.professor_avatar_url}
    />
  );

  const objectivesProfessorRowHero = (
    <LessonObjectivesProfessorRow
      className="mt-0"
      lessonId={lesson.id as string}
      learningObjectiveSlot={learningObjectiveSlot}
      professorName={professorCfg.professor_name}
      professorAvatarUrl={professorCfg.professor_avatar_url}
    />
  );

  return (
    <>
      <Topbar
        displayName={displayName}
        avatarUrl={profile?.avatar_url}
        subtitle={`${track.title} · ${module.title}`}
      />
      <div className="px-6 lg:px-8 pb-12">
        <Link
          href={`/strategy-lab/${trackSlug}/${module.id}`}
          className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-text-muted hover:text-gold-300 transition-colors"
        >
          <ArrowLeft className="size-3.5" /> Back to module
        </Link>

        <header
          className={
            (lesson.hero_image_url as string | null) ?
              "mt-6 mb-8 max-w-3xl"
            : "mt-6 mb-8 max-w-6xl xl:max-w-[1200px]"
          }
        >
          <div className="flex flex-wrap items-center gap-3">
            <span className="badge-gold">
              Lesson {(lesson.ord as number) + 1}
              {lessonTotal > 0 ? ` of ${lessonTotal}` : ""}
            </span>
            <span className="badge-muted inline-flex items-center gap-1">
              <Clock className="size-3" /> {lesson.estimated_minutes ?? 8} min
            </span>
            <span className="badge-muted inline-flex items-center gap-1">
              <Sparkles className="size-3" /> +{lesson.xp_reward} XP
            </span>
          </div>
          {(lesson.hero_image_url as string | null) ? null : (
            <>
              <h1 className="mt-3 font-display text-4xl tracking-tight gold-text">
                {lesson.title}
              </h1>
              {objectivesProfessorRowHeader}
            </>
          )}
        </header>

        <LessonRunner
          lessonId={lesson.id as string}
          lessonTitle={lesson.title as string}
          moduleTitle={module.title as string}
          heroImageUrl={(lesson.hero_image_url as string | null) ?? null}
          learningObjectiveBelowHero={
            (lesson.hero_image_url as string | null) ?
              objectivesProfessorRowHero
            : null
          }
          trackSlug={trackSlug}
          moduleId={module.id as string}
          nextLessonId={(nextLesson?.id as string) ?? null}
          theoryMd={theory.body_md}
          questions={minigame.questions}
        />
      </div>
    </>
  );
}
