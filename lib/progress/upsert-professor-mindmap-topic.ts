import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { generateObject } from "ai";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { openaiProvider, CHAT_MODEL } from "@/lib/openai";
import { embedMany } from "@/lib/embeddings";
import { BRAINMAP_CLUSTER_IDS } from "@/lib/career/identity-assessment/schema";
import { BRAINMAP_CLUSTER_DISPLAY } from "@/lib/career/identity-assessment/cluster-labels";
import { slugifyMindmapClusterTitle } from "@/lib/progress/mindmap-slug";

const CLUSTER_ENUM = z.enum(
  BRAINMAP_CLUSTER_IDS as unknown as [string, ...string[]],
);

const topicDecisionSchema = z.object({
  topicTitle: z.string().min(3).max(120),
  recap: z.string().min(8).max(620),
  anchorClusterId: CLUSTER_ENUM,
  anchorLinkNote: z.string().min(20).max(420),
  clusterPlacement: z.enum([
    "pillar_root",
    "existing_subcluster",
    "new_subcluster",
  ]),
  existingProfessorClusterId: z.string().uuid().nullable(),
  newSubclusterTitle: z.string().min(3).max(80).nullable(),
  action: z.enum(["create", "merge", "noop"]),
  mergeTargetId: z.string().uuid().nullable(),
  hasMaterialUpdate: z.boolean(),
});

type TopicDecision = z.infer<typeof topicDecisionSchema>;

const MINDMAP_TOPIC_SYSTEM = `You maintain the learner's Progress memory map after a message exchange with the AI CMO Professor.

## Topic node (always)
Pick ONE primary theme they are advancing (often what they opened with). Write recap as 2–4 sentences — durable substance, not a transcript.

Existing topic nodes — if the theme maps to one, action "merge" with mergeTargetId and recap must be FULL merged recap. hasMaterialUpdate false only when nothing substantive was added. action "create" for genuinely new themes. "noop" for empty small-talk only.

## Pillar anchors (six fixed umbrellas)
Choose anchorClusterId (where this lives):
- strategic_interests — ICP, positioning, demand, category, campaigns
- lifestyle_drivers — habits, deep work, training, recovery, tempo
- authority_themes — credibility, narrative leadership, exec presence
- brand_signals — voice, storytelling, visuals, taste, personal brand
- knowledge_assets — skills, frameworks, learning, analytical rigor
- career_direction — roles, trajectory, ambitions, transitions

Always fill anchorLinkNote: 1–3 sentences tying this topic (or subgroup) to that pillar AND to neighboring concepts already on their map list when helpful.

## Subclusters (professor-created groups inside a pillar)
clusterPlacement controls layout:
- pillar_root — theme belongs directly under the pillar (no named subgroup).
- existing_subcluster — pick existingProfessorClusterId from the subcluster list ONLY if that row's pillar equals anchorClusterId; otherwise pillar_root or new_subcluster.
- new_subcluster — when the conversation introduces a distinct recurring subgroup under that pillar; set newSubclusterTitle short and specific. Prefer existing_subcluster if a listed subcluster obviously matches.

Placement rules:
- pillar_root ⇒ existingProfessorClusterId and newSubclusterTitle MUST be null.
- existing_subcluster ⇒ existingProfessorClusterId required from list under that pillar; newSubclusterTitle null.
- new_subcluster ⇒ newSubclusterTitle required; existingProfessorClusterId null.`;

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  const d = Math.sqrt(na) * Math.sqrt(nb);
  return d === 0 ? 0 : dot / d;
}

function formatTranscript(
  lines: { role: string; content: string }[],
  maxChars: number,
): string {
  const slice = lines.slice(-10);
  const parts: string[] = [];
  let n = 0;
  for (const m of slice) {
    const line = `${m.role.toUpperCase()}: ${m.content}`;
    if (n + line.length > maxChars) break;
    parts.push(line);
    n += line.length + 2;
  }
  return parts.join("\n\n").slice(0, maxChars);
}

