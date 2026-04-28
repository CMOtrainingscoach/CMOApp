"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { TRAIT_PRESETS, RESPONSE_LENGTH_OPTIONS, LANGUAGE_OPTIONS } from "@/lib/professor-config";

const responseLengthEnum = z.enum(
  RESPONSE_LENGTH_OPTIONS.map((o) => o.value) as [string, ...string[]],
);
const languageEnum = z.enum(
  LANGUAGE_OPTIONS.map((o) => o.value) as [string, ...string[]],
);

const settingsSchema = z.object({
  professor_name: z.string().min(1).max(80),
  professor_persona: z.string().min(8).max(2000),
  professor_traits: z.array(z.string().min(2).max(40)).max(12),
  professor_response_length: responseLengthEnum,
  professor_language: languageEnum,
  professor_extra_notes: z
    .string()
    .max(2000)
    .nullable()
    .optional()
    .transform((v) => (v && v.trim().length > 0 ? v : null)),
  professor_system_prompt_override: z
    .string()
    .max(8000)
    .nullable()
    .optional()
    .transform((v) => (v && v.trim().length > 0 ? v : null)),
});

export type ProfessorSettingsInput = z.input<typeof settingsSchema>;

export async function saveProfessorSettings(input: ProfessorSettingsInput) {
  const user = await requireAdmin();
  const parsed = settingsSchema.parse(input);
  const admin = createServiceRoleClient();

  // Filter unknown traits to the known preset list to avoid free-text bloat.
  const traits = parsed.professor_traits.filter((t) =>
    (TRAIT_PRESETS as readonly string[]).includes(t),
  );

  const { error } = await admin
    .from("app_settings")
    .upsert(
      {
        id: 1,
        ...parsed,
        professor_traits: traits.length > 0 ? traits : ["direct", "strategic"],
        updated_at: new Date().toISOString(),
        updated_by: user.id,
      },
      { onConflict: "id" },
    );
  if (error) throw new Error("Save failed: " + error.message);

  revalidatePath("/admin");
  revalidatePath("/dashboard");
  revalidatePath("/professor");
}

const MAX_AVATAR_BYTES = 2 * 1024 * 1024;
const ALLOWED_AVATAR_MIMES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

export async function uploadProfessorAvatar(
  formData: FormData,
): Promise<{ url: string }> {
  const user = await requireAdmin();
  const file = formData.get("file");
  if (!(file instanceof File))
    throw new Error("No file provided.");
  if (file.size > MAX_AVATAR_BYTES)
    throw new Error("Image too large (max 2 MB).");
  if (!ALLOWED_AVATAR_MIMES.has(file.type))
    throw new Error("Unsupported image format. Use JPEG, PNG, or WebP.");

  const ext =
    file.type === "image/jpeg"
      ? "jpg"
      : file.type === "image/png"
        ? "png"
        : "webp";
  const path = `professor/avatar_${Date.now()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const admin = createServiceRoleClient();
  const { error: uploadError } = await admin.storage
    .from("cmo-public")
    .upload(path, buffer, {
      contentType: file.type,
      cacheControl: "3600",
      upsert: true,
    });
  if (uploadError)
    throw new Error("Upload failed: " + uploadError.message);

  const { data: pub } = admin.storage.from("cmo-public").getPublicUrl(path);
  const publicUrl = pub.publicUrl;

  const { error: updateError } = await admin
    .from("app_settings")
    .update({
      professor_avatar_url: publicUrl,
      updated_at: new Date().toISOString(),
      updated_by: user.id,
    })
    .eq("id", 1);
  if (updateError)
    throw new Error("Profile update failed: " + updateError.message);

  revalidatePath("/admin");
  revalidatePath("/dashboard");
  revalidatePath("/professor");

  return { url: publicUrl };
}

export async function clearProfessorAvatar() {
  const user = await requireAdmin();
  const admin = createServiceRoleClient();
  await admin
    .from("app_settings")
    .update({
      professor_avatar_url: null,
      updated_at: new Date().toISOString(),
      updated_by: user.id,
    })
    .eq("id", 1);

  revalidatePath("/admin");
  revalidatePath("/dashboard");
  revalidatePath("/professor");
}
