import { NextResponse } from "next/server";
import { z } from "zod";
import { generateText } from "ai";
import { openaiProvider, CHAT_MODEL } from "@/lib/openai";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { buildProfessorSystemPrompt } from "@/lib/professor-config";
import { getProfessorConfig } from "@/lib/professor-config.server";
import {
  DOCUMENT_REVIEW_OPENER_SYSTEM,
  PROFESSOR_SYSTEM,
} from "@/lib/prompts";
import { buildDocumentReviewContextBlock } from "@/lib/documents/document-review-context";

export const maxDuration = 60;

const bodySchema = z.object({ documentId: z.string().uuid() });

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const { documentId } = bodySchema.parse(await req.json());

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: "OpenAI is not configured on this deployment." },
      { status: 503 },
    );
  }

  const admin = createServiceRoleClient();
  const bundle = await buildDocumentReviewContextBlock(
    admin,
    documentId,
    user.id,
  );
  if (!bundle) {
    return NextResponse.json(
      { error: "document not found or not ready" },
      { status: 404 },
    );
  }

  const professorCfg = await getProfessorConfig();
  const systemPrompt = `${buildProfessorSystemPrompt(professorCfg, PROFESSOR_SYSTEM)}

${DOCUMENT_REVIEW_OPENER_SYSTEM}`;

  const userPrompt =
    `Here is the document context bundle (for orientation only — do NOT critique it):\n\n` +
    bundle.contextBlock;

  try {
    const { text } = await generateText({
      model: openaiProvider(CHAT_MODEL),
      system: systemPrompt,
      prompt: userPrompt,
      temperature: 0.55,
    });
    const opener = (text ?? "").trim();
    if (!opener) {
      return NextResponse.json(
        { error: "empty opener from model" },
        { status: 502 },
      );
    }
    return NextResponse.json({ opener });
  } catch (e) {
    console.error("review open failed", e);
    return NextResponse.json(
      { error: "failed to generate opener" },
      { status: 500 },
    );
  }
}
