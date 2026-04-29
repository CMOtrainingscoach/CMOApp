import { NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { gradeAssignment } from "@/lib/strategy/grader";

export const maxDuration = 60;

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id: assignmentId } = await ctx.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as {
    content?: string;
    documentIds?: string[];
  };
  const content = (body.content ?? "").trim();
  if (content.length < 50) {
    return NextResponse.json(
      { error: "Submission too short. Aim for substantive analysis." },
      { status: 400 },
    );
  }

  const admin = createServiceRoleClient();

  // Verify assignment exists
  const { data: assignment } = await admin
    .from("module_assignments")
    .select("id, module_id")
    .eq("id", assignmentId)
    .maybeSingle();
  if (!assignment) {
    return NextResponse.json({ error: "assignment_not_found" }, { status: 404 });
  }

  // Persist the submission
  const { data: created, error } = await admin
    .from("assignment_submissions")
    .insert({
      user_id: user.id,
      assignment_id: assignmentId,
      content,
      attachments: body.documentIds ?? [],
    })
    .select("id")
    .single();
  if (error || !created) {
    console.error("submit error", error);
    return NextResponse.json({ error: "insert_failed" }, { status: 500 });
  }

  try {
    const review = await gradeAssignment(created.id);
    return NextResponse.json({
      submission_id: created.id,
      module_id: assignment.module_id,
      review,
    });
  } catch (e) {
    console.error("grading failed", e);
    return NextResponse.json(
      { submission_id: created.id, error: "grading_failed" },
      { status: 500 },
    );
  }
}
