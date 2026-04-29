import "server-only";
import { generateText } from "ai";
import { openaiProvider, CHAT_MODEL } from "@/lib/openai";
import { STRATEGY_PROFESSOR_TEACHING_SYSTEM } from "@/lib/prompts";
import { retrieveContext, renderRetrievedContext } from "@/lib/memory";
import { createServiceRoleClient } from "@/lib/supabase/server";

type LessonRow = {
  id: string;
  title: string;
  learning_objective: string | null;
  key_points: unknown;
  module_id: string;
};

function keyPointsArray(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.map(String);
  return [];
}

const FALLBACK = (lesson: LessonRow) => `# ${lesson.title}

The Professor is offline (no \`OPENAI_API_KEY\` set). When the key is configured, this lesson will be generated personally for you, using these key points as the spine:

${keyPointsArray(lesson.key_points)
  .map((k) => `- ${k}`)
  .join("\n")}

**What would you do here?** Pick one of the key points above and apply it to a real company you know.`;

export type TheoryResult = {
  body_md: string;
  generated_at: string;
};

/** Returns the cached lesson body for this user, generating it if missing. */
export async function getOrGenerateTheory(
  userId: string,
  lessonId: string,
): Promise<TheoryResult> {
  const admin = createServiceRoleClient();

  const { data: cached } = await admin
    .from("lesson_theory_cache")
    .select("body_md, generated_at")
    .eq("user_id", userId)
    .eq("lesson_id", lessonId)
    .maybeSingle();

  if (cached?.body_md) {
    return { body_md: cached.body_md, generated_at: cached.generated_at };
  }

  const { data: lesson } = await admin
    .from("strategy_lessons")
    .select("id, title, learning_objective, key_points, module_id")
    .eq("id", lessonId)
    .maybeSingle<LessonRow>();

  if (!lesson) {
    return {
      body_md: "# Lesson not found",
      generated_at: new Date().toISOString(),
    };
  }

  if (!process.env.OPENAI_API_KEY) {
    const body_md = FALLBACK(lesson);
    await admin.from("lesson_theory_cache").upsert(
      {
        user_id: userId,
        lesson_id: lessonId,
        body_md,
        generated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,lesson_id" },
    );
    return { body_md, generated_at: new Date().toISOString() };
  }

  const points = keyPointsArray(lesson.key_points);
  const ctx = await retrieveContext(
    userId,
    `${lesson.title}. ${lesson.learning_objective ?? ""}`,
    6,
  );

  const userPrompt = `LESSON OUTLINE
Title: ${lesson.title}
Learning objective: ${lesson.learning_objective ?? "(not specified)"}
Key points (use ALL of these as the spine of the lesson):
${points.map((p, i) => `${i + 1}. ${p}`).join("\n")}

USER CONTEXT (use AT MOST ONE of these naturally; never invent):
${renderRetrievedContext(ctx)}

Now produce the lesson body in Markdown, following the required structure. Remember: end on exactly one "What would you do here?" question.`;

  let body_md = "";
  try {
    const { text } = await generateText({
      model: openaiProvider(CHAT_MODEL),
      system: STRATEGY_PROFESSOR_TEACHING_SYSTEM,
      prompt: userPrompt,
      temperature: 0.55,
      maxTokens: 1400,
    });
    body_md = text.trim();
  } catch (e) {
    console.error("getOrGenerateTheory failed", e);
    body_md = FALLBACK(lesson);
  }

  const now = new Date().toISOString();
  await admin.from("lesson_theory_cache").upsert(
    {
      user_id: userId,
      lesson_id: lessonId,
      body_md,
      generated_at: now,
    },
    { onConflict: "user_id,lesson_id" },
  );

  return { body_md, generated_at: now };
}

export async function clearTheoryCache(opts: {
  userId?: string;
  lessonId?: string;
}) {
  const admin = createServiceRoleClient();
  let q = admin.from("lesson_theory_cache").delete();
  if (opts.userId) q = q.eq("user_id", opts.userId);
  if (opts.lessonId) q = q.eq("lesson_id", opts.lessonId);
  if (!opts.userId && !opts.lessonId) return;
  await q;
}
