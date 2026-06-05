"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { loadCmoLifeRoadmapForUser } from "@/lib/progress/load-cmo-life-roadmap";

const idSchema = z.string().uuid();

export async function completeCmoLifeMilestone(milestoneIdRaw: string) {
  const milestoneId = idSchema.parse(milestoneIdRaw);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Sign in required.");

  const steps = await loadCmoLifeRoadmapForUser(supabase, user.id);
  const step = steps.find((s) => s.id === milestoneId);
  if (!step) throw new Error("Milestone not found.");
  if (!step.canSelfComplete)
    throw new Error("This step cannot be marked complete yet.");

  const { error } = await supabase
    .from("user_cmo_life_milestone_progress")
    .upsert(
      {
        user_id: user.id,
        milestone_id: milestoneId,
        completed_at: new Date().toISOString(),
        completion_source: "user_self",
      },
      { onConflict: "user_id,milestone_id" },
    );
  if (error) throw new Error(error.message);

  revalidatePath("/progress");
}
