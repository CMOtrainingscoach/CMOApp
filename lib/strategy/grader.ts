import "server-only";
import { z } from "zod";
import { generateObject } from "ai";
import { openaiProvider, CHAT_MODEL, isOpenAiConfigured } from "@/lib/openai";
import { assignmentGraderSystemForLab } from "@/lib/prompts";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { applySkillDeltas } from "@/lib/scorer";
import {
  getContentLabSlugForModuleId,
  type XpLabSlug,
} from "@/lib/strategy/lab-slug";
import { awardXp, XP_AMOUNTS } from "@/lib/strategy/xp";
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
    "AI grading is offline — add a non-empty OPENAI_API_KEY to the server environment (.env.local for dev, host settings for production).",
  ],
  required_revisions: ["Configure your OpenAI key on the server, restart, then resubmit."],
  feedback_md:
    "**Submission accepted but not yet graded.** The app did not find a usable `OPENAI_API_KEY` on the **server** (client-side env vars do not count). Add it to `.env.local` locally or your host’s environment, restart the dev server or redeploy, then resubmit.",
  skill_deltas: [],
  verdict: "revision",
};

/** Key is set but the OpenAI/API request failed (model, billing, rate limit, network, etc.). */
const REVIEW_AI_SERVICE_ERROR: AssignmentReview = {
  score: 65,
  strengths: ["Submission received."],
  weaknesses: [
    "The AI grading request failed even though OPENAI_API_KEY is set. Common causes: wrong or expired key, no access to the configured model, rate limits, or a temporary outage.",
  ],
  required_revisions: [
    "Confirm the key is on the server env (not only in the editor), restart / redeploy, verify billing and model access, then resubmit.",
  ],
  feedback_md:
    "**We could not reach OpenAI to finish grading.** Your key may be set, but the API call did not succeed. Ask your admin to check **server** logs for the exact error, verify **OPENAI_CHAT_MODEL** (default `gpt-4o-mini`) is enabled for your project, billing is active, and try again in a minute.",
  skill_deltas: [],
  verdict: "revision",
};

type AssignmentJoinLite = {
  module_id: string;
  passing_score?: number | null;
};

async function grantAssignmentPassRewards(opts: {
  userId: string;
  submissionId: string;
  moduleId: string;
  labSlug: XpLabSlug;
}) {
  const admin = createServiceRoleClient();

  const { data: existingPass } = await admin
    .from("xp_log")
    .select("id")
    .eq("user_id", opts.userId)
    .eq("source", "assignment_pass")
    .eq("source_ref_id", opts.submissionId)
    .maybeSingle();
  if (!existingPass) {
    await awardXp({
      userId: opts.userId,
      source: "assignment_pass",
      amount: XP_AMOUNTS.assignment_pass,
      refId: opts.submissionId,
      labSlug: opts.labSlug,
    });
  }

  const { data: existingMod } = await admin
    .from("xp_log")
    .select("id")
    .eq("user_id", opts.userId)
    .eq("source", "module_complete")
    .eq("source_ref_id", opts.moduleId)
    .maybeSingle();
  if (!existingMod) {
    await awardXp({
      userId: opts.userId,
      source: "module_complete",
      amount: XP_AMOUNTS.module_complete,
      refId: opts.moduleId,
      labSlug: opts.labSlug,
    });
  }

  const { data: rewards } = await admin
    .from("module_rewards")
    .select("id")
    .eq("module_id", opts.moduleId);
  if (rewards && rewards.length > 0) {
    const rows = rewards.map((r) => ({
      user_id: opts.userId,
      reward_id: r.id as string,
    }));
    await admin.from("reward_unlocks").upsert(rows, {
      onConflict: "user_id,reward_id",
    });
  }
}

/**
 * Fixes reviews stored as `revision` when the numeric score already meets the
 * assignment passing threshold (e.g. legacy rubric logic). Idempotent for XP.
 */
export async function reconcileAssignmentPassIfNeeded(
  submissionId: string,
): Promise<void> {
  const admin = createServiceRoleClient();
  const { data: sub } = await admin
    .from("assignment_submissions")
    .select(
      "id, user_id, status, assignment_id, module_assignments:assignment_id(module_id, passing_score)",
    )
    .eq("id", submissionId)
    .maybeSingle();
  if (!sub || sub.status !== "graded") return;

  const { data: rev } = await admin
    .from("assignment_reviews")
    .select("verdict, score")
    .eq("submission_id", submissionId)
    .maybeSingle();
  if (!rev || rev.verdict !== "revision") return;

  const join = (sub as { module_assignments: AssignmentJoinLite | AssignmentJoinLite[] })
    .module_assignments;
  const assignment = Array.isArray(join) ? join[0] : join;
  if (!assignment) return;

  const passingScore = assignment.passing_score ?? 80;
  if ((rev.score ?? 0) < passingScore) return;

  await admin
    .from("assignment_reviews")
    .update({ verdict: "pass" })
    .eq("submission_id", submissionId);

  const assignmentLab = await getContentLabSlugForModuleId(assignment.module_id);
  await grantAssignmentPassRewards({
    userId: (sub as { user_id: string }).user_id,
    submissionId,
    moduleId: assignment.module_id,
    labSlug: assignmentLab,
  });
}

export async function gradeAssignment(submissionId: string): Promise<AssignmentReview> {
  const admin = createServiceRoleClient();

  // Load the submission and its assignment context
  const { data: sub } = await admin
    .from("assignment_submissions")
    .select(
      "id, user_id, content, attachments, assignment_id, module_assignments:assignment_id(id, title, prompt, rubric, success_criteria, max_score, passing_score, module_id)",
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
    passing_score?: number | null;
    module_id: string;
  };
  const a = (sub as { module_assignments: AssignmentJoin | AssignmentJoin[] })
    .module_assignments;
  const assignment = Array.isArray(a) ? a[0] : a;
  if (!assignment) throw new Error("assignment not found");

  const assignmentLab = await getContentLabSlugForModuleId(assignment.module_id);
  const passingScore = assignment.passing_score ?? 80;

  let parsed: AssignmentReview;
  if (!isOpenAiConfigured()) {
    parsed = FALLBACK_REVIEW;
  } else {
    try {
      const { object } = await generateObject({
        model: openaiProvider(CHAT_MODEL),
        schema: ReviewSchema,
        system: assignmentGraderSystemForLab(assignmentLab),
        prompt: `ASSIGNMENT
Title: ${assignment.title}
Prompt: ${assignment.prompt}
Rubric: ${JSON.stringify(assignment.rubric)}
Success criteria: ${JSON.stringify(assignment.success_criteria)}
Max score: ${assignment.max_score}
Passing score (minimum for pass): ${passingScore}

USER SUBMISSION:
${String((sub as { content: string }).content ?? "").slice(0, 12000)}

Grade strictly per your system rubric. Return the structured review.`,
        temperature: 0.35,
      });
      const passes = passesRubric(object.score, passingScore);
      parsed = { ...object, verdict: passes ? "pass" : "revision" };
    } catch (e) {
      const detail = e instanceof Error ? e.message : String(e);
      console.error("gradeAssignment AI failed:", detail, e);
      parsed = REVIEW_AI_SERVICE_ERROR;
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
    await grantAssignmentPassRewards({
      userId,
      submissionId,
      moduleId: assignment.module_id,
      labSlug: assignmentLab,
    });
  }

  return parsed;
}

function passesRubric(score: number, passingScore: number): boolean {
  return score >= passingScore;
}
