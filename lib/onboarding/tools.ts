import "server-only";
import { tool } from "ai";
import { z } from "zod";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { embedMany } from "@/lib/embeddings";
import type { MemoryKind } from "@/types/database";
import {
  ONBOARDING_TOPIC_IDS,
  ONBOARDING_TOPICS,
  topicById,
  type OnboardingTopicId,
} from "./topics";

// ---------------------------------------------------------------------
// Tool: mark_topic_complete
// ---------------------------------------------------------------------
const TopicIdEnum = z.enum(
  ONBOARDING_TOPIC_IDS as [OnboardingTopicId, ...OnboardingTopicId[]],
);

export type MarkTopicResult =
  | { ok: true; topics_covered: OnboardingTopicId[] }
  | { ok: false; error: string };

function makeMarkTopicComplete(opts: {
  userId: string;
  conversationId: string;
  onTopicsChanged: (topicsCovered: OnboardingTopicId[]) => void;
}) {
  return tool({
    description:
      "Call this immediately after you have learned enough about a topic. Marks the topic as covered in the right-rail checklist. Do NOT call twice for the same topic.",
    parameters: z.object({
      topic_id: TopicIdEnum,
    }),
    async execute({ topic_id }): Promise<MarkTopicResult> {
      try {
        const admin = createServiceRoleClient();
        const { data: conv } = await admin
          .from("chat_conversations")
          .select("metadata")
          .eq("id", opts.conversationId)
          .eq("user_id", opts.userId)
          .single();

        const metaRaw = (conv?.metadata ?? {}) as Record<string, unknown>;
        const existing = Array.isArray(metaRaw.topics_covered)
          ? (metaRaw.topics_covered as string[])
          : [];
        const validIds = new Set<string>(ONBOARDING_TOPIC_IDS);
        const next = Array.from(new Set([...existing, topic_id])).filter(
          (t): t is OnboardingTopicId => validIds.has(t),
        );

        await admin
          .from("chat_conversations")
          .update({
            metadata: { ...metaRaw, topics_covered: next },
            updated_at: new Date().toISOString(),
          })
          .eq("id", opts.conversationId);

        opts.onTopicsChanged(next);
        return { ok: true, topics_covered: next };
      } catch (e) {
        console.error("mark_topic_complete failed", e);
        return { ok: false, error: "persist_failed" };
      }
    },
  });
}

// ---------------------------------------------------------------------
// Tool: complete_onboarding
// ---------------------------------------------------------------------
const FactList = z.array(z.string().min(2).max(280)).max(8);

const TopicsPayload = z.object({
  who_you_are: z.object({
    summary: z.string().min(8).max(400),
    facts: FactList,
  }),
  living_situation: z.object({
    summary: z.string().min(8).max(400),
    facts: FactList,
  }),
  hobbies: z.object({
    summary: z.string().min(8).max(400),
    facts: FactList,
  }),
  interests: z.object({
    summary: z.string().min(8).max(400),
    facts: FactList,
  }),
  lifestyle: z.object({
    summary: z.string().min(8).max(400),
    facts: FactList,
  }),
  marketing_knowledge: z.object({
    summary: z.string().min(8).max(400),
    strengths: FactList,
    weaknesses: FactList,
  }),
  career_goal: z.object({
    summary: z.string().min(8).max(400),
    target_role: z.string().min(2).max(160),
    target_horizon: z.string().min(2).max(80),
  }),
});

export type OnboardingPayload = z.infer<typeof CompletePayload>;

export const CompletePayload = z.object({
  display_name: z.string().min(1).max(80).optional(),
  headline: z.string().min(1).max(120).optional(),
  persona_summary: z.string().min(20).max(800),
  topics: TopicsPayload,
});

type FactWithKind = { content: string; kind: MemoryKind };

