import { z } from "zod";
import { generateObject } from "ai";
import { openaiProvider, CHAT_MODEL } from "./openai";
import { SCORER_SYSTEM } from "./prompts";
import { createServiceRoleClient } from "./supabase/server";
import type { SkillKey } from "@/types/database";
import { SKILL_KEYS } from "@/types/database";

const skillKeyEnum = z.enum([
  "strategic_thinking",
  "finance_pl",
  "lead_gen",
  "brand",
  "leadership",
  "exec_comm",
  "ai_marketing",
  "lifestyle",
]);

const scoreSchema = z.object({
  score: z.number().int().min(0).max(100),
  strengths: z.array(z.string().min(4).max(280)).max(3),
  gaps: z.array(z.string().min(4).max(280)).max(3),
  next_steps: z.array(z.string().min(4).max(280)).max(3),
  skill_deltas: z
    .array(
      z.object({
        skill_key: skillKeyEnum,
        delta: z.number().int().min(-10).max(10),
      }),
    )
    .max(SKILL_KEYS.length),
});

export type SubmissionEvaluation = z.infer<typeof scoreSchema>;

const FALLBACK: SubmissionEvaluation = {
  score: 60,
  strengths: ["Submission received."],
  gaps: ["Awaiting AI evaluation — set OPENAI_API_KEY to enable detailed scoring."],
  next_steps: ["Configure your OpenAI key, then resubmit for scoring."],
  skill_deltas: [],
};

export async function evaluateSubmission(opts: {
  taskTitle: string;
  taskDescription: string | null;
  taskCategory: string | null;
  submission: string;
}): Promise<SubmissionEvaluation> {
  if (!process.env.OPENAI_API_KEY) return FALLBACK;
  try {
    const { object } = await generateObject({
      model: openaiProvider(CHAT_MODEL),
      schema: scoreSchema,
      system: SCORER_SYSTEM,
      prompt: `TASK
Title: ${opts.taskTitle}
Category: ${opts.taskCategory ?? "general"}
Description: ${opts.taskDescription ?? "(none)"}

USER SUBMISSION:
${opts.submission.slice(0, 8000)}

Evaluate honestly per your rubric.`,
      temperature: 0.4,
    });
    return object;
  } catch (e) {
    console.error("evaluateSubmission failed", e);
    return FALLBACK;
  }
}

const ALPHA = 0.3;

export async function applySkillDeltas(
  userId: string,
  deltas: SubmissionEvaluation["skill_deltas"],
) {
  if (deltas.length === 0) return;
  const admin = createServiceRoleClient();
  const { data: existing } = await admin
    .from("skill_scores")
    .select("skill_key, score")
    .eq("user_id", userId);
  const map = new Map<SkillKey, number>(
    (existing ?? []).map((r) => [r.skill_key as SkillKey, r.score]),
  );

  for (const d of deltas) {
    const current = map.get(d.skill_key as SkillKey) ?? 50;
    // EMA towards (current + delta), so a +5 nudges up gradually
    const target = Math.max(0, Math.min(100, current + d.delta));
    const next = Math.round((1 - ALPHA) * current + ALPHA * target);
    await admin
      .from("skill_scores")
      .upsert(
        {
          user_id: userId,
          skill_key: d.skill_key as SkillKey,
          score: next,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,skill_key" },
      );
  }
}
