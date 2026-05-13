import { generateText } from "ai";
import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { openaiProvider, CHAT_MODEL } from "@/lib/openai";
import { PL_JARGON_MATCH_FEEDBACK_SYSTEM } from "@/lib/prompts";
import { getProfessorConfig } from "@/lib/professor-config.server";

export const maxDuration = 60;

const bodySchema = z.object({
  score: z.number().int().min(0).max(20),
  total: z.number().int().positive().max(20),
  misses: z
    .array(
      z.object({
        term: z.string(),
        expectedDef: z.string(),
        choseDef: z.string(),
      }),
    )
    .max(15),
});

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  let parsed: z.infer<typeof bodySchema>;
  try {
    const raw = await req.json();
    parsed = bodySchema.parse(raw);
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const professor = await getProfessorConfig();

  let missLines = "";
  if (parsed.misses.length > 0) {
    missLines = parsed.misses
      .map(
        (m, i) =>
          `${i + 1}. Term: "${m.term}"\n   Expected: "${m.expectedDef}"\n   They chose: "${m.choseDef}"`,
      )
      .join("\n\n");
  }

  const userBlock = [
    `Professor display name: ${professor.professor_name}`,
    "",
    `Score: ${parsed.score} / ${parsed.total}`,
    parsed.misses.length === 0 ?
      "Result: PERFECT ROUND — acknowledge briefly and deepen one habit."
    : `Mistakes (${parsed.misses.length}):\n${missLines}`,
  ].join("\n");

  try {
    const { text } = await generateText({
      model: openaiProvider(CHAT_MODEL),
      system: PL_JARGON_MATCH_FEEDBACK_SYSTEM,
      prompt: userBlock,
      temperature: 0.55,
      maxTokens: 520,
    });
    const body = text?.trim() ?? "";
    if (!body) {
      return NextResponse.json({ error: "empty_response" }, { status: 502 });
    }
    return NextResponse.json({ feedback: body });
  } catch (e) {
    console.error("[pl jargon feedback]", e);
    return NextResponse.json({ error: "generation_failed" }, { status: 500 });
  }
}
