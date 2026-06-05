"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/types/database";
import {
  mapRowToAssessmentSession,
  parseAnswersFromDb,
  type ExecutiveIdentitySessionDbRow,
} from "@/lib/career/identity-assessment/session-map";
import { generateIdentityArtifactsForSession } from "@/lib/career/identity-assessment/generate-artifacts";
import { buildIdentityAssessmentOpeningMessage } from "@/lib/career/identity-assessment/copy";
import { IDENTITY_SESSION_VERSION } from "@/lib/career/identity-assessment/constants";
import type { IdentityChatTurn } from "@/lib/career/identity-assessment/schema";

const BASE = "/career/identity-assessment";

const MIN_USER_TURNS = 6;
const MIN_USER_CHARS = 900;

async function finalizeSessionArtifacts(
  supabase: Awaited<ReturnType<typeof createClient>>,
  sessionId: string,
  snapshot: { conversation: IdentityChatTurn[]; answers: ReturnType<typeof parseAnswersFromDb> },
) {
  await supabase
    .from("executive_identity_sessions")
    .update({
      status: "generating",
      generation_error: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", sessionId);

  const gen = await generateIdentityArtifactsForSession({
    conversation: snapshot.conversation,
    answers: snapshot.answers,
  });

  if (!gen.ok) {
    await supabase
      .from("executive_identity_sessions")
      .update({
        status: "failed",
        generation_error: gen.error.slice(0, 2000),
        updated_at: new Date().toISOString(),
      })
      .eq("id", sessionId);
    return;
  }

  const { profile, finalReport, brainmap } = gen.data;
  await supabase
    .from("executive_identity_sessions")
    .update({
      status: "completed",
      executive_identity_profile: profile as unknown as Json,
      final_report: finalReport as unknown as Json,
      brainmap: brainmap as unknown as Json,
      generation_error: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", sessionId);
}

export async function startNewExecutiveIdentityAssessment() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const seed: IdentityChatTurn[] = [
    {
      role: "assistant",
      content: buildIdentityAssessmentOpeningMessage(),
      createdAt: new Date().toISOString(),
    },
  ];

  const { data, error } = await supabase
    .from("executive_identity_sessions")
    .insert({
      user_id: user.id,
      question_bank_version: IDENTITY_SESSION_VERSION,
      current_phase_index: 0,
      status: "in_progress",
      answers: [] as unknown as Json,
      conversation: seed as unknown as Json,
    })
    .select("id")
    .single();

  if (error) throw error;
  revalidatePath(`${BASE}`);
  redirect(`${BASE}/session/${data.id}`);
}

/** Returns redirect target for client navigation (avoid catching Next redirect exceptions in try/catch). */
export async function completeIdentityAssessmentChatSession(sessionId: string): Promise<
  | { ok: true; redirectTo: string }
  | { ok: false; error: string }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const { data: row, error } = await supabase
    .from("executive_identity_sessions")
    .select("*")
    .eq("id", sessionId)
    .eq("user_id", user.id)
    .single();

  if (error || !row) return { ok: false, error: "Session not found." };

  if (row.status !== "in_progress") {
    return { ok: false, error: "This session can no longer be edited." };
  }

  const session = mapRowToAssessmentSession(row as ExecutiveIdentitySessionDbRow);
  const conv = session.conversation;
  const userTurns = conv.filter((t) => t.role === "user");
  const userChars = userTurns.reduce((acc, t) => acc + t.content.length, 0);

  if (userTurns.length < MIN_USER_TURNS) {
    return {
      ok: false,
      error: `Keep going — at least ${MIN_USER_TURNS} of your replies so the dossier has enough signal (you're at ${userTurns.length}).`,
    };
  }
  if (userChars < MIN_USER_CHARS) {
    return {
      ok: false,
      error:
        "Add a bit more texture — short fragments make your brand map shallow. Elaborate on history, craft, and channel instincts.",
    };
  }

  await finalizeSessionArtifacts(supabase, sessionId, {
    conversation: conv,
    answers: session.answers,
  });

  revalidatePath(`${BASE}/session/${sessionId}`);
  revalidatePath(`${BASE}/session/${sessionId}/results`);

  return { ok: true, redirectTo: `${BASE}/session/${sessionId}/results` };
}

export async function retryAssessmentFormAction(formData: FormData) {
  const sessionId = formData.get("sessionId");
  if (typeof sessionId !== "string" || !sessionId) {
    throw new Error("Missing session.");
  }
  await retryExecutiveIdentityArtifacts(sessionId);
}

export async function retryExecutiveIdentityArtifacts(sessionId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: row, error } = await supabase
    .from("executive_identity_sessions")
    .select("*")
    .eq("id", sessionId)
    .eq("user_id", user.id)
    .single();

  if (error || !row) throw new Error("session not found");

  const mapped = mapRowToAssessmentSession(row as ExecutiveIdentitySessionDbRow);

  await finalizeSessionArtifacts(supabase, sessionId, {
    conversation: mapped.conversation,
    answers: mapped.answers,
  });

  revalidatePath(`${BASE}/session/${sessionId}/results`);
  redirect(`${BASE}/session/${sessionId}/results`);
}
