import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { evaluateAnswer } from "@/lib/strategy/minigame";
import { awardXp, XP_AMOUNTS } from "@/lib/strategy/xp";

export const maxDuration = 30;

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  await ctx.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const body = (await req.json()) as {
    question_id?: string;
    answer?: unknown;
  };
  if (!body.question_id) {
    return NextResponse.json({ error: "question_id required" }, { status: 400 });
  }

  try {
    const result = await evaluateAnswer({
      questionId: body.question_id,
      answer: body.answer,
    });

    let xp_awarded = 0;
    if (result.correct) {
      xp_awarded = XP_AMOUNTS.lesson_question_correct;
      await awardXp({
        userId: user.id,
        source: "lesson_question_correct",
        amount: xp_awarded,
        refId: body.question_id,
      });
    }
    return NextResponse.json({ ...result, xp_awarded });
  } catch (e) {
    console.error("answer route failed", e);
    return NextResponse.json({ error: "answer_failed" }, { status: 500 });
  }
}
