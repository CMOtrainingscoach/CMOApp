import "server-only";
import { z } from "zod";
import { generateObject } from "ai";
import { openaiProvider, CHAT_MODEL } from "@/lib/openai";
import { STRATEGY_ASSIGNMENT_GRADER_SYSTEM } from "@/lib/prompts";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { applySkillDeltas } from "@/lib/scorer";
import { awardXp, XP_AMOUNTS } from "./xp";
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

const ReviewSchema = z.object({
  score: z.number().int().min(0).max(100),
  strengths: z.array(z.string().min(4).max(280)).max(3),
  weaknesses: z.array(z.string().min(4).max(280)).max(3),
  required_revisions: z.array(z.string().min(4).max(280)).max(3),
  feedback_md: z.string().min(40).max(2000),
  skill_deltas: z
    .array(
      z.object({
        skill_key: skillKeyEnum,
        delta: z.number().int().min(-10).max(10),
      }),
    )
    .max(SKILL_KEYS.length),
});

export type AssignmentReview = z.infer<typeof ReviewSchema> & {
  verdict: "pass" | "revision";
};

const FALLBACK_REVIEW: AssignmentReview = {
  score: 65,
  strengths: ["Submission received."],
  weaknesses: [
    "AI grading is offline — set OPENAI_API_KEY to enable detailed scoring.",
  ],
  required_revisions: ["Configure your OpenAI key, then resubmit for grading."],
  feedback_md:
    "**Submission accepted but not yet graded.** The Professor needs an OpenAI key to evaluate your work. Once configured, resubmit for a full review.",
  skill_deltas: [],
  verdict: "revision",
};

export async function gradeAssignment(submissionId: string): Promise<AssignmentReview> {
  const admin = createServiceRoleClient();

  // Load the submission and its assignment context
  const { data: sub } = await admin
    .from("assignment_submissions")
    .select(
      "id, user_id, content, attachments, assignment_id, module_assignments:assignment_id(id, title, prompt, rubric, success_criteria, max_score, module_id)",
    )
    .eq("id", submissionId)
    .maybeSingle();

  if (!sub) throw new Error("submission not found");

  type AssignmentJoin = {
    id: string;
    title: string;
    prompt: string;
    rubric: unknown;
    success_criteria: unknown;
    max_score: number;
    module_id: string;
  };
  const a = (sub as { module_assignments: AssignmentJoin | AssignmentJoin[] })
    .module_assignments;
  const assignment = Array.isArray(a) ? a[0] : a;
  if (!assignment) throw new Error("assignment not found");

  let parsed: AssignmentReview;
  if (!process.env.OPENAI_API_KEY) {
    parsed = FALLBACK_REVIEW;
  } else {
    try {
      const { object } = await generateObject({
        model: openaiProvider(CHAT_MODEL),
        schema: ReviewSchema,
        system: STRATEGY_ASSIGNMENT_GRADER_SYSTEM,
        prompt: `ASSIGNMENT
Title: ${assignment.title}
Prompt: ${assignment.prompt}
Rubric: ${JSON.stringify(assignment.rubric)}
Success criteria: ${JSON.stringify(assignment.success_criteria)}
Max score: ${assignment.max_score}

USER SUBMISSION:
${String((sub as { content: string }).content ?? "").slice(0, 12000)}

Grade strictly per your system rubric. Return the structured review.`,
        temperature: 0.35,
      });
      const passes = passesRubric(
        object.score,
        object.required_revisions,
        assignment.success_criteria,
      );
      parsed = { ...object, verdict: passes ? "pass" : "revision" };
    } catch (e) {
      console.error("gradeAssignment AI failed", e);
      parsed = FALLBACK_REVIEW;
    }
  }

  // Persist the review
  await admin.from("assignment_reviews").upsert(
    {
      submission_id: submissionId,
      score: parsed.score,
      strengths: parsed.strengths,
      weaknesses: parsed.weaknesses,
      required_revisions: parsed.required_revisions,
      verdict: parsed.verdict,
      feedback_md: parsed.feedback_md,
    },
    { onConflict: "submission_id" },
  );
  await admin
    .from("assignment_submissions")
    .update({ status: "graded" })
    .eq("id", submissionId);

  const userId = (sub as { user_id: string }).user_id;

  // Apply skill deltas regardless of verdict (signal is signal)
  if (parsed.skill_deltas.length > 0) {
    await applySkillDeltas(
      userId,
      parsed.skill_deltas.map((d) => ({
        skill_key: d.skill_key,
        delta: d.delta,
      })),
    );
  }

  // On pass, unlock module reward + award XP
  if (parsed.verdict === "pass") {
    await awardXp({
      userId,
      source: "assignment_pass",
      amount: XP_AMOUNTS.assignment_pass,
      refId: submissionId,
    });
    await awardXp({
      userId,
      source: "module_complete",
      amount: XP_AMOUNTS.module_complete,
      refId: assignment.module_id,
    });

    // Unlock all rewards on this module
    const { data: rewards } = await admin
      .from("module_rewards")
      .select("id")
      .eq("module_id", assignment.module_id);
    if (rewards && rewards.length > 0) {
      const rows = rewards.map((r) => ({
        user_id: userId,
        reward_id: r.id as string,
      }));
      await admin.from("reward_unlocks").upsert(rows, {
        onConflict: "user_id,reward_id",
      });
    }
  }

  return parsed;
}

function passesRubric(
  score: number,
  required_revisions: string[],
  successCriteria: unknown,
): boolean {
  if (score < 70) return false;
  if (required_revisions && required_revisions.length > 0) return false;
  // success_criteria is a hard guideline, not enforceable per item without
  // re-judging; trust the score+revisions signal.
  void successCriteria;
  return true;
}
