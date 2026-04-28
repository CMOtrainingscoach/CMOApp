import { streamText, StreamData, type CoreMessage } from "ai";
import { NextResponse } from "next/server";
import { openaiProvider, CHAT_MODEL } from "@/lib/openai";
import { ONBOARDING_PROFESSOR_SYSTEM } from "@/lib/onboarding/prompt";
import { ONBOARDING_TOPIC_IDS, type OnboardingTopicId } from "@/lib/onboarding/topics";
import { makeOnboardingTools } from "@/lib/onboarding/tools";
import { buildProfessorSystemPrompt } from "@/lib/professor-config";
import { getProfessorConfig } from "@/lib/professor-config.server";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";

export const maxDuration = 60;

type Metadata = {
  topics_covered?: string[];
  status?: string;
  completed_at?: string;
};

async function getOrCreateOnboardingConversation(opts: {
  userId: string;
  admin: ReturnType<typeof createServiceRoleClient>;
}) {
  const { userId, admin } = opts;
  const { data: existing } = await admin
    .from("chat_conversations")
    .select("id, metadata")
    .eq("user_id", userId)
    .eq("kind", "onboarding")
    .order("updated_at", { ascending: false })
    .limit(1);

  if (existing && existing.length > 0) {
    return {
      id: existing[0].id as string,
      metadata: (existing[0].metadata ?? {}) as Metadata,
    };
  }

  const { data: created, error } = await admin
    .from("chat_conversations")
    .insert({
      user_id: userId,
      kind: "onboarding",
      title: "First-login interview",
      metadata: { topics_covered: [], status: "active" },
    })
    .select("id, metadata")
    .single();

  if (error || !created) {
    throw new Error(`failed to create onboarding conversation: ${error?.message}`);
  }
  return {
    id: created.id as string,
    metadata: (created.metadata ?? {}) as Metadata,
  };
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  // If already onboarded, refuse — the page will redirect.
  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarded_at, display_name")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.onboarded_at) {
    return NextResponse.json({ error: "already_onboarded" }, { status: 409 });
  }

  const body = (await req.json()) as { messages: CoreMessage[] };
  const incoming = body.messages ?? [];
  if (incoming.length === 0) {
    return NextResponse.json({ error: "no messages" }, { status: 400 });
  }

  const admin = createServiceRoleClient();

  // Resolve the single onboarding conversation
  const conv = await getOrCreateOnboardingConversation({
    userId: user.id,
    admin,
  });
  const conversationId = conv.id;
  const initialTopicsCovered = (conv.metadata.topics_covered ??
    []) as OnboardingTopicId[];

  // Persist incoming user message (best effort)
  const lastUserMsg = [...incoming].reverse().find((m) => m.role === "user");
  const lastUserText =
    typeof lastUserMsg?.content === "string"
      ? lastUserMsg.content
      : JSON.stringify(lastUserMsg?.content ?? "");
  if (lastUserMsg) {
    await admin.from("chat_messages").insert({
      conversation_id: conversationId,
      user_id: user.id,
      role: "user",
      content: lastUserText,
    });
  }

  // Resolve professor identity for greeting tone (name only)
  const professorCfg = await getProfessorConfig();
  const compiledIdentity = buildProfessorSystemPrompt(professorCfg, "");

  const systemMessage = `${ONBOARDING_PROFESSOR_SYSTEM}

# Professor identity (use this name and persona)
${compiledIdentity}

# User context so far
- Email: ${user.email ?? "(unknown)"}
- Display name on file: ${profile?.display_name ?? "(none yet — ask)"}
- Topics already covered in this interview: ${
    initialTopicsCovered.length > 0
      ? initialTopicsCovered.join(", ")
      : "(none — start with topic 1)"
  }
- Valid topic ids (use these EXACTLY): ${ONBOARDING_TOPIC_IDS.join(", ")}`;

  // Custom data stream for tick-off + completion signals
  const data = new StreamData();
  let latestCovered: OnboardingTopicId[] = [...initialTopicsCovered];
  let completed = false;

  // Send initial state on connect so the rail shows the right thing immediately
  data.append({ type: "topics", topicsCovered: latestCovered });

  const tools = makeOnboardingTools({
    userId: user.id,
    conversationId,
    onTopicsChanged: (topicsCovered) => {
      latestCovered = topicsCovered;
      data.append({ type: "topics", topicsCovered });
    },
    onComplete: () => {
      completed = true;
      data.append({ type: "complete", redirect: "/dashboard" });
    },
  });

  const result = streamText({
    model: openaiProvider(CHAT_MODEL),
    system: systemMessage,
    messages: incoming,
    tools,
    toolChoice: "auto",
    maxSteps: 8,
    temperature: 0.55,
    onFinish: async ({ text }) => {
      try {
        if (text && text.trim().length > 0) {
          await admin.from("chat_messages").insert({
            conversation_id: conversationId,
            user_id: user.id,
            role: "assistant",
            content: text,
          });
        }
        if (!completed) {
          await admin
            .from("chat_conversations")
            .update({ updated_at: new Date().toISOString() })
            .eq("id", conversationId);
        }
      } catch (e) {
        console.error("onboarding chat onFinish persistence failed", e);
      } finally {
        await data.close();
      }
    },
  });

  return result.toDataStreamResponse({ data });
}
