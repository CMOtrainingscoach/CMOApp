import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { applySkillDeltas, evaluateSubmission } from "@/lib/scorer";

export const maxDuration = 60;

const bodySchema = z.object({
  taskId: z.string().uuid(),
  submission: z.string().min(20).max(20000),
});

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  let parsed: z.infer<typeof bodySchema>;
  try {
    parsed = bodySchema.parse(await req.json());
  } catch (e) {
    return NextResponse.json(
      { error: "invalid payload", details: (e as Error).message },
      { status: 400 },
    );
  }

  const { data: task } = await supabase
    .from("tasks")
    .select("*")
    .eq("id", parsed.taskId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!task) return NextResponse.json({ error: "task not found" }, { status: 404 });

  const evaluation = await evaluateSubmission({
    taskTitle: task.title,
    taskDescription: task.description,
    taskCategory: task.category,
    submission: parsed.submission,
  });

  const admin = createServiceRoleClient();
  await admin.from("task_submissions").insert({
    task_id: task.id,
    user_id: user.id,
    content: parsed.submission,
    score: evaluation.score,
    ai_feedback: {
      strengths: evaluation.strengths,
      gaps: evaluation.gaps,
      next_steps: evaluation.next_steps,
      skill_deltas: evaluation.skill_deltas,
    },
  });

  await admin
    .from("tasks")
    .update({
      status: "reviewed",
      score: evaluation.score,
      feedback: {
        strengths: evaluation.strengths,
        gaps: evaluation.gaps,
        next_steps: evaluation.next_steps,
      },
      completed_at: new Date().toISOString(),
    })
    .eq("id", task.id);

  await applySkillDeltas(user.id, evaluation.skill_deltas);

  return NextResponse.json({ evaluation });
}
