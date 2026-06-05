import type { Json } from "@/types/database";
import type { AssessmentSession, IdentityChatTurn, UserAnswer } from "./schema";
import {
  identityAssessmentArtifactsSchema,
  identityChatTurnSchema,
  sessionStatusSchema,
  userAnswerSchema,
  finalReportSchema,
  executiveIdentityProfileSchema,
  brainmapBundleSchema,
} from "./schema";

function parseJsonArray(raw: Json): unknown[] {
  if (!Array.isArray(raw)) return [];
  return raw;
}

export function parseAnswersFromDb(raw: Json): UserAnswer[] {
  const list = parseJsonArray(raw);
  const out: UserAnswer[] = [];
  for (const item of list) {
    const r = userAnswerSchema.safeParse(item);
    if (r.success) out.push(r.data);
  }
  return out;
}

export function parseConversationFromDb(raw: Json | null | undefined): IdentityChatTurn[] {
  const list = parseJsonArray(raw ?? []);
  const out: IdentityChatTurn[] = [];
  for (const item of list) {
    const r = identityChatTurnSchema.safeParse(item);
    if (r.success) out.push(r.data);
  }
  return out;
}

export function parseProfileJson(raw: Json | null): unknown {
  if (raw === null) return null;
  if (typeof raw !== "object") return null;
  return raw;
}

export function safeParseProfile(raw: Json | null) {
  const p = parseProfileJson(raw);
  if (!p) return null;
  const r = executiveIdentityProfileSchema.safeParse(p);
  return r.success ? r.data : null;
}

export function safeParseFinalReport(raw: Json | null) {
  if (raw === null || typeof raw !== "object") return null;
  const r = finalReportSchema.safeParse(raw);
  return r.success ? r.data : null;
}

export function safeParseBrainmap(raw: Json | null) {
  if (raw === null || typeof raw !== "object") return null;
  const r = brainmapBundleSchema.safeParse(raw);
  return r.success ? r.data : null;
}

export type ExecutiveIdentitySessionDbRow = {
  id: string;
  user_id: string;
  question_bank_version: number;
  current_phase_index: number;
  status: string;
  answers: Json;
  conversation?: Json;
  executive_identity_profile: Json | null;
  final_report: Json | null;
  brainmap: Json | null;
  ui_state: Json | null;
  generation_error: string | null;
  created_at: string;
  updated_at: string;
};

export function mapRowToAssessmentSession(
  row: ExecutiveIdentitySessionDbRow,
): AssessmentSession {
  const statusParsed = sessionStatusSchema.safeParse(row.status);
  const status = statusParsed.success ? statusParsed.data : "in_progress";

  return {
    id: row.id,
    userId: row.user_id,
    questionBankVersion: row.question_bank_version,
    currentPhaseIndex: row.current_phase_index,
    status,
    answers: parseAnswersFromDb(row.answers),
    conversation: parseConversationFromDb(row.conversation),
    profile: safeParseProfile(row.executive_identity_profile),
    finalReport: safeParseFinalReport(row.final_report),
    brainmap: safeParseBrainmap(row.brainmap),
    uiState:
      row.ui_state !== null &&
      typeof row.ui_state === "object" &&
      !Array.isArray(row.ui_state)
        ? (row.ui_state as Record<string, unknown>)
        : null,
    generationError: row.generation_error,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function formatAnswerForTranscript(a: {
  questionId: string;
  phase: string;
  answerType: string;
  value: unknown;
  intensity?: number;
}): string {
  let body: string;
  if (typeof a.value === "string") body = a.value;
  else if (Array.isArray(a.value)) body = a.value.join("; ");
  else if (typeof a.value === "number") body = String(a.value);
  else if (a.value && typeof a.value === "object")
    body = JSON.stringify(a.value);
  else body = "";
  const inten =
    typeof a.intensity === "number" ? ` [intensity ${a.intensity}/7]` : "";
  return `[${a.phase}] ${a.questionId}\n→ (${a.answerType}) ${body}${inten}`;
}

export function buildAssessmentContextMarkdown(answers: UserAnswer[]) {
  const lines = answers.map(formatAnswerForTranscript);
  return [
    "## Executive Identity — legacy structured responses",
    "",
    ...lines,
    "",
  ].join("\n");
}

export function buildIndexedChatTranscriptMarkdown(turns: IdentityChatTurn[]) {
  const body = turns
    .map((t, i) => {
      const speaker = t.role === "user" ? "USER" : "PROFESSOR";
      return `[INDEX ${i}] (${speaker})\n${t.content.trim()}`;
    })
    .join("\n\n");
  return [
    "# Executive Identity — conversational interview transcript",
    "",
    "Use INDEX numbers for brainmap supportingTurnIndices (0-based, matching this order).",
    "",
    body,
    "",
  ].join("\n");
}

export function validateArtifactsJson(data: unknown) {
  return identityAssessmentArtifactsSchema.safeParse(data);
}
