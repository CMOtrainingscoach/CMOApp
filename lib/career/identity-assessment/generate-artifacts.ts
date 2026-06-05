import { generateObject } from "ai";
import { openaiProvider, CHAT_MODEL, isOpenAiConfigured } from "@/lib/openai";
import { identityAssessmentArtifactsSchema } from "./schema";
import type { IdentityAssessmentArtifacts, IdentityChatTurn, UserAnswer } from "./schema";
import { IDENTITY_PROFESSOR_NAME } from "./copy";
import {
  buildAssessmentContextMarkdown,
  buildIndexedChatTranscriptMarkdown,
} from "./session-map";
import { SYNTHESIS_FROM_CHAT_SYSTEM } from "./synthesis-from-chat-prompt";

const LEGACY_SYSTEM = `You are ${IDENTITY_PROFESSOR_NAME}, an elite executive coach and brand strategist.
You receive a structured self-assessment transcript. Produce ONLY JSON matching the schema.

Rules:
- Be specific to their answers; never generic filler.
- Tone: rigorous, supportive, executive-board caliber.
- Blind spots must name behavioral risks grounded in contradictions or gaps in their responses.
- Brainmap: ${IDENTITY_PROFESSOR_NAME}'s synthesis — assign each node to exactly one clusterId among:
  strategic_interests, lifestyle_drivers, authority_themes, brand_signals, knowledge_assets, career_direction.
- Node kinds may include interest, capability, value, industry, executive_trait, hobby, lifestyle_desire, authority_theme, signal, direction.
- weight is 0–1 importance derived from repetition, intensity scores, ranked priorities, and emphasis in text answers.
- Edges connect closely related nodes (share themes); strength 0–1 optional.
- supportingSnippets quote paraphrases from their answers (short).
- supportingQuestionIds use the exact question ids from the transcript headers when possible.
- supportingTurnIndices usually omitted for legacy forms.
- relatedNodeIds list other brainmap node ids for the side panel.
- Ensure twelveMonthRoadmap has exactly four quarters Q1–Q4 with concrete milestones.
- finalReport.professorRecommendations: high-leverage actions (max 12), each with id like "rec_01".`;

export async function generateIdentityArtifactsFromChat(
  turns: IdentityChatTurn[],
): Promise<
  | { ok: true; data: IdentityAssessmentArtifacts }
  | { ok: false; error: string }
> {
  if (!isOpenAiConfigured()) {
    return { ok: false, error: "OPENAI_API_KEY is not configured on the server." };
  }

  const transcript = buildIndexedChatTranscriptMarkdown(turns);
  const prompt = `Transcript:\n\n${transcript}\n\nReturn the full assessment artifacts.`;

  try {
    const { object } = await generateObject({
      model: openaiProvider(CHAT_MODEL),
      schema: identityAssessmentArtifactsSchema,
      system: SYNTHESIS_FROM_CHAT_SYSTEM,
      prompt,
      temperature: 0.35,
    });
    const check = identityAssessmentArtifactsSchema.safeParse(object);
    if (!check.success) {
      return { ok: false, error: check.error.message };
    }
    return { ok: true, data: check.data };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "generateObject failed";
    console.error("generateIdentityArtifactsFromChat", e);
    return { ok: false, error: msg };
  }
}

export async function generateIdentityArtifactsFromLegacyAnswers(
  answers: UserAnswer[],
): Promise<
  | { ok: true; data: IdentityAssessmentArtifacts }
  | { ok: false; error: string }
> {
  if (!isOpenAiConfigured()) {
    return { ok: false, error: "OPENAI_API_KEY is not configured on the server." };
  }

  const transcript = buildAssessmentContextMarkdown(answers);
  const prompt = `Transcript:\n\n${transcript}\n\nReturn the full assessment artifacts.`;

  try {
    const { object } = await generateObject({
      model: openaiProvider(CHAT_MODEL),
      schema: identityAssessmentArtifactsSchema,
      system: LEGACY_SYSTEM,
      prompt,
      temperature: 0.35,
    });
    const check = identityAssessmentArtifactsSchema.safeParse(object);
    if (!check.success) {
      return { ok: false, error: check.error.message };
    }
    return { ok: true, data: check.data };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "generateObject failed";
    console.error("generateIdentityArtifactsFromLegacyAnswers", e);
    return { ok: false, error: msg };
  }
}

/** Prefer chat transcript; fall back to legacy answers if conversation is empty. */
export async function generateIdentityArtifactsForSession(input: {
  conversation: IdentityChatTurn[];
  answers: UserAnswer[];
}) {
  if (input.conversation.length > 0) {
    return generateIdentityArtifactsFromChat(input.conversation);
  }
  return generateIdentityArtifactsFromLegacyAnswers(input.answers);
}
