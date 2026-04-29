import { NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";

export async function POST(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id: rewardId } = await ctx.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const admin = createServiceRoleClient();
  const { error } = await admin
    .from("reward_unlocks")
    .update({ viewed_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .eq("reward_id", rewardId);

  if (error) {
    return NextResponse.json({ error: "update_failed" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
