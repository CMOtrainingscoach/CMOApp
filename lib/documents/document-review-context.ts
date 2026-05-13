import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

export type ReviewContextDoc = Pick<
  Database["public"]["Tables"]["documents"]["Row"],
  | "id"
  | "user_id"
  | "title"
  | "status"
  | "summary"
  | "key_insights"
  | "mime_type"
>;

/** Compact text bundle for reviewer prompts — summary, insights, ordered chunk excerpts. */
export async function buildDocumentReviewContextBlock(
  admin: SupabaseClient<Database>,
  documentId: string,
  userId: string,
  maxSnippetChars = 12000,
): Promise<{ doc: ReviewContextDoc; contextBlock: string } | null> {
  const { data: doc, error } = await admin
    .from("documents")
    .select("id, user_id, title, status, summary, key_insights, mime_type")
    .eq("id", documentId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error || !doc) return null;
  if (doc.status !== "ready") return null;

  const { data: chunks } = await admin
    .from("document_chunks")
    .select("chunk_index, content")
    .eq("document_id", documentId)
    .order("chunk_index", { ascending: true });

  let excerpt = "";
  for (const row of chunks ?? []) {
    if (excerpt.length >= maxSnippetChars) break;
    const piece = row.content.trim();
    if (!piece) continue;
    excerpt +=
      excerpt.length > 0 ? `\n\n${piece}` : piece;
    excerpt = excerpt.slice(0, maxSnippetChars);
  }

  let insightsLines = "(none)";
  if (doc.key_insights != null && Array.isArray(doc.key_insights)) {
    const list = doc.key_insights as string[];
    if (list.length > 0) insightsLines = list.map((s) => `- ${s}`).join("\n");
  }

  const contextBlock =
    `Title: ${doc.title}\n` +
    `Mime: ${doc.mime_type}\n\n` +
    `Summary:\n${doc.summary ?? "(none)"}\n\n` +
    `Key insights:\n${insightsLines}\n\n` +
    `Excerpt (ordered chunks; includes OCR / vision-derived text when applicable):\n` +
    (excerpt || "(No chunk text indexed — rely on summary and insights.)");

  return { doc, contextBlock };
}
