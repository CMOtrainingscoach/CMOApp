import "server-only";
import { z } from "zod";
import { generateObject } from "ai";
import { openaiProvider, CHAT_MODEL } from "@/lib/openai";
import { minigameGeneratorSystemForLab } from "@/lib/prompts";
import { createServiceRoleClient } from "@/lib/supabase/server";
import type { ContentLabSlug } from "@/lib/strategy/lab-slug";

const QuestionKindEnum = z.enum([
  "multiple_choice",
  "true_false",
  "fill_step",
  "case_scenario",
]);

const McPayload = z.object({
  options: z.array(z.string().min(2).max(280)).min(2).max(6),
});
const McCorrect = z.object({ index: z.number().int().min(0).max(5) });

const TfPayload = z.object({});
const TfCorrect = z.object({ value: z.boolean() });

const FillPayload = z.object({
  steps: z
    .array(
      z.object({
        text: z.string().min(2).max(160),
        is_blank: z.boolean(),
      }),
    )
    .min(3)
    .max(8),
  options: z.array(z.string().min(2).max(160)).min(3).max(6),
});
const FillCorrect = z.object({ index: z.number().int().min(0).max(5) });

const CasePayload = z.object({});
const CaseCorrect = z.object({
  keywords: z.array(z.string().min(2).max(60)).min(2).max(8),
});

/** FillPayload must be tried before McPayload: both shapes include `options`, and Zod's object
 * schema would otherwise absorb fill_step rows and strip `steps` from the parsed output. */
const QuestionSchema = z.object({
  kind: QuestionKindEnum,
  prompt: z.string().min(8).max(700),
  payload: z.union([FillPayload, McPayload, TfPayload, CasePayload]),
  correct: z.union([McCorrect, TfCorrect, FillCorrect, CaseCorrect]),
  explanation: z.string().min(8).max(500),
});

const MinigameSchema = z.object({
  questions: z.array(QuestionSchema).min(3).max(6),
});

export type GeneratedQuestion = z.infer<typeof QuestionSchema>;

type LessonRow = {
  id: string;
  title: string;
  learning_objective: string | null;
  key_points: unknown;
};

function keyPointsArray(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.map(String);
  return [];
}

function fallbackMinigame(lesson: LessonRow): GeneratedQuestion[] {
  const points = keyPointsArray(lesson.key_points);
  const head = points[0] ?? lesson.title;
  return [
    {
      kind: "true_false",
      prompt: `True or false: ${head}`,
      payload: {},
      correct: { value: true },
      explanation:
        "This claim is drawn directly from the lesson's key points.",
    },
    {
      kind: "multiple_choice",
      prompt: `Which is closest to the lesson's central idea?`,
      payload: { options: points.slice(0, 4) },
      correct: { index: 0 },
      explanation: "The first key point is the spine of this lesson.",
    },
  ];
}

export type MinigameResult = {
  minigame_id: string;
  questions: Array<{
    id: string;
    ord: number;
    kind: GeneratedQuestion["kind"];
    prompt: string;
    payload: GeneratedQuestion["payload"];
    explanation: string;
    xp: number;
  }>;
};

