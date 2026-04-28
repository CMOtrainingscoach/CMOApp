import { z } from "zod";
import { generateObject } from "ai";
import { openaiProvider, CHAT_MODEL } from "./openai";
import { embed, embedMany } from "./embeddings";
import { MEMORY_EXTRACTOR_SYSTEM } from "./prompts";
import { createServiceRoleClient } from "./supabase/server";
import type { MemoryKind } from "@/types/database";

const memorySchema = z.object({
  memories: z
    .array(
      z.object({
        kind: z.enum([
          "career_goal",
          "strength",
          "weakness",
          "reflection",
          "decision",
          "insight",
          "preference",
          "ambition",
        ]),
        content: z.string().min(8).max(280),
      }),
    )
    .max(5),
});

export async function extractAndStoreMemories(
  userId: string,
  conversation: { role: string; content: string }[],
  sourceMsgId?: string,
) {
  if (!process.env.OPENAI_API_KEY) return;
  if (conversation.length === 0) return;
  const window = conversation
    .slice(-6)
    .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
    .join("\n\n")
    .slice(0, 6000);

  let extracted: z.infer<typeof memorySchema>;
  try {
    const { object } = await generateObject({
      model: openaiProvider(CHAT_MODEL),
      schema: memorySchema,
      system: MEMORY_EXTRACTOR_SYSTEM,
      prompt: `Recent conversation:\n\n${window}\n\nExtract durable memories (or return an empty list).`,
      temperature: 0.2,
    });
    extracted = object;
  } catch (e) {
    console.error("extractMemories failed", e);
    return;
  }
  if (extracted.memories.length === 0) return;

  try {
    const embeddings = await embedMany(extracted.memories.map((m) => m.content));
    const supabase = createServiceRoleClient();
    const rows = extracted.memories.map((m, i) => ({
      user_id: userId,
      kind: m.kind as MemoryKind,
      content: m.content,
      embedding: embeddings[i] as unknown as string,
      source_msg_id: sourceMsgId ?? null,
    }));
    await supabase.from("memories").insert(rows);
  } catch (e) {
    console.error("store memories failed", e);
  }
}

export type RetrievedContext = {
  memories: { content: string; similarity: number }[];
  documents: { content: string; similarity: number }[];
};

export async function retrieveContext(
  userId: string,
  query: string,
  matchCount = 8,
): Promise<RetrievedContext> {
  if (!process.env.OPENAI_API_KEY) {
    return { memories: [], documents: [] };
  }
  try {
    const queryEmbedding = await embed(query);
    const supabase = createServiceRoleClient();
    const { data, error } = await supabase.rpc("match_user_context", {
      p_user_id: userId,
      p_query_embedding: queryEmbedding as unknown as number[],
      p_match_count: matchCount,
    });
    if (error || !data) return { memories: [], documents: [] };

    type Row = { source: string; content: string; similarity: number };
    const rows = data as Row[];
    const memories = rows
      .filter((r) => r.source === "memory")
      .map((r) => ({ content: r.content, similarity: r.similarity }));
    const documents = rows
      .filter((r) => r.source === "document")
      .map((r) => ({ content: r.content, similarity: r.similarity }));
    return { memories, documents };
  } catch (e) {
    console.error("retrieveContext failed", e);
    return { memories: [], documents: [] };
  }
}

export function renderRetrievedContext(ctx: RetrievedContext): string {
  const parts: string[] = [];
  if (ctx.memories.length) {
    parts.push(
      "Relevant durable memories about this user:\n" +
        ctx.memories.map((m, i) => `[M${i + 1}] ${m.content}`).join("\n"),
    );
  }
  if (ctx.documents.length) {
    parts.push(
      "Relevant excerpts from the user's uploaded documents:\n" +
        ctx.documents
          .map((d, i) => `[D${i + 1}] ${d.content.slice(0, 600)}`)
          .join("\n\n"),
    );
  }
  if (parts.length === 0) return "No prior context yet.";
  return parts.join("\n\n");
}