function buildMemoryRows(payload: OnboardingPayload): FactWithKind[] {
  const rows: FactWithKind[] = [];

  for (const topic of ONBOARDING_TOPICS) {
    if (topic.id === "marketing_knowledge") {
      const mk = payload.topics.marketing_knowledge;
      for (const f of mk.strengths)
        rows.push({ content: `User strength (marketing): ${f}`, kind: "strength" });
      for (const f of mk.weaknesses)
        rows.push({ content: `User gap (marketing): ${f}`, kind: "weakness" });
      if (mk.summary)
        rows.push({
          content: `Marketing self-assessment: ${mk.summary}`,
          kind: "insight",
        });
      continue;
    }
    if (topic.id === "career_goal") {
      const cg = payload.topics.career_goal;
      rows.push({
        content: `Career goal: ${cg.target_role} ${cg.target_horizon}. ${cg.summary}`,
        kind: "career_goal",
      });
      continue;
    }
    const t = payload.topics[topic.id] as { summary: string; facts: string[] };
    if (t.summary) {
      rows.push({
        content: `${topic.label}: ${t.summary}`,
        kind: topic.memoryKind,
      });
    }
    for (const f of t.facts) {
      rows.push({ content: f, kind: topic.memoryKind });
    }
  }

  return rows.filter((r) => r.content.trim().length >= 4).slice(0, 60);
}

async function commitOnboarding(
  userId: string,
  conversationId: string,
  payload: OnboardingPayload,
) {
  const admin = createServiceRoleClient();

  // 1) Update profile
  const profileUpdate: Record<string, unknown> = {
    persona_summary: payload.persona_summary,
    onboarding: payload.topics,
    onboarded_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  if (payload.display_name) profileUpdate.display_name = payload.display_name;
  if (payload.headline) profileUpdate.headline = payload.headline;

  await admin.from("profiles").update(profileUpdate).eq("id", userId);

  // 2) Mark conversation as fully covered + status complete
  await admin
    .from("chat_conversations")
    .update({
      metadata: {
        topics_covered: ONBOARDING_TOPIC_IDS,
        status: "complete",
        completed_at: new Date().toISOString(),
      },
      updated_at: new Date().toISOString(),
    })
    .eq("id", conversationId);

  // 3) Embed and insert memories (best-effort — failure here should NOT
  // block the dashboard from unlocking).
  try {
    const facts = buildMemoryRows(payload);
    if (facts.length > 0) {
      const embeddings = await embedMany(facts.map((f) => f.content));
      const rows = facts.map((f, i) => ({
        user_id: userId,
        kind: f.kind,
        content: f.content,
        embedding: embeddings[i] as unknown as string,
      }));
      // Insert in chunks to stay well under any payload limits
      const batchSize = 30;
      for (let i = 0; i < rows.length; i += batchSize) {
        await admin.from("memories").insert(rows.slice(i, i + batchSize));
      }
    }
  } catch (e) {
    console.error("commitOnboarding: memory insert failed", e);
  }
}

export type CompleteResult =
  | { ok: true; redirect: string }
  | { ok: false; error: string };

function makeCompleteOnboarding(opts: {
  userId: string;
  conversationId: string;
  onComplete: () => void;
}) {
  return tool({
    description:
      "Call this once you have wrapped the LAST topic (career_goal). Pass a fully populated structured payload; it will be saved to the user's profile and memories, and the dashboard will unlock. Do not produce any further text after calling this.",
    parameters: CompletePayload,
    async execute(payload): Promise<CompleteResult> {
      try {
        await commitOnboarding(opts.userId, opts.conversationId, payload);
        opts.onComplete();
        return { ok: true, redirect: "/dashboard" };
      } catch (e) {
        console.error("complete_onboarding failed", e);
        return { ok: false, error: "commit_failed" };
      }
    },
  });
}

// ---------------------------------------------------------------------
// Public factory
// ---------------------------------------------------------------------
export function makeOnboardingTools(opts: {
  userId: string;
  conversationId: string;
  onTopicsChanged: (topicsCovered: OnboardingTopicId[]) => void;
  onComplete: () => void;
}) {
  return {
    mark_topic_complete: makeMarkTopicComplete({
      userId: opts.userId,
      conversationId: opts.conversationId,
      onTopicsChanged: opts.onTopicsChanged,
    }),
    complete_onboarding: makeCompleteOnboarding({
      userId: opts.userId,
      conversationId: opts.conversationId,
      onComplete: opts.onComplete,
    }),
  };
}
