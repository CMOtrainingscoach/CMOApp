import { NextResponse } from "next/server";
import { z } from "zod";
import { generateObject } from "ai";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { parseDocument } from "@/lib/parsers";
import { approxTokens, chunkText, embedMany } from "@/lib/embeddings";
import { openaiProvider, CHAT_MODEL } from "@/lib/openai";

export const maxDuration = 120;

const summarySchema = z.object({
  summary: z.string().min(40).max(600),
  key_insights: z.array(z.string().min(8).max(200)).max(6),
});

const bodySchema = z.object({ documentId: z.string().uuid() });

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const { documentId } = bodySchema.parse(await req.json());
  const admin = createServiceRoleClient();

  const { data: doc } = await admin
    .from("documents")
    .select("*")
    .eq("id", documentId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!doc)
    return NextResponse.json({ error: "document not found" }, { status: 404 });

  await admin
    .from("documents")
    .update({ status: "processing" })
    .eq("id", doc.id);

  try {
    const { data: blob, error: dlErr } = await admin.storage
      .from("cmo-docs")
      .download(doc.file_path);
    if (dlErr || !blob) throw new Error(dlErr?.message ?? "download failed");
    const buf = Buffer.from(await blob.arrayBuffer());
    const text = await parseDocument(buf, doc.mime_type, doc.title);

    if (!text.trim()) {
      await admin
        .from("documents")
        .update({
          status: "ready",
          summary: "No extractable text found in this file.",
          key_insights: [],
        })
        .eq("id", doc.id);
      return NextResponse.json({ ok: true, chunks: 0 });
    }

    // Chunk + embed
    const chunks = chunkText(text);
    if (chunks.length > 0 && process.env.OPENAI_API_KEY) {
      const embeddings = await embedMany(chunks);
      const rows = chunks.map((content, i) => ({
        document_id: doc.id,
        user_id: user.id,
        chunk_index: i,
        content,
        tokens: approxTokens(content),
        embedding: embeddings[i] as unknown as string,
      }));
      // Insert in batches of 100
      for (let i = 0; i < rows.length; i += 100) {
        const slice = rows.slice(i, i + 100);
        const { error } = await admin.from("document_chunks").insert(slice);
        if (error) throw error;
      }
    }

    // Summarize
    let summary = `${doc.title} ingested.`;
    let keyInsights: string[] = [];
    if (process.env.OPENAI_API_KEY) {
      try {
        const { object } = await generateObject({
          model: openaiProvider(CHAT_MODEL),
          schema: summarySchema,
          system:
            "You are a CMO Professor. Summarize this document in plain English for a marketing executive. Then list the 3-6 most important strategic insights. Be specific. Use numbers where possible.",
          prompt: `Document title: ${doc.title}\n\nContent (first 12000 chars):\n${text.slice(0, 12000)}`,
          temperature: 0.3,
        });
        summary = object.summary;
        keyInsights = object.key_insights;
      } catch (e) {
        console.error("summary failed", e);
      }
    }

    await admin
      .from("documents")
      .update({
        status: "ready",
        summary,
        key_insights: keyInsights,
      })
      .eq("id", doc.id);

    return NextResponse.json({ ok: true, chunks: chunks.length });
  } catch (e) {
    console.error("process failed", e);
    await admin
      .from("documents")
      .update({
        status: "failed",
        summary: `Processing failed: ${(e as Error).message}`,
      })
      .eq("id", doc.id);
    return NextResponse.json(
      { error: (e as Error).message },
      { status: 500 },
    );
  }
}
