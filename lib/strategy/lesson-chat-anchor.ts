import "server-only";
import { createServiceRoleClient } from "@/lib/supabase/server";

function keyPointsArray(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.map(String).filter(Boolean);
}

const THEORY_MAX = 3_600;

/** Grounding excerpt for Strategy Lab professor chat (`/api/chat` with `lessonId`). */
export async function loadStrategyLessonAnchor(
  lessonId: string,
  userId: string,
): Promise<{ anchor: string; conversationTitleBase: string } | null> {
  const admin = createServiceRoleClient();

  const { data: lesson } = await admin
    .from("strategy_lessons")
    .select("id, title, learning_objective, key_points, module_id")
    .eq("id", lessonId)
    .maybeSingle();
  if (!lesson) return null;

  const { data: modUnlocked } = await admin.rpc("module_is_unlocked", {
    p_user_id: userId,
    p_module_id: lesson.module_id as string,
  });
  if (!Boolean(modUnlocked)) return null;

  const { data: mod } = await admin
    .from("strategy_modules")
    .select("title, track_id")
    .eq("id", lesson.module_id as string)
    .maybeSingle();
  if (!mod) return null;

  const { data: track } = await admin
    .from("strategy_tracks")
    .select("title")
    .eq("id", mod.track_id as string)
    .maybeSingle();

  const trackTitle = (track?.title as string) ?? "Strategy Lab";
  const moduleTitle = (mod.title as string) ?? "Module";
  const points = keyPointsArray(lesson.key_points);

  const { data: theoryRow } = await admin
    .from("lesson_theory_cache")
    .select("body_md")
    .eq("user_id", userId)
    .eq("lesson_id", lessonId)
    .maybeSingle();

  const md = theoryRow?.body_md as string | undefined;
  const theoryExcerpt = md?.slice(0, THEORY_MAX);
  const theoryNote = theoryExcerpt
    ? `\n\n--- Lesson theory (excerpt for grounding) ---\n${theoryExcerpt}${
        md && md.length > THEORY_MAX ? "\n\n[Excerpt truncated for context length.]" : ""
      }`
    : "\n\n(Theory cache not loaded yet — ground answers in the objective and key points.)";

  const anchor = `STRATEGY LAB — CURRENT LESSON (ground the student here; do not invent other lessons' content)
Track: ${trackTitle}
Module: ${moduleTitle}
Lesson: ${lesson.title}

Learning objective / outcomes:
${String(lesson.learning_objective ?? "").trim() || "(not specified)"}

Key points:
${points.length ? points.map((p, i) => `${i + 1}. ${p}`).join("\n") : "(none listed)"}
${theoryNote}

Instructions: You are helping this student go deeper on THIS lesson only. Tie answers to the objective, key points, and theory above when relevant. If they ask something broad, frame it through this lesson. Keep answers executive and concrete; offer one follow-up angle when useful.`;

  return {
    anchor,
    conversationTitleBase: `Strategy Lab · ${lesson.title as string}`.slice(0, 120),
  };
}
