"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { clearTheoryCache } from "@/lib/strategy/theory";
import { clearMinigame } from "@/lib/strategy/minigame";

function revalidatePublishedLabLayouts() {
  revalidatePath("/strategy-lab", "layout");
  revalidatePath("/pl-lab", "layout");
  revalidatePath("/lifestyle", "layout");
  revalidatePath("/career", "layout");
}

const moduleSchema = z
  .object({
    id: z.string().uuid().optional(),
    track_id: z.string().uuid().optional(),
    ord: z.number().int().min(0).max(50),
    title: z.string().min(2).max(200),
    summary: z.string().max(2000).nullable().optional(),
    description: z.string().max(100_000).nullable().optional(),
    xp_reward: z.number().int().min(0).max(2000).default(150),
    assignment_required: z.boolean().default(true),
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
        assignment_required: parsed.assignment_required,
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
      assignment_required: parsed.assignment_required,
    });
  }
  revalidatePath("/admin/strategy");
  revalidatePublishedLabLayouts();
}

export async function deleteModule(moduleId: string) {
  await requireAdmin();
  const admin = createServiceRoleClient();
  await admin.from("strategy_modules").delete().eq("id", moduleId);
  revalidatePath("/admin/strategy");
}

const cmsLabSlugSchema = z.enum(["strategy", "pl", "lifestyle", "career"]);

const slugInputSchema = z
  .string()
  .min(2)
  .max(80)
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    "URL slug: lowercase letters, numbers, hyphens only (e.g. go-to-market-101).",
  );

const createTrackSchema = z.object({
  labSlug: cmsLabSlugSchema,
  slug: slugInputSchema,
  title: z.string().min(2).max(200),
  tagline: z.string().max(400).nullable().optional(),
  description: z.string().max(16000).nullable().optional(),
  color: z.string().max(32).nullable().optional(),
});

export async function createStrategyTrack(
  raw: z.input<typeof createTrackSchema>,
): Promise<{ slug: string }> {
  await requireAdmin();
  const parsed = createTrackSchema.parse(raw);
  const admin = createServiceRoleClient();

  const { data: maxRows } = await admin
    .from("strategy_tracks")
    .select("ord")
    .eq("lab_slug", parsed.labSlug)
    .order("ord", { ascending: false })
    .limit(1);
  const top = Array.isArray(maxRows) ? maxRows[0] : null;
  const maxOrd = typeof top?.ord === "number" ? top.ord : -1;

  const nextOrd = maxOrd + 1;

  const { data: inserted, error } = await admin
    .from("strategy_tracks")
    .insert({
      slug: parsed.slug,
      title: parsed.title,
      tagline: parsed.tagline ?? null,
      description: parsed.description ?? null,
      color: parsed.color?.trim() || null,
      ord: nextOrd,
      lab_slug: parsed.labSlug,
      total_modules: 0,
      total_xp: 0,
      is_active: false,
    })
    .select("slug")
    .single();

  if (error) {
    throw new Error(
      error.code === "23505"
        ? "That URL slug is already used. Pick another slug (unique across all labs)."
        : error.message,
    );
  }
  if (!inserted?.slug) throw new Error("Track creation failed.");

  revalidatePath("/admin/strategy");
  revalidatePublishedLabLayouts();
  return { slug: inserted.slug as string };
}

const updateTrackSchema = z.object({
  trackId: z.string().uuid(),
  labSlug: cmsLabSlugSchema,
  slug: slugInputSchema,
  title: z.string().min(2).max(200),
  tagline: z.string().max(400).nullable().optional(),
  description: z.string().max(16000).nullable().optional(),
  color: z.string().max(32).nullable().optional(),
});

export async function updateStrategyTrack(raw: z.input<typeof updateTrackSchema>) {
  await requireAdmin();
  const parsed = updateTrackSchema.parse(raw);
  const admin = createServiceRoleClient();

  const { data: row, error: fetchErr } = await admin
    .from("strategy_tracks")
    .select("id")
    .eq("id", parsed.trackId)
    .eq("lab_slug", parsed.labSlug)
    .maybeSingle();

  if (fetchErr) throw fetchErr;
  if (!row) throw new Error("Track not found for this lab.");

  const { error } = await admin
    .from("strategy_tracks")
    .update({
      slug: parsed.slug,
      title: parsed.title,
      tagline: parsed.tagline ?? null,
      description: parsed.description ?? null,
      color: parsed.color?.trim() || null,
    })
    .eq("id", parsed.trackId);

  if (error) {
    throw new Error(
      error.code === "23505"
        ? "That URL slug is already used elsewhere."
        : error.message,
    );
  }

  revalidatePath("/admin/strategy");
  revalidatePublishedLabLayouts();
}

