import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { careerListingUrlKey } from "@/lib/career/belgium-job-scan";

const upsertSchema = z.object({
  listing_url: z.string().url(),
  title: z.string().min(1).max(600),
  source_domain: z.string().max(200).optional().nullable(),
  posted_at: z.string().max(80).optional().nullable(),
  listing_snippet: z.string().max(4000).optional().nullable(),
  resume_quote: z.string().max(600).optional().nullable(),
  stars: z.number().int().min(1).max(5),
  professor_feedback: z.string().max(2000).optional().nullable(),
});

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = upsertSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_body", detail: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const b = parsed.data;
  const urlKey = careerListingUrlKey(b.listing_url);

  let postedIso: string | null = null;
  if (b.posted_at) {
    const t = Date.parse(b.posted_at);
    if (Number.isFinite(t)) postedIso = new Date(t).toISOString();
  }

  const now = new Date().toISOString();
  const { data: existing } = await supabase
    .from("career_saved_jobs")
    .select("id")
    .eq("user_id", user.id)
    .eq("url_key", urlKey)
    .maybeSingle();

  if (existing?.id) {
    const { error } = await supabase
      .from("career_saved_jobs")
      .update({
        listing_url: b.listing_url,
        title: b.title,
        source_domain: b.source_domain?.trim() || null,
        posted_at: postedIso,
        listing_snippet: b.listing_snippet?.trim() || null,
        resume_quote: b.resume_quote?.trim() || null,
        stars: b.stars,
        professor_feedback: b.professor_feedback?.trim() || null,
        updated_at: now,
      })
      .eq("id", existing.id)
      .eq("user_id", user.id);
    if (error) {
      console.error("career_saved_jobs update failed", error);
      return NextResponse.json(
        { error: "save_failed", message: error.message },
        { status: 500 },
      );
    }
    return NextResponse.json({ id: existing.id });
  }

  const { data: inserted, error } = await supabase
    .from("career_saved_jobs")
    .insert({
      user_id: user.id,
      listing_url: b.listing_url,
      url_key: urlKey,
      title: b.title,
      source_domain: b.source_domain?.trim() || null,
      posted_at: postedIso,
      listing_snippet: b.listing_snippet?.trim() || null,
      resume_quote: b.resume_quote?.trim() || null,
      stars: b.stars,
      professor_feedback: b.professor_feedback?.trim() || null,
    })
    .select("id")
    .single();

  if (error) {
    console.error("career_saved_jobs upsert failed", error);
    return NextResponse.json(
      { error: "save_failed", message: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ id: inserted.id });
}

export async function DELETE(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const id = new URL(req.url).searchParams.get("id");
  if (!id || !z.string().uuid().safeParse(id).success) {
    return NextResponse.json({ error: "invalid_id" }, { status: 400 });
  }

  const { error } = await supabase
    .from("career_saved_jobs")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    console.error("career_saved_jobs delete failed", error);
    return NextResponse.json(
      { error: "delete_failed", message: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
