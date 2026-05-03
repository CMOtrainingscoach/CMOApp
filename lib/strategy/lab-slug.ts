import "server-only";
import { createServiceRoleClient } from "@/lib/supabase/server";

export type ContentLabSlug = "strategy" | "pl" | "lifestyle" | "career";

export type XpLabSlug = ContentLabSlug | "shared";

/** Which curriculum lab the row belongs to; defaults to Strategy if join fails */
export async function getContentLabSlugForLessonId(
  lessonId: string,
): Promise<ContentLabSlug> {
  const admin = createServiceRoleClient();
  const { data } = await admin
    .from("strategy_lessons")
    .select(
      `
      strategy_modules (
        strategy_tracks ( lab_slug )
      )
    `,
    )
    .eq("id", lessonId)
    .maybeSingle();

  type Nested = {
    strategy_modules: {
      strategy_tracks: { lab_slug: string } | null;
    } | null;
  };

  const mod = data as Nested | null;
  const slug = mod?.strategy_modules?.strategy_tracks?.lab_slug;
  if (slug === "pl" || slug === "strategy" || slug === "lifestyle" || slug === "career") {
    return slug;
  }
  return "strategy";
}

export async function getContentLabSlugForQuestionId(
  questionId: string,
): Promise<ContentLabSlug> {
  const admin = createServiceRoleClient();
  const { data } = await admin
    .from("lesson_questions")
    .select("lesson_id")
    .eq("id", questionId)
    .maybeSingle();
  if (!data?.lesson_id) return "strategy";
  return getContentLabSlugForLessonId(data.lesson_id as string);
}

export async function getContentLabSlugForModuleId(
  moduleId: string,
): Promise<ContentLabSlug> {
  const admin = createServiceRoleClient();
  const { data } = await admin
    .from("strategy_modules")
    .select(`strategy_tracks ( lab_slug )`)
    .eq("id", moduleId)
    .maybeSingle();

  type Nested = { strategy_tracks: { lab_slug: string } | null };
  const slug = (data as Nested | null)?.strategy_tracks?.lab_slug;
  if (slug === "pl" || slug === "strategy" || slug === "lifestyle" || slug === "career") {
    return slug;
  }
  return "strategy";
}