export async function setTrackPublished(input: {
  trackId: string;
  labSlug: z.infer<typeof cmsLabSlugSchema>;
  isActive: boolean;
}) {
  await requireAdmin();
  const trackId = z.string().uuid("Invalid track ID").parse(input.trackId);
  const labSlug = cmsLabSlugSchema.parse(input.labSlug);
  const isActive = z.boolean().parse(input.isActive);

  const admin = createServiceRoleClient();

  const { data: row, error: fetchErr } = await admin
    .from("strategy_tracks")
    .select("id")
    .eq("id", trackId)
    .eq("lab_slug", labSlug)
    .maybeSingle();

  if (fetchErr) throw fetchErr;
  if (!row) {
    throw new Error("Track not found for this lab.");
  }

  const { error } = await admin
    .from("strategy_tracks")
    .update({ is_active: isActive })
    .eq("id", trackId);

  if (error) throw error;

  revalidatePath("/admin/strategy");
  revalidatePublishedLabLayouts();
}

const moduleBookRowSchema = z.object({
  title: z.string().min(1).max(500),
  author: z.string().max(300).nullable().optional(),
  url: z
    .union([z.string(), z.literal(""), z.null()])
    .optional()
    .transform((v) => {
      if (v == null) return null;
      const t = String(v).trim();
      return t === "" ? null : t;
    }),
  notes: z.string().max(8000).nullable().optional(),
  xp_reward: z.number().int().min(0).max(500).default(25),
});

export async function replaceModuleBooks(
  moduleId: string,
  books: unknown[],
) {
  await requireAdmin();
  const uuid = z.string().uuid("Invalid module ID").parse(moduleId);
  const parsed = z
    .array(moduleBookRowSchema)
    .max(60)
    .parse(Array.isArray(books) ? books : []);

  const admin = createServiceRoleClient();

  await admin.from("strategy_module_books").delete().eq("module_id", uuid);

  if (parsed.length > 0) {
    const rows = parsed.map((b, idx) => ({
      module_id: uuid,
      ord: idx,
      title: b.title,
      author: b.author ?? null,
      url: b.url ?? null,
      notes: b.notes ?? null,
      xp_reward: b.xp_reward ?? 25,
    }));
    const { error } = await admin.from("strategy_module_books").insert(rows);
    if (error) throw error;
  }

  revalidatePath("/admin/strategy");
  revalidatePublishedLabLayouts();
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

const assignmentSchema = z
  .object({
    id: z.string().uuid().optional(),
    module_id: z.string().uuid(),
    title: z.string().min(2).max(200),
    prompt: z.string().min(10).max(100_000),
    rubric: z.record(z.string(), z.string().max(8000)),
    success_criteria: z.array(z.string().min(2).max(2000)).max(30),
    max_score: z.number().int().min(10).max(1000).default(100),
    passing_score: z.number().int().min(1).max(1000).default(80),
  })
  .refine((d) => d.passing_score <= d.max_score, {
    message: "Passing score cannot exceed max score",
    path: ["passing_score"],
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
        passing_score: parsed.passing_score,
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
      passing_score: parsed.passing_score,
    });
  }
  revalidatePath("/admin/strategy");
}

