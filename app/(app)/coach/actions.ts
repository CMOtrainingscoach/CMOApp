"use server";

import { revalidatePath } from "next/cache";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { ensureTodayMission } from "@/lib/coach";
import { awardXp } from "@/lib/strategy/xp";
import { getContentLabSlugForModuleId } from "@/lib/strategy/lab-slug";
import type { Json } from "@/types/database";

export async function regenerateTodayMission() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("unauthenticated");

  // Delete today's mission then generate a fresh one
  const today = new Date();
  const ymd = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  await supabase
    .from("daily_missions")
    .delete()
    .eq("user_id", user.id)
    .eq("mission_date", ymd);
  await ensureTodayMission(user.id);
  revalidatePath("/coach");
  revalidatePath("/dashboard");
}

export async function createTaskFromMission(opts: {
  title: string;
  description: string;
  category: string;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("unauthenticated");

  await supabase.from("tasks").insert({
    user_id: user.id,
    title: opts.title,
    description: opts.description,
    category: opts.category,
    difficulty: 3,
    deadline: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
    source: "coach",
  });
  revalidatePath("/coach");
  revalidatePath("/dashboard");
}

function parseReadingTaskMetadata(
  metadata: Json | null,
): { book_id: string; module_id: string } | null {
  if (
    metadata === null ||
    typeof metadata !== "object" ||
    Array.isArray(metadata)
  ) {
    return null;
  }
  const o = metadata as Record<string, unknown>;
  if (o.kind !== "module_reading") return null;
  if (
    typeof o.book_id !== "string" ||
    typeof o.module_id !== "string"
  ) {
    return null;
  }
  return { book_id: o.book_id, module_id: o.module_id };
}

async function recordReadingCompletionAndAwardXp(
  userId: string,
  refs: { book_id: string; module_id: string },
) {
  const admin = createServiceRoleClient();

  const { data: book } = await admin
    .from("strategy_module_books")
    .select("id, module_id, xp_reward")
    .eq("id", refs.book_id)
    .maybeSingle();

  if (
    !book ||
    book.module_id !== refs.module_id
  ) {
    return;
  }

  const xp = Math.min(
    500,
    Math.max(0, (book.xp_reward as number) ?? 25),
  );

  const { error } = await admin.from("user_module_book_read_completion").insert({
    user_id: userId,
    book_id: refs.book_id,
    xp_awarded: xp,
  });

  if (error) {
    if (error.code === "23505") return;
    throw error;
  }

  const labSlug = await getContentLabSlugForModuleId(refs.module_id);

  await awardXp({
    userId,
    source: "reading_complete",
    amount: xp,
    refId: refs.book_id,
    labSlug,
  });

  revalidatePath("/strategy-lab", "layout");
  revalidatePath("/pl-lab", "layout");
}

export async function setTaskStatus(taskId: string, status: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("unauthenticated");

  const { data: prev } = await supabase
    .from("tasks")
    .select("status, metadata")
    .eq("id", taskId)
    .eq("user_id", user.id)
    .maybeSingle();

  const wasTerminal =
    prev?.status === "completed" || prev?.status === "reviewed";

  await supabase
    .from("tasks")
    .update({
      status,
      completed_at:
        status === "completed" || status === "reviewed"
          ? new Date().toISOString()
          : null,
    })
    .eq("id", taskId)
    .eq("user_id", user.id);

  const nowTerminal =
    status === "completed" || status === "reviewed";

  if (!wasTerminal && nowTerminal && prev != null) {
    const reading = parseReadingTaskMetadata(prev.metadata ?? null);
    if (reading) await recordReadingCompletionAndAwardXp(user.id, reading);
  }

  revalidatePath("/coach");
  revalidatePath("/dashboard");
}

export async function deleteTask(taskId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("unauthenticated");
  await supabase.from("tasks").delete().eq("id", taskId).eq("user_id", user.id);
  revalidatePath("/coach");
  revalidatePath("/dashboard");
}

export async function saveReflection(prompt: string, response: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("unauthenticated");
  await supabase
    .from("reflections")
    .insert({ user_id: user.id, prompt, response });
  revalidatePath("/coach");
}
