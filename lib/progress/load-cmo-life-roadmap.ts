import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { labContentBasePath } from "@/lib/strategy/lab-routes";
import type { ContentLabSlug } from "@/lib/strategy/lab-slug";

import {
  buildCmoLifeRoadmapSteps,
  type CmoLifeMilestoneBase,
  type CmoLifeProgressSource,
  type CmoLifeRoadmapStepVm,
} from "./cmo-life-state";

type LessonJoinRow = {
  id: string;
  title: string;
  strategy_modules: {
    id: string;
    title: string;
    strategy_tracks: {
      slug: string;
      lab_slug: string;
      title: string;
    };
  };
};

function isContentLabSlug(v: string): v is ContentLabSlug {
  return (
    v === "strategy" || v === "pl" || v === "lifestyle" || v === "career"
  );
}

export async function loadCmoLifeRoadmapForUser(
  supabase: SupabaseClient,
  userId: string,
): Promise<CmoLifeRoadmapStepVm[]> {
  const { data: milestoneRows, error: msError } = await supabase
    .from("cmo_life_milestones")
    .select(
      "id, sort_order, title, description, milestone_kind, lesson_id, custom_detail, reward_text, reward_image_url",
    )
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (msError || !milestoneRows?.length) return [];

  const milestones = milestoneRows as CmoLifeMilestoneBase[];
  const lessonIds = [
    ...new Set(
      milestones
        .map((m) => m.lesson_id)
        .filter((id): id is string => typeof id === "string"),
    ),
  ];

  const lessonMetaByLessonId = new Map<
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
  >();

  if (lessonIds.length > 0) {
    const { data: lessonRows } = await supabase
      .from("strategy_lessons")
      .select(
        `
        id,
        title,
        strategy_modules!inner (
          id,
          title,
          strategy_tracks!inner ( slug, lab_slug, title )
        )
      `,
      )
      .in("id", lessonIds);

    for (const raw of (lessonRows ?? []) as unknown as LessonJoinRow[]) {
      const mod = raw.strategy_modules;
      const tr = mod?.strategy_tracks;
      const labRaw = tr?.lab_slug ?? "strategy";
      const lab = isContentLabSlug(labRaw) ? labRaw : "strategy";
      const base = labContentBasePath(lab);
      const href = `${base}/${tr.slug}/${mod.id}/${raw.id}`;
      lessonMetaByLessonId.set(raw.id, {
        lessonTitle: raw.title,
        moduleId: mod.id,
        moduleTitle: mod.title,
        trackSlug: tr.slug,
        trackTitle: tr.title,
        labSlug: lab,
        lessonHref: href,
      });
    }
  }

  const lessonCompletedLessonIds = new Set<string>();
  if (lessonIds.length > 0) {
    const { data: lpRows } = await supabase
      .from("lesson_progress")
      .select("lesson_id, status")
      .eq("user_id", userId)
      .eq("status", "completed")
      .in("lesson_id", lessonIds);
    for (const row of lpRows ?? []) {
      if (row.lesson_id) lessonCompletedLessonIds.add(row.lesson_id);
    }
  }

  const { data: progRows } = await supabase
    .from("user_cmo_life_milestone_progress")
    .select("milestone_id, completed_at, completion_source")
    .eq("user_id", userId);

  const progressByMilestoneId = new Map<
    string,
    { completed_at: string | null; completion_source: CmoLifeProgressSource }
  >();
  for (const row of progRows ?? []) {
    const src = row.completion_source;
    if (
      src !== "lesson_auto" &&
      src !== "user_self" &&
      src !== "admin"
    )
      continue;
    progressByMilestoneId.set(row.milestone_id, {
      completed_at: row.completed_at,
      completion_source: src,
    });
  }

  return buildCmoLifeRoadmapSteps(
    milestones,
    lessonCompletedLessonIds,
    progressByMilestoneId,
    lessonMetaByLessonId,
  );
}
