import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

const MAX_CHARS = 12000;

function collapseWs(s: string): string {
  return s
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Load CV text from a ready document: chunk bodies first, else summary + key_insights.
 */
export async function loadResumeTextForCareer(
  admin: SupabaseClient<Database>,
  userId: string,
  documentId: string,
): Promise<{ text: string; title: string } | null> {
  const { data: doc, error } = await admin
    .from("documents")
    .select("id,user_id,title,status,summary,key_insights")
    .eq("id", documentId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error || !doc || doc.status !== "ready") return null;

  const { data: chunks } = await admin
    .from("document_chunks")
    .select("content,chunk_index")
    .eq("document_id", documentId)
    .order("chunk_index", { ascending: true });

  let text = "";
  if (chunks && chunks.length > 0) {
    const parts = chunks.map((c) => c.content.trim()).filter(Boolean);
    text = parts.join("\n\n");
  }

  if (!text.trim()) {
    const insights = doc.key_insights;
    let insightLines = "";
    if (insights != null && Array.isArray(insights)) {
      insightLines = (insights as string[]).join("\n- ");
      if (insightLines) insightLines = "- " + insightLines;
    }
    text = [
      doc.summary?.trim() ?? "",
      insightLines ? `Key insights:\n${insightLines}` : "",
    ]
      .filter(Boolean)
      .join("\n\n");
  }

  if (!text.trim()) return null;
  if (text.length > MAX_CHARS) text = text.slice(0, MAX_CHARS);
  return { text, title: doc.title };
}

/** Loose check: quote must appear in resume text (handles minor whitespace drift). */
export function resumeQuoteIsVerbatim(
  resumeText: string,
  quote: string,
): boolean {
  const a = collapseWs(resumeText).toLowerCase();
  const b = collapseWs(quote).toLowerCase();
  if (!b.length) return false;
  return a.includes(b);
}
