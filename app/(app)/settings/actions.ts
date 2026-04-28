"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function saveProfile(input: {
  display_name: string;
  headline: string;
  role: string;
  persona_summary: string;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("unauthenticated");

  await supabase
    .from("profiles")
    .upsert(
      {
        id: user.id,
        display_name: input.display_name || null,
        headline: input.headline || null,
        role: input.role || null,
        persona_summary: input.persona_summary || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    );
  revalidatePath("/dashboard");
  revalidatePath("/settings");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
}
