import { streamText, type CoreMessage } from "ai";
import { NextResponse } from "next/server";
import { openaiProvider, CHAT_MODEL } from "@/lib/openai";
import { createClient } from "@/lib/supabase/server";
import { IDENTITY_ASSESSMENT_CHAT_SYSTEM } from "@/lib/career/identity-assessment/chat-prompt";
import { IDENTITY_PROFESSOR_NAME } from "@/lib/career/identity-assessment/copy";
import type { Json } from "@/types/database";
import type { IdentityChatTurn } from "@/lib/career/identity-assessment/schema";

export const maxDuration = 120;

function coreMessagesToTurns(messages: CoreMessage[]): IdentityChatTurn[] {
  const out: IdentityChatTurn[] = [];
  for (const m of messages) {
    if (m.role !== "user" && m.role !== "assistant") continue;
    const raw =
      typeof m.content === "string"
        ? m.content
        : JSON.stringify(m.content ?? "");
    if (!raw.trim()) continue;
    out.push({
      role: m.role,
      content: raw.trim(),
      createdAt: new Date().toISOString(),
    });
  }
  return out;
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const body = (await req.json()) as {
    messages: CoreMessage[];
    sessionId?: string;
  };

  const sessionId = body.sessionId;
  if (!sessionId || typeof sessionId !== "string") {
    return NextResponse.json({ error: "missing_session" }, { status: 400 });
  }

  const incoming = body.messages ?? [];
  if (incoming.length === 0) {
    return NextResponse.json({ error: "no_messages" }, { status: 400 });
  }

  const lastUserMsg = [...incoming]
    .reverse()
    .find((m) => m.role === "user");
  const lastUserText =
    typeof lastUserMsg?.content === "string"
      ? lastUserMsg.content.trim()
      : "";

  if (!lastUserText) {
    return NextResponse.json({ error: "empty_user_message" }, { status: 400 });
  }

  const { data: row, error: rowErr } = await supabase
    .from("executive_identity_sessions")
    .select("id, status, user_id")
    .eq("id", sessionId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (rowErr || !row) {
    return NextResponse.json({ error: "session_not_found" }, { status: 404 });
  }

  if (row.status !== "in_progress") {
    return NextResponse.json({ error: "session_locked" }, { status: 409 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, headline, persona_summary")
    .eq("id", user.id)
    .maybeSingle();

  const systemMessage = `${IDENTITY_ASSESSMENT_CHAT_SYSTEM}

SESSION CONTEXT:
- Learner display name: ${profile?.display_name ?? "the candidate"}
- Headline on file: ${profile?.headline ?? "not set"}
- Persona notes: ${profile?.persona_summary ?? "none yet"}

You are speaking as ${IDENTITY_PROFESSOR_NAME} in a private Executive Identity interview for this product. Stay in character.`;

  const result = streamText({
    model: openaiProvider(CHAT_MODEL),
    system: systemMessage,
    messages: incoming,
    temperature: 0.68,
    onFinish: async ({ text }) => {
      try {
        const assistantText = text.trim();
        if (!assistantText) return;

        const fromClient = coreMessagesToTurns(incoming);
        const withAssistant: IdentityChatTurn[] = [
          ...fromClient,
          {
            role: "assistant",
            content: assistantText,
            createdAt: new Date().toISOString(),
          },
        ];

        await supabase
          .from("executive_identity_sessions")
          .update({
            conversation: withAssistant as unknown as Json,
            updated_at: new Date().toISOString(),
          })
          .eq("id", sessionId)
          .eq("user_id", user.id);
      } catch (e) {
        console.error("identity assessment chat persist failed", e);
      }
    },
  });

  return result.toDataStreamResponse();
}
