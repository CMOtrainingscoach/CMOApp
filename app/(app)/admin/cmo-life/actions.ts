"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin";
import { createServiceRoleClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

type MilestoneRow = Database["public"]["Tables"]["cmo_life_milestones"]["Row"];

const uuid = z.string().uuid();

const milestoneWriteSchema = z
  .object({
    id: z.string().uuid().optional(),
    title: z.string().min(1).max(240),
    description: z.string().max(12000).nullable().optional(),
    milestone_kind: z.enum(["lesson", "custom"]),
    lesson_id: z.string().uuid().nullable().optional(),
    custom_detail: z.string().max(12000).nullable().optional(),
    reward_text: z.string().max(12000).nullable().optional(),
    is_active: z.boolean().optional(),
  })
  .superRefine((val, ctx) => {
    if (val.milestone_kind === "lesson" && !val.lesson_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Lesson milestones require a lesson.",
        path: ["lesson_id"],
      });
    }
    if (val.milestone_kind === "custom" && val.lesson_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Custom milestones cannot reference a lesson.",
        path: ["lesson_id"],
      });
    }
  });

async function nextSortOrder(
  admin: ReturnType<typeof createServiceRoleClient>,
): Promise<number> {
  const { data: maxRow } = await admin
    .from("cmo_life_milestones")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  return ((maxRow as { sort_order: number } | null)?.sort_order ?? 0) + 1;
}

export async function createCmoLifeMilestone(
  input: z.infer<typeof milestoneWriteSchema>,
) {
  await requireAdmin();
  const parsed = milestoneWriteSchema.parse(input);
  const admin = createServiceRoleClient();
  const sort_order = await nextSortOrder(admin);

  const row: Database["public"]["Tables"]["cmo_life_milestones"]["Insert"] = {
    sort_order,
    title: parsed.title,
    description: parsed.description ?? null,
    milestone_kind: parsed.milestone_kind,
    lesson_id:
      parsed.milestone_kind === "lesson" ? (parsed.lesson_id ?? null) : null,
    custom_detail: parsed.custom_detail ?? null,
    reward_text: parsed.reward_text ?? null,
    reward_image_url: null,
    is_active: parsed.is_active ?? true,
  };

  const { error } = await admin.from("cmo_life_milestones").insert(row);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/cmo-life");
  revalidatePath("/progress");
}

export async function updateCmoLifeMilestone(
  input: z.infer<typeof milestoneWriteSchema> & { id: string },
) {
  await requireAdmin();
  const parsed = milestoneWriteSchema.parse(input);
  const id = uuid.parse(input.id);
  const admin = createServiceRoleClient();

  const patch: Database["public"]["Tables"]["cmo_life_milestones"]["Update"] = {
    title: parsed.title,
    description: parsed.description ?? null,
    milestone_kind: parsed.milestone_kind,
    lesson_id:
      parsed.milestone_kind === "lesson" ? (parsed.lesson_id ?? null) : null,
    custom_detail: parsed.custom_detail ?? null,
    reward_text: parsed.reward_text ?? null,
    updated_at: new Date().toISOString(),
  };
  if (parsed.is_active !== undefined) patch.is_active = parsed.is_active;

  const { error } = await admin
    .from("cmo_life_milestones")
    .update(patch)
    .eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/cmo-life");
  revalidatePath("/progress");
}

export async function deleteCmoLifeMilestone(milestoneIdRaw: string) {
  await requireAdmin();
  const id = uuid.parse(milestoneIdRaw);
  const admin = createServiceRoleClient();
  const { error } = await admin.from("cmo_life_milestones").delete().eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/cmo-life");
  revalidatePath("/progress");
}

export async function moveCmoLifeMilestone(
  milestoneIdRaw: string,
  direction: "up" | "down",
) {
  await requireAdmin();
  const id = uuid.parse(milestoneIdRaw);
  const admin = createServiceRoleClient();

  const { data: all, error: listError } = await admin
    .from("cmo_life_milestones")
    .select("id, sort_order")
    .order("sort_order", { ascending: true });

  if (listError || !all?.length) throw new Error("Could not load milestones.");

  const ordered = all as Pick<MilestoneRow, "id" | "sort_order">[];
  const idx = ordered.findIndex((r) => r.id === id);
  if (idx < 0) throw new Error("Milestone not found.");
  const swapWith = direction === "up" ? idx - 1 : idx + 1;
  if (swapWith < 0 || swapWith >= ordered.length) return;

  const a = ordered[idx]!;
  const b = ordered[swapWith]!;
  const { error: e1 } = await admin
    .from("cmo_life_milestones")
    .update({ sort_order: b.sort_order, updated_at: new Date().toISOString() })
    .eq("id", a.id);
  if (e1) throw new Error(e1.message);
  const { error: e2 } = await admin
    .from("cmo_life_milestones")
    .update({ sort_order: a.sort_order, updated_at: new Date().toISOString() })
    .eq("id", b.id);
  if (e2) throw new Error(e2.message);

  revalidatePath("/admin/cmo-life");
  revalidatePath("/progress");
}

