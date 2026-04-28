"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { ensureTodayMission } from "@/lib/coach";

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

export async function setTaskStatus(taskId: string, status: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("unauthenticated");

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
