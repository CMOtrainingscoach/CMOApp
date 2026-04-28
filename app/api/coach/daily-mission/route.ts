import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ensureTodayMission } from "@/lib/coach";

export const maxDuration = 30;

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const mission = await ensureTodayMission(user.id);
  return NextResponse.json({ mission });
}