const MAX_REWARD_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_REWARD_MIMES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

export async function uploadCmoLifeMilestoneRewardImage(
  formData: FormData,
): Promise<{ url: string }> {
  await requireAdmin();
  const milestoneId = uuid.parse(String(formData.get("milestone_id") ?? ""));
  const file = formData.get("file");
  if (!(file instanceof File)) throw new Error("No file provided.");
  if (file.size > MAX_REWARD_IMAGE_BYTES)
    throw new Error("Image too large (max 5 MB).");
  if (!ALLOWED_REWARD_MIMES.has(file.type))
    throw new Error("Unsupported image format. Use JPEG, PNG, or WebP.");

  const ext =
    file.type === "image/jpeg"
      ? "jpg"
      : file.type === "image/png"
        ? "png"
        : "webp";
  const path = `cmo-life/milestones/${milestoneId}/reward_${Date.now()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const admin = createServiceRoleClient();
  const { error: uploadError } = await admin.storage
    .from("cmo-public")
    .upload(path, buffer, {
      contentType: file.type,
      cacheControl: "3600",
      upsert: true,
    });
  if (uploadError) throw new Error("Upload failed: " + uploadError.message);

  const { data: pub } = admin.storage.from("cmo-public").getPublicUrl(path);
  const publicUrl = pub.publicUrl;

  const { error: updateError } = await admin
    .from("cmo_life_milestones")
    .update({
      reward_image_url: publicUrl,
      updated_at: new Date().toISOString(),
    })
    .eq("id", milestoneId);
  if (updateError)
    throw new Error("Milestone update failed: " + updateError.message);

  revalidatePath("/admin/cmo-life");
  revalidatePath("/progress");

  return { url: publicUrl };
}

export async function clearCmoLifeMilestoneRewardImage(milestoneIdRaw: string) {
  await requireAdmin();
  const milestoneId = uuid.parse(milestoneIdRaw);
  const admin = createServiceRoleClient();
  const { error } = await admin
    .from("cmo_life_milestones")
    .update({
      reward_image_url: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", milestoneId);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/cmo-life");
  revalidatePath("/progress");
}

export async function adminSetCmoLifeMilestoneForUser(
  targetUserIdRaw: string,
  milestoneIdRaw: string,
  completed: boolean,
) {
  await requireAdmin();
  const targetUserId = uuid.parse(targetUserIdRaw);
  const milestoneId = uuid.parse(milestoneIdRaw);
  const admin = createServiceRoleClient();

  if (completed) {
    const { error } = await admin.from("user_cmo_life_milestone_progress").upsert(
      {
        user_id: targetUserId,
        milestone_id: milestoneId,
        completed_at: new Date().toISOString(),
        completion_source: "admin",
      },
      { onConflict: "user_id,milestone_id" },
    );
    if (error) throw new Error(error.message);
  } else {
    const { error } = await admin
      .from("user_cmo_life_milestone_progress")
      .delete()
      .eq("user_id", targetUserId)
      .eq("milestone_id", milestoneId);
    if (error) throw new Error(error.message);
  }

  revalidatePath("/progress");
  revalidatePath("/admin/cmo-life");
}

export type CmoLifeLessonSearchHit = {
  id: string;
  title: string;
  moduleId: string;
  moduleTitle: string;
  trackTitle: string;
  trackSlug: string;
  lab_slug: string;
};

export async function searchCmoLifeLessons(
  query: string,
): Promise<CmoLifeLessonSearchHit[]> {
  await requireAdmin();
  const q = query.trim();
  if (q.length < 2) return [];

  const pattern = `%${q.replace(/%/g, "").replace(/_/g, "")}%`;
  if (pattern === "%%") return [];

  const admin = createServiceRoleClient();
  const { data, error } = await admin
    .from("strategy_lessons")
    .select(
      `
      id,
      title,
      strategy_modules!inner (
        id,
        title,
        strategy_tracks!inner ( title, slug, lab_slug )
      )
    `,
    )
    .ilike("title", pattern)
    .order("title", { ascending: true })
    .limit(24);

  if (error) throw new Error(error.message);

  type Row = {
    id: string;
    title: string;
    strategy_modules: {
      id: string;
      title: string;
      strategy_tracks: { title: string; slug: string; lab_slug: string };
    };
  };

  return ((data ?? []) as unknown as Row[]).map((r) => ({
    id: r.id,
    title: r.title,
    moduleId: r.strategy_modules.id,
    moduleTitle: r.strategy_modules.title,
    trackTitle: r.strategy_modules.strategy_tracks.title,
    trackSlug: r.strategy_modules.strategy_tracks.slug,
    lab_slug: r.strategy_modules.strategy_tracks.lab_slug,
  }));
}