async function resolveProfessorClusterId(
  admin: SupabaseClient,
  userId: string,
  placement: TopicDecision["clusterPlacement"],
  anchorClusterId: string,
  existingId: string | null,
  newTitle: string | null,
  now: string,
): Promise<string | null> {
  if (placement === "pillar_root") return null;

  if (placement === "existing_subcluster") {
    const eid = existingId;
    if (!eid) return null;
    const { data } = await admin
      .from("professor_mindmap_clusters")
      .select("id, anchor_cluster_id")
      .eq("id", eid)
      .eq("user_id", userId)
      .maybeSingle();
    if (data?.anchor_cluster_id === anchorClusterId) return data.id;
    return null;
  }

  const title = (newTitle ?? "").trim();
  if (!title) return null;
  const slug = slugifyMindmapClusterTitle(title);
  const { data, error } = await admin
    .from("professor_mindmap_clusters")
    .upsert(
      {
        user_id: userId,
        slug,
        title,
        anchor_cluster_id: anchorClusterId,
        updated_at: now,
      },
      { onConflict: "user_id,slug" },
    )
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("professor_mindmap_clusters upsert", error);
    return null;
  }
  return data?.id ?? null;
}

function normalizeDecision(d: TopicDecision): TopicDecision {
  let clusterPlacement = d.clusterPlacement;
  let existingProfessorClusterId = d.existingProfessorClusterId;
  let newSubclusterTitle = d.newSubclusterTitle;

  if (clusterPlacement === "pillar_root") {
    existingProfessorClusterId = null;
    newSubclusterTitle = null;
  } else if (clusterPlacement === "existing_subcluster") {
    newSubclusterTitle = null;
  } else {
    existingProfessorClusterId = null;
  }

  return {
    ...d,
    clusterPlacement,
    existingProfessorClusterId,
    newSubclusterTitle,
  };
}

async function resolvedProfessorCluster(
  admin: SupabaseClient,
  userId: string,
  decision: TopicDecision,
  now: string,
): Promise<string | null> {
  let placement = decision.clusterPlacement;
  let cid = await resolveProfessorClusterId(
    admin,
    userId,
    placement,
    decision.anchorClusterId,
    decision.existingProfessorClusterId,
    decision.newSubclusterTitle,
    now,
  );

  if (placement !== "pillar_root" && cid == null) {
    placement = "pillar_root";
  }

  if (placement === "pillar_root") return null;
  return cid;
}

