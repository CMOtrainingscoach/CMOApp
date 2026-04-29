"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { clearTheoryCache } from "@/lib/strategy/theory";
import { clearMinigame } from "@/lib/strategy/minigame";

const moduleSchema = z
  .object({
    id: z.string().uuid().optional(),
    track_id: z.string().uuid().optional(),
    ord: z.number().int().min(0).max(50),
    title: z.string().min(2).max(200),
    summary: z.string().max(2000).nullable().optional(),
    description: z.string().max(100_000).nullable().optional(),
    xp_reward: z.number().int().min(0).max(2000).default(150),
  })
  .superRefine((data, ctx) => {
    if (!data.id && !data.track_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "track_id is required when creating a module",
        path: ["track_id"],
      });
    }
  });

export async function upsertModule(input: z.input<typeof moduleSchema>) {
  await requireAdmin();
  const parsed = moduleSchema.parse(input);
  const admin = createServiceRoleClient();
  if (parsed.id) {
    await admin
      .from("strategy_modules")
      .update({
        ord: parsed.ord,
        title: parsed.title,
        summary: parsed.summary ?? null,
        description: parsed.description ?? null,
        xp_reward: parsed.xp_reward,
      })
      .eq("id", parsed.id);
  } else {
    const tid = parsed.track_id;
    if (!tid) {
      throw new Error("track_id required when creating a strategy module.");
    }
    await admin.from("strategy_modules").insert({
      track_id: tid,
      ord: parsed.ord,
      title: parsed.title,
      summary: parsed.summary ?? null,
      description: parsed.description ?? null,
      xp_reward: parsed.xp_reward,
    });
  }
  revalidatePath("/admin/strategy");
}

export async function deleteModule(moduleId: string) {
  await requireAdmin();
  const admin = createServiceRoleClient();
  await admin.from("strategy_modules").delete().eq("id", moduleId);
  revalidatePath("/admin/strategy");
}

const lessonSchema = z.object({
  id: z.string().uuid().optional(),
  module_id: z.string().uuid(),
  ord: z.number().int().min(0).max(50),
  title: z.string().min(2).max(160),
  learning_objective: z.string().max(8000).nullable().optional(),
  key_points: z.array(z.string().min(2).max(2000)).max(40),
  estimated_minutes: z.number().int().min(1).max(120).default(8),
  xp_reward: z.number().int().min(0).max(500).default(50),
});

export async function upsertLesson(input: z.input<typeof lessonSchema>) {
  await requireAdmin();
  const parsed = lessonSchema.parse(input);
  const admin = createServiceRoleClient();
  if (parsed.id) {
    await admin
      .from("strategy_lessons")
      .update({
        ord: parsed.ord,
        title: parsed.title,
        learning_objective: parsed.learning_objective ?? null,
        key_points: parsed.key_points,
        estimated_minutes: parsed.estimated_minutes,
        xp_reward: parsed.xp_reward,
      })
      .eq("id", parsed.id);
  } else {
    await admin.from("strategy_lessons").insert({
      module_id: parsed.module_id,
      ord: parsed.ord,
      title: parsed.title,
      learning_objective: parsed.learning_objective ?? null,
      key_points: parsed.key_points,
      estimated_minutes: parsed.estimated_minutes,
      xp_reward: parsed.xp_reward,
    });
  }
  revalidatePath("/admin/strategy");
}

export async function deleteLesson(lessonId: string) {
  await requireAdmin();
  const admin = createServiceRoleClient();
  await admin.from("strategy_lessons").delete().eq("id", lessonId);
  revalidatePath("/admin/strategy");
}

export async function regenerateLessonCaches(lessonId: string) {
  await requireAdmin();
  // Clear theory cache for ALL users + clear minigame
  await clearTheoryCache({ lessonId });
  await clearMinigame(lessonId);
  revalidatePath("/admin/strategy");
}

const assignmentSchema = z.object({
  id: z.string().uuid().optional(),
  module_id: z.string().uuid(),
  title: z.string().min(2).max(200),
  prompt: z.string().min(10).max(100_000),
  rubric: z.record(z.string(), z.string().max(8000)),
  success_criteria: z.array(z.string().min(2).max(2000)).max(30),
  max_score: z.number().int().min(10).max(1000).default(100),
});