/** Ensures a minigame exists for a lesson (global). Returns sanitized questions (without correct answers). */
export async function getOrGenerateMinigame(
  lessonId: string,
  lab: ContentLabSlug = "strategy",
): Promise<MinigameResult> {
  const admin = createServiceRoleClient();

  // Resolve or create the minigame row
  let { data: mg } = await admin
    .from("lesson_minigames")
    .select("id, status")
    .eq("lesson_id", lessonId)
    .maybeSingle();

  if (!mg) {
    const { data: created } = await admin
      .from("lesson_minigames")
      .insert({ lesson_id: lessonId, status: "pending" })
      .select("id, status")
      .single();
    mg = created;
  }
  if (!mg) throw new Error("could not create lesson_minigames row");

  // If ready, return existing questions
  if (mg.status === "ready") {
    const { data: rows } = await admin
      .from("lesson_questions")
      .select("id, ord, kind, prompt, payload, explanation, xp")
      .eq("lesson_id", lessonId)
      .order("ord", { ascending: true });
    return {
      minigame_id: mg.id,
      questions: (rows ?? []).map((r) => ({
        id: r.id as string,
        ord: r.ord as number,
        kind: r.kind as GeneratedQuestion["kind"],
        prompt: r.prompt as string,
        payload: r.payload as GeneratedQuestion["payload"],
        explanation: r.explanation as string,
        xp: r.xp as number,
      })),
    };
  }

  // Generate
  const { data: lesson } = await admin
    .from("strategy_lessons")
    .select("id, title, learning_objective, key_points")
    .eq("id", lessonId)
    .maybeSingle<LessonRow>();
  if (!lesson) throw new Error("lesson not found");

  let questions: GeneratedQuestion[];
  if (!process.env.OPENAI_API_KEY) {
    questions = fallbackMinigame(lesson);
  } else {
    try {
      const points = keyPointsArray(lesson.key_points);
      const { object } = await generateObject({
        model: openaiProvider(CHAT_MODEL),
        schema: MinigameSchema,
        system: minigameGeneratorSystemForLab(lab),
        prompt: `LESSON
Title: ${lesson.title}
Learning objective: ${lesson.learning_objective ?? "(not specified)"}
Key points:
${points.map((p, i) => `${i + 1}. ${p}`).join("\n")}

Generate 4 to 6 questions following the schema and your rubric.`,
        temperature: 0.5,
      });
      questions = object.questions;
    } catch (e) {
      console.error("getOrGenerateMinigame: AI failed, using fallback", e);
      questions = fallbackMinigame(lesson);
    }
  }

  // Persist questions
  const rows = questions.map((q, i) => ({
    lesson_id: lessonId,
    minigame_id: mg!.id,
    ord: i,
    kind: q.kind,
    prompt: q.prompt,
    payload: q.payload as unknown as object,
    correct: q.correct as unknown as object,
    explanation: q.explanation,
    xp: 5,
  }));
  await admin.from("lesson_questions").delete().eq("lesson_id", lessonId);
  await admin.from("lesson_questions").insert(rows);
  await admin
    .from("lesson_minigames")
    .update({ status: "ready", generated_at: new Date().toISOString() })
    .eq("id", mg.id);

  const { data: persisted } = await admin
    .from("lesson_questions")
    .select("id, ord, kind, prompt, payload, explanation, xp")
    .eq("lesson_id", lessonId)
    .order("ord", { ascending: true });

  return {
    minigame_id: mg.id,
    questions: (persisted ?? []).map((r) => ({
      id: r.id as string,
      ord: r.ord as number,
      kind: r.kind as GeneratedQuestion["kind"],
      prompt: r.prompt as string,
      payload: r.payload as GeneratedQuestion["payload"],
      explanation: r.explanation as string,
      xp: r.xp as number,
    })),
  };
}

export async function clearMinigame(lessonId: string) {
  const admin = createServiceRoleClient();
  await admin.from("lesson_questions").delete().eq("lesson_id", lessonId);
  await admin
    .from("lesson_minigames")
    .update({ status: "pending", generated_at: null })
    .eq("lesson_id", lessonId);
}

// =====================================================================
// Question evaluation
// =====================================================================

export type EvaluateResult = {
  correct: boolean;
  explanation: string;
  feedback?: string;
};

/** Validates a user answer against the stored correct value. */
export async function evaluateAnswer(opts: {
  questionId: string;
  answer: unknown;
}): Promise<EvaluateResult> {
  const admin = createServiceRoleClient();
  const { data: q } = await admin
    .from("lesson_questions")
    .select("kind, correct, explanation, prompt, payload")
    .eq("id", opts.questionId)
    .maybeSingle();
  if (!q) return { correct: false, explanation: "Question not found." };

  const kind = q.kind as GeneratedQuestion["kind"];
  const correct = q.correct as Record<string, unknown>;
  const explanation = (q.explanation as string) ?? "";

  if (kind === "multiple_choice" || kind === "fill_step") {
    const expected = Number(correct?.index ?? -1);
    const given = Number(
      (opts.answer as { index?: number } | null)?.index ?? -1,
    );
    return { correct: expected === given && expected >= 0, explanation };
  }
  if (kind === "true_false") {
    const expected = Boolean(correct?.value);
    const given = Boolean((opts.answer as { value?: boolean } | null)?.value);
    return { correct: expected === given, explanation };
  }
  if (kind === "case_scenario") {
    const text = String((opts.answer as { text?: string } | null)?.text ?? "")
      .toLowerCase()
      .trim();
    if (text.length < 20) {
      return {
        correct: false,
        explanation: "Answer too short. Aim for 2-3 specific sentences.",
      };
    }
    const keywords = (correct?.keywords as string[] | undefined) ?? [];
    if (keywords.length === 0) {
      return { correct: true, explanation };
    }
    const hits = keywords.filter((k) =>
      text.includes(String(k).toLowerCase()),
    ).length;
    const ratio = hits / keywords.length;
    const passed = ratio >= 0.5;
    return {
      correct: passed,
      explanation,
      feedback: passed
        ? "Hits the core concepts."
        : `Strengthen by addressing: ${keywords.join(", ")}.`,
    };
  }
  return { correct: false, explanation };
}