/** Best-effort; errors are swallowed by caller. */
export async function upsertProfessorMindmapTopic(
  userId: string,
  conversationId: string,
  conversationLines: { role: string; content: string }[],
): Promise<void> {
  if (!process.env.OPENAI_API_KEY) return;
  if (!conversationId || conversationLines.length === 0) return;

  const window = formatTranscript(conversationLines, 7000);
  if (window.length < 40) return;

  const admin = createServiceRoleClient();

  const [{ data: candidatesRaw }, { data: clustersRaw }] = await Promise.all([
    admin
      .from("professor_mindmap_topics")
      .select("id, title, recap")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(30),
    admin
      .from("professor_mindmap_clusters")
      .select("id, title, anchor_cluster_id")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(24),
  ]);

  const candidates = candidatesRaw ?? [];
  const clusters = clustersRaw ?? [];

  const pillarLabels = BRAINMAP_CLUSTER_IDS.map(
    (id) => `${id}: ${BRAINMAP_CLUSTER_DISPLAY[id]}`,
  ).join("\n");

  const candidateBlock =
    candidates.length > 0
      ? candidates.map((c) => `- topic id=${c.id} | ${c.title}`).join("\n")
      : "(No topic nodes yet.)";

  const clusterBlock =
    clusters.length > 0
      ? clusters
          .map(
            (c) =>
              `- subcluster id=${c.id} | title: ${c.title} | pillar: ${c.anchor_cluster_id} (${BRAINMAP_CLUSTER_DISPLAY[c.anchor_cluster_id as keyof typeof BRAINMAP_CLUSTER_DISPLAY] ?? c.anchor_cluster_id})`,
          )
          .join("\n")
      : "(No professor subclusters yet — you may create one with clusterPlacement=new_subcluster when the chat warrants a coherent subgroup.)";

  let raw: TopicDecision;
  try {
    const res = await generateObject({
      model: openaiProvider(CHAT_MODEL),
      schema: topicDecisionSchema,
      system: `${MINDMAP_TOPIC_SYSTEM}\n\nPillar display names:\n${pillarLabels}`,
      prompt: `Known topic nodes (mergeTargetId MUST be chosen only from topic ids):\n${candidateBlock}\n\nProfessor subclusters (existingProfessorClusterId MUST be chosen only from subcluster ids, and MUST match anchorClusterId):\n${clusterBlock}\n\nRecent conversation:\n\n${window}`,
      temperature: 0.25,
    });
    raw = res.object;
  } catch (e) {
    console.error("upsertProfessorMindmapTopic generateObject", e);
    return;
  }

  const decision = normalizeDecision(raw);

  if (decision.action === "noop") return;

  const now = new Date().toISOString();

  const buildPayload = async (overwriteEmbedding: boolean) => {
    let embeddingPayload: unknown = undefined;
    if (overwriteEmbedding) {
      const [emb] = await embedMany([
        `${decision.topicTitle}\n${decision.recap}`,
      ]);
      embeddingPayload = emb as unknown as string;
    }

    let professorClusterId = await resolvedProfessorCluster(
      admin,
      userId,
      decision,
      now,
    );

    const base = {
      title: decision.topicTitle,
      recap: decision.recap,
      cluster_id: decision.anchorClusterId,
      professor_cluster_id: professorClusterId,
      anchor_link_note: decision.anchorLinkNote,
      conversation_id: conversationId,
      updated_at: now,
      ...(embeddingPayload !== undefined && {
        embedding: embeddingPayload,
      }),
    };
    return base;
  };

  const tryForcedMerge = async (): Promise<boolean> => {
    if (candidates.length === 0) return false;
    const newText = `${decision.topicTitle}\n${decision.recap}`;
    const candTexts = candidates.map(
      (c) => `${c.title}\n${c.recap.slice(0, 500)}`,
    );
    try {
      const vectors = await embedMany([newText, ...candTexts]);
      const target = vectors[0];
      let bestIdx = -1;
      let bestSim = 0;
      for (let i = 0; i < candidates.length; i++) {
        const sim = cosineSimilarity(target, vectors[i + 1]!);
        if (sim > bestSim) {
          bestSim = sim;
          bestIdx = i;
        }
      }
      if (bestIdx >= 0 && bestSim >= 0.88) {
        const rowId = candidates[bestIdx]!.id;
        const payload = await buildPayload(true);
        await admin
          .from("professor_mindmap_topics")
          .update(payload)
          .eq("id", rowId)
          .eq("user_id", userId);
        return true;
      }
    } catch (e) {
      console.error("tryForcedMerge embedMany", e);
    }
    return false;
  };

  const insertTopic = async () => {
    const pid = await resolvedProfessorCluster(
      admin,
      userId,
      decision,
      now,
    );
    const [emb] = await embedMany([
      `${decision.topicTitle}\n${decision.recap}`,
    ]);
    const { error: insErr } = await admin.from("professor_mindmap_topics").insert({
      user_id: userId,
      conversation_id: conversationId,
      title: decision.topicTitle,
      recap: decision.recap,
      cluster_id: decision.anchorClusterId,
      professor_cluster_id: pid,
      anchor_link_note: decision.anchorLinkNote,
      embedding: emb as unknown as string,
      updated_at: now,
    });
    if (insErr) console.error("professor_mindmap_topics insert", insErr);
  };

  if (decision.action === "merge") {
    const tid = decision.mergeTargetId;
    const exists = tid && candidates.some((c) => c.id === tid);
    if (exists && tid) {
      if (!decision.hasMaterialUpdate) {
        await admin
          .from("professor_mindmap_topics")
          .update({
            conversation_id: conversationId,
            updated_at: now,
          })
          .eq("id", tid)
          .eq("user_id", userId);
        return;
      }
      const payload = await buildPayload(true);
      await admin
        .from("professor_mindmap_topics")
        .update(payload)
        .eq("id", tid)
        .eq("user_id", userId);
      return;
    }
    const forced = await tryForcedMerge();
    if (forced) return;
    await insertTopic();
    return;
  }

  if (decision.action === "create") {
    const forced = await tryForcedMerge();
    if (forced) return;
    await insertTopic();
  }
}
