import { NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";

export const maxDuration = 60;

const MAX_BYTES = 25 * 1024 * 1024;
const ALLOWED = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.ms-powerpoint",
  "text/csv",
  "text/plain",
  "text/markdown",
];

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const form = await req.formData();
  const file = form.get("file") as File | null;
  if (!file)
    return NextResponse.json({ error: "no file" }, { status: 400 });
  if (file.size > MAX_BYTES)
    return NextResponse.json(
      { error: `file too large (max ${MAX_BYTES / 1024 / 1024}MB)` },
      { status: 413 },
    );
  if (!ALLOWED.includes(file.type) && file.type !== "")
    return NextResponse.json(
      { error: `unsupported mime ${file.type}` },
      { status: 415 },
    );

  const buffer = Buffer.from(await file.arrayBuffer());
  const safeName = file.name.replace(/[^\w.\-]/g, "_");
  const path = `${user.id}/${Date.now()}_${safeName}`;

  const admin = createServiceRoleClient();
  const { error: uploadError } = await admin.storage
    .from("cmo-docs")
    .upload(path, buffer, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });
  if (uploadError) {
    return NextResponse.json(
      { error: "upload failed: " + uploadError.message },
      { status: 500 },
    );
  }

  const { data: doc, error: insertError } = await admin
    .from("documents")
    .insert({
      user_id: user.id,
      title: file.name,
      file_path: path,
      mime_type: file.type || "application/octet-stream",
      size: file.size,
      status: "uploaded",
    })
    .select("id")
    .single();
  if (insertError || !doc) {
    return NextResponse.json(
      { error: "db insert failed: " + (insertError?.message ?? "unknown") },
      { status: 500 },
    );
  }

  // Kick off processing async (don't await), but we'll await below to keep simple/MVP-clear
  const proto = req.headers.get("x-forwarded-proto") ?? "http";
  const host = req.headers.get("host");
  const cookie = req.headers.get("cookie") ?? "";
  if (host) {
    fetch(`${proto}://${host}/api/documents/process`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie,
      },
      body: JSON.stringify({ documentId: doc.id }),
    }).catch((e) => console.error("trigger process failed", e));
  }

  return NextResponse.json({ documentId: doc.id });
}