const rewardSchema = z.object({
  id: z.string().uuid().optional(),
  module_id: z.string().uuid(),
  ord: z.number().int().min(0).max(20).default(0),
  kind: z.enum(["letter", "template", "video", "quote_card", "image"]),
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

const MAX_REWARD_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_REWARD_IMAGE_MIMES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

/** Upload poster/image for kind=image rewards; merges `image_url` into existing content JSON. */
export async function uploadModuleRewardImage(
  formData: FormData,
): Promise<{ url: string }> {
  await requireAdmin();
  const rewardId = formData.get("reward_id");
  const file = formData.get("file");
  if (
    typeof rewardId !== "string" ||
    !z.string().uuid().safeParse(rewardId).success
  ) {
    throw new Error("Invalid reward id.");
  }
  if (!(file instanceof File)) throw new Error("No file provided.");
  if (file.size > MAX_REWARD_IMAGE_BYTES)
    throw new Error("Image too large (max 5 MB).");
  if (!ALLOWED_REWARD_IMAGE_MIMES.has(file.type))
    throw new Error("Unsupported format. Use JPEG, PNG, or WebP.");

  const admin = createServiceRoleClient();
  const { data: rw, error: fetchErr } = await admin
    .from("module_rewards")
    .select("id, kind, content")
    .eq("id", rewardId)
    .maybeSingle();
  if (fetchErr || !rw) throw new Error("Reward not found.");
  if ((rw.kind as string) !== "image")
    throw new Error("Only image rewards accept uploads.");

  const ext =
    file.type === "image/jpeg"
      ? "jpg"
      : file.type === "image/png"
        ? "png"
        : "webp";
  const path = `strategy-rewards/${rewardId}/image_${Date.now()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

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

  const prev =
    rw.content && typeof rw.content === "object" && !Array.isArray(rw.content)
      ? (rw.content as Record<string, unknown>)
      : {};
  const nextContent = { ...prev, image_url: publicUrl };

  const { error: updateError } = await admin
    .from("module_rewards")
    .update({ content: nextContent })
    .eq("id", rewardId);
  if (updateError)
    throw new Error("Could not attach image: " + updateError.message);

  revalidatePath("/admin/strategy");
  revalidatePublishedLabLayouts();

  return { url: publicUrl };
}

const MAX_REWARD_VIDEO_BYTES = 80 * 1024 * 1024;
const ALLOWED_REWARD_VIDEO_MIMES = new Set([
  "video/mp4",
  "video/webm",
  "video/quicktime",
]);

/** Upload MP4/WebM/MOV for kind=video rewards; merges `video_url` into existing content JSON. */
export async function uploadModuleRewardVideo(
  formData: FormData,
): Promise<{ url: string }> {
  await requireAdmin();
  const rewardId = formData.get("reward_id");
  const file = formData.get("file");
  if (
    typeof rewardId !== "string" ||
    !z.string().uuid().safeParse(rewardId).success
  ) {
    throw new Error("Invalid reward id.");
  }
  if (!(file instanceof File)) throw new Error("No file provided.");
  if (file.size > MAX_REWARD_VIDEO_BYTES)
    throw new Error("Video too large (max 80 MB).");
  if (!ALLOWED_REWARD_VIDEO_MIMES.has(file.type))
    throw new Error("Unsupported format. Use MP4, WebM, or MOV.");

  const admin = createServiceRoleClient();
  const { data: rw, error: fetchErr } = await admin
    .from("module_rewards")
    .select("id, kind, content")
    .eq("id", rewardId)
    .maybeSingle();
  if (fetchErr || !rw) throw new Error("Reward not found.");
  if ((rw.kind as string) !== "video")
    throw new Error("Only video rewards accept video uploads.");

  const ext =
    file.type === "video/quicktime"
      ? "mov"
      : file.type === "video/webm"
        ? "webm"
        : "mp4";
  const path = `strategy-rewards/${rewardId}/video_${Date.now()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await admin.storage
    .from("cmo-public")
    .upload(path, buffer, {
      contentType: file.type,
      cacheControl: "86400",
      upsert: true,
    });
  if (uploadError) throw new Error("Upload failed: " + uploadError.message);

  const { data: pub } = admin.storage.from("cmo-public").getPublicUrl(path);
  const publicUrl = pub.publicUrl;

  const prev =
    rw.content && typeof rw.content === "object" && !Array.isArray(rw.content)
      ? (rw.content as Record<string, unknown>)
      : {};
  const nextContent = { ...prev, video_url: publicUrl };

  const { error: updateError } = await admin
    .from("module_rewards")
    .update({ content: nextContent })
    .eq("id", rewardId);
  if (updateError)
    throw new Error("Could not attach video: " + updateError.message);

  revalidatePath("/admin/strategy");
  revalidatePublishedLabLayouts();

  return { url: publicUrl };
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
  revalidatePublishedLabLayouts();

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
  revalidatePublishedLabLayouts();
}
