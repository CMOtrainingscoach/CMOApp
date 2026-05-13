import { NextResponse } from "next/server";
import { z } from "zod";
import { streamText } from "ai";
import { openaiProvider, CHAT_MODEL } from "@/lib/openai";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { buildProfessorSystemPrompt } from "@/lib/professor-config";
import { getProfessorConfig } from "@/lib/professor-config.server";
import {
  DOCUMENT_REVIEW_FEEDBACK_SYSTEM,
  PROFESSOR_SYSTEM,
} from "@/lib/prompts";
import { buildDocumentReviewContextBlock } from "@/lib/documents/document-review-context";

export const maxDuration = 120;

const bodySchema = z.object({
  /** `useCompletion` sends the learner input here */
  prompt: z.string().min(1).max(8000),
  documentId: z.string().uuid(),
  openingQuestion: z.string().max(6000).optional().nullable(),
});

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const raw = await req.json();
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid body", detail: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const { prompt: angle, documentId, openingQuestion } = parsed.data;

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

${DOCUMENT_REVIEW_FEEDBACK_SYSTEM}`;

  const userContent =
    `# Document context bundle\n` +
    bundle.contextBlock +
    `\n\n# Learner's chosen review angle\n` +
    angle.trim();

  const result = streamText({
    model: openaiProvider(CHAT_MODEL),
    system: systemPrompt,
    prompt: userContent,
    temperature: 0.45,
    onFinish: async ({ text }) => {
      const feedback = (text ?? "").trim();
      if (!feedback) {
        console.warn("document review stream finished with empty text");
        return;
      }
      try {
        const { error } = await admin.from("document_professor_reviews").insert({
          user_id: user.id,
          document_id: documentId,
          review_angle: angle.trim(),
          feedback,
          opening_question: openingQuestion?.trim() || null,
        });
        if (error) console.error("document_professor_reviews insert failed", error);
      } catch (e) {
        console.error("document review onFinish persistence failed", e);
      }
    },
  });

  return result.toDataStreamResponse();
}