export async function upsertAssignment(
  input: z.input<typeof assignmentSchema>,
) {
  await requireAdmin();
  const parsed = assignmentSchema.parse(input);
  const admin = createServiceRoleClient();
  if (parsed.id) {
    await admin
      .from("module_assignments")
      .update({
        title: parsed.title,
        prompt: parsed.prompt,
        rubric: parsed.rubric,
        success_criteria: parsed.success_criteria,
        max_score: parsed.max_score,
      })
      .eq("id", parsed.id);
  } else {
    await admin.from("module_assignments").insert({
      module_id: parsed.module_id,
      title: parsed.title,
      prompt: parsed.prompt,
      rubric: parsed.rubric,
      success_criteria: parsed.success_criteria,
      max_score: parsed.max_score,
    });
  }
  revalidatePath("/admin/strategy");
}

const rewardSchema = z.object({
  id: z.string().uuid().optional(),
  module_id: z.string().uuid(),
  ord: z.number().int().min(0).max(20).default(0),
  kind: z.enum(["letter", "template", "video", "quote_card"]),
  title: z.string().min(2).max(200),
  description: z.string().max(16_000).nullable().optional(),
  content: z.record(z.string(), z.unknown()),
});

export async function upsertReward(input: z.input<typeof rewardSchema>) {
  await requireAdmin();
  const parsed = rewardSchema.parse(input);
  const admin = createServiceRoleClient();
  if (parsed.id) {
    await admin
      .from("module_rewards")
      .update({
        ord: parsed.ord,
        kind: parsed.kind,
        title: parsed.title,
        description: parsed.description ?? null,
        content: parsed.content,
      })
      .eq("id", parsed.id);
  } else {
    await admin.from("module_rewards").insert({
      module_id: parsed.module_id,
      ord: parsed.ord,
      kind: parsed.kind,
      title: parsed.title,
      description: parsed.description ?? null,
      content: parsed.content,
    });
  }
  revalidatePath("/admin/strategy");
}

export async function deleteReward(rewardId: string) {
  await requireAdmin();
  const admin = createServiceRoleClient();
  await admin.from("module_rewards").delete().eq("id", rewardId);
  revalidatePath("/admin/strategy");
}

// =====================================================================
// Lesson hero image (Professor portrait per lesson, public storage)
// =====================================================================

const MAX_HERO_BYTES = 3 * 1024 * 1024;
const ALLOWED_HERO_MIMES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

/** Uploads to cmo-public/strategy-lessons/{lessonId}/... and saves public URL on the lesson row. */
export async function uploadLessonHeroImage(
  formData: FormData,
): Promise<{ url: string }> {
  await requireAdmin();
  const lessonId = formData.get("lesson_id");
  const file = formData.get("file");
  if (
    typeof lessonId !== "string" ||
    !z.string().uuid().safeParse(lessonId).success
  ) {
    throw new Error("Invalid lesson_id.");
  }
  if (!(file instanceof File)) throw new Error("No file provided.");
  if (file.size > MAX_HERO_BYTES)
    throw new Error("Image too large (max 3 MB).");
  if (!ALLOWED_HERO_MIMES.has(file.type))
    throw new Error("Unsupported format. Use JPEG, PNG, or WebP.");

  const ext =
    file.type === "image/jpeg"
      ? "jpg"
      : file.type === "image/png"
        ? "png"
        : "webp";
  const path = `strategy-lessons/${lessonId}/hero_${Date.now()}.${ext}`;
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
    .from("strategy_lessons")
    .update({ hero_image_url: publicUrl })
    .eq("id", lessonId);
  if (updateError)
    throw new Error("Could not attach image to lesson: " + updateError.message);

  revalidatePath("/admin/strategy");
  revalidatePath("/strategy-lab", "layout");

  return { url: publicUrl };
}

export async function clearLessonHeroImage(lessonId: string) {
  await requireAdmin();
  if (!z.string().uuid().safeParse(lessonId).success)
    throw new Error("Invalid lesson id.");

  const admin = createServiceRoleClient();
  const { error } = await admin
    .from("strategy_lessons")
    .update({ hero_image_url: null })
    .eq("id", lessonId);
  if (error) throw new Error("Could not clear image: " + error.message);

  revalidatePath("/admin/strategy");
  revalidatePath("/strategy-lab", "layout");
}
