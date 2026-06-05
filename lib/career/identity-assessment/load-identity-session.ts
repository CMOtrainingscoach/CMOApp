import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/types/database";
import { buildIdentityAssessmentOpeningMessage } from "@/lib/career/identity-assessment/copy";
import type { AssessmentSession, IdentityChatTurn } from "@/lib/career/identity-assessment/schema";
import {
  mapRowToAssessmentSession,
  type ExecutiveIdentitySessionDbRow,
} from "@/lib/career/identity-assessment/session-map";

/**
 * Load an executive identity session for the current user; if `in_progress` with
 * an empty chat (e.g. legacy row before migration), persist the opening assistant turn
 * so the client always hydrates a resumable thread.
 */
export async function loadIdentitySessionForUser(
  sessionId: string,
  userId: string,
): Promise<AssessmentSession | null> {
  const supabase = await createClient();
  const { data: raw, error } = await supabase
    .from("executive_identity_sessions")
    .select("*")
    .eq("id", sessionId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !raw) return null;

  let session = mapRowToAssessmentSession(raw as ExecutiveIdentitySessionDbRow);

  if (
    session.status === "in_progress" &&
    session.conversation.length === 0
  ) {
    const seed: IdentityChatTurn[] = [
      {
        role: "assistant",
        content: buildIdentityAssessmentOpeningMessage(),
        createdAt: new Date().toISOString(),
      },
    ];

    const { error: upErr } = await supabase
      .from("executive_identity_sessions")
      .update({
        conversation: seed as unknown as Json,
        updated_at: new Date().toISOString(),
      })
      .eq("id", sessionId)
      .eq("user_id", userId);

    if (!upErr) {
      const { data: again } = await supabase
        .from("executive_identity_sessions")
        .select("*")
        .eq("id", sessionId)
        .eq("user_id", userId)
        .single();

      if (again) {
        session = mapRowToAssessmentSession(again as ExecutiveIdentitySessionDbRow);
      }
    }
  }

  return session;
}
