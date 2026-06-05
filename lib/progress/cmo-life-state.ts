export type CmoLifeMilestoneKind = "lesson" | "custom";

export type CmoLifeProgressSource = "lesson_auto" | "user_self" | "admin";

export type CmoLifeMilestoneBase = {
  id: string;
  sort_order: number;
  title: string;
  description: string | null;
  milestone_kind: CmoLifeMilestoneKind;
  lesson_id: string | null;
  custom_detail: string | null;
  reward_text: string | null;
  reward_image_url: string | null;
};

export type CmoLifeRoadmapStepVm = CmoLifeMilestoneBase & {
  lessonHref: string | null;
  trackTitle: string | null;
  moduleTitle: string | null;
  lessonTitle: string | null;
  done: boolean;
  locked: boolean;
  canSelfComplete: boolean;
  progressSource: CmoLifeProgressSource | null;
};

export function buildCmoLifeRoadmapSteps(
  milestones: CmoLifeMilestoneBase[],
  lessonCompletedLessonIds: Set<string>,
  progressByMilestoneId: Map<
    string,
    { completed_at: string | null; completion_source: CmoLifeProgressSource }
  >,
  lessonMetaByLessonId: Map<
    string,
    {
      lessonTitle: string;
      moduleId: string;
      moduleTitle: string;
      trackSlug: string;
      trackTitle: string;
      labSlug: string;
      lessonHref: string;
    }
  >,
): CmoLifeRoadmapStepVm[] {
  const sorted = [...milestones].sort((a, b) => a.sort_order - b.sort_order);
  let priorComplete = true;
  const out: CmoLifeRoadmapStepVm[] = [];

  for (const m of sorted) {
    const row = progressByMilestoneId.get(m.id);
    const lessonDone =
      m.milestone_kind === "lesson" &&
      m.lesson_id &&
      lessonCompletedLessonIds.has(m.lesson_id);
    const progressDone = Boolean(row?.completed_at);
    const done = Boolean(lessonDone || progressDone);

    const locked = !priorComplete;
    priorComplete = priorComplete && done;

    const meta = m.lesson_id ? lessonMetaByLessonId.get(m.lesson_id) : undefined;

    const canSelfComplete =
      m.milestone_kind === "custom" && !locked && !done;

    out.push({
      ...m,
      lessonHref: meta?.lessonHref ?? null,
      trackTitle: meta?.trackTitle ?? null,
      moduleTitle: meta?.moduleTitle ?? null,
      lessonTitle: meta?.lessonTitle ?? null,
      done,
      locked,
      canSelfComplete,
      progressSource: row ? row.completion_source : null,
    });
  }

  return out;
}
