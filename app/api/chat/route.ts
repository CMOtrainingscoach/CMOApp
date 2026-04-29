import { streamText, type CoreMessage } from "ai";
import { NextResponse } from "next/server";
import { openaiProvider, CHAT_MODEL } from "@/lib/openai";
import { PROFESSOR_SYSTEM } from "@/lib/prompts";
import {
  retrieveContext,
  renderRetrievedContext,
  extractAndStoreMemories,
} from "@/lib/memory";
import { buildProfessorSystemPrompt } from "@/lib/professor-config";
import { getProfessorConfig } from "@/lib/professor-config.server";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { loadStrategyLessonAnchor } from "@/lib/strategy/lesson-chat-anchor";

export const maxDuration = 60;

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const body = (await req.json()) as {
    messages: CoreMessage[];
    conversationId?: string;
    /** When set, validates Strategy Lab unlock and appends lesson grounding to system prompt. */
    lessonId?: string;
  };

  let lessonAnchorBlock = "";
  let lessonConvTitle: string | null = null;
  if (body.lessonId) {
    const loaded = await loadStrategyLessonAnchor(body.lessonId, user.id);
    if (!loaded) {
      return NextResponse.json(
        { error: "lesson_forbidden_or_missing" },
        { status: 403 },
      );
    }
    lessonAnchorBlock = `\n\n${loaded.anchor}`;
    lessonConvTitle = loaded.conversationTitleBase;
  }
  const incoming = body.messages ?? [];
  if (incoming.length === 0) {
    return NextResponse.json({ error: "no messages" }, { status: 400 });
  }
  const lastUserMsg = [...incoming]
    .reverse()
    .find((m) => m.role === "user");
  const lastUserText =
    typeof lastUserMsg?.content === "string"
      ? lastUserMsg.content
      : JSON.stringify(lastUserMsg?.content ?? "");

  // Resolve conversation id
  let conversationId = body.conversationId;
  if (!conversationId) {
    const { data: conv } = await supabase
      .from("chat_conversations")
      .insert({
        user_id: user.id,
        title:
          lessonConvTitle ??
          (lastUserText.slice(0, 60) || "New conversation"),
      })
      .select("id")
      .single();
    conversationId = conv?.id;
  }

  // Persist the incoming user message
  if (conversationId && lastUserMsg) {
    await supabase.from("chat_messages").insert({
      conversation_id: conversationId,
      user_id: user.id,
      role: "user",
      content: lastUserText,
    });
  }

  // Build retrieval context using the latest user message
  const ctx = await retrieveContext(user.id, lastUserText, 8);

  // Profile snippet + admin-configured Professor identity
  const [{ data: profile }, professorCfg] = await Promise.all([
    supabase
      .from("profiles")
      .select("display_name, headline, persona_summary")
      .eq("id", user.id)
      .maybeSingle(),
    getProfessorConfig(),
  ]);

  const compiledProfessorPrompt = buildProfessorSystemPrompt(
    professorCfg,
    PROFESSOR_SYSTEM,
  );

  const systemMessage = `${compiledProfessorPrompt}${lessonAnchorBlock}

USER PROFILE:
- Name: ${profile?.display_name ?? "the user"}
- Headline: ${profile?.headline ?? "CMO in the making"}
- Notes: ${profile?.persona_summary ?? "no persona summary yet."}

CONTEXT (retrieved from this user's memory + documents):
${renderRetrievedContext(ctx)}`;

  const result = streamText({
    model: openaiProvider(CHAT_MODEL),
    system: systemMessage,
    messages: incoming,
    temperature: 0.65,
    onFinish: async ({ text }) => {
      try {
        const admin = createServiceRoleClient();
        const { data: msg } = await admin
          .from("chat_messages")
          .insert({
            conversation_id: conversationId!,
            user_id: user.id,
            role: "assistant",
            content: text,
          })
          .select("id")
          .single();

        await admin
          .from("chat_conversations")
          .update({ updated_at: new Date().toISOString() })
          .eq("id", conversationId!);

        // Best-effort async memory extraction (don't block response)
        const fullConv = [
          ...incoming.map((m) => ({
            role: String(m.role),
            content:
              typeof m.content === "string"
                ? m.content
                : JSON.stringify(m.content),
          })),
          { role: "assistant", content: text },
        ];
        await extractAndStoreMemories(user.id, fullConv, msg?.id);
      } catch (e) {
        console.error("chat onFinish persistence failed", e);
      }
    },
  });

  const response = result.toDataStreamResponse();
  if (conversationId) response.headers.set("x-conversation-id", conversationId);
  return response;
}
