import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getOrGenerateMinigame } from "@/lib/strategy/minigame";

export const maxDuration = 60;

export async function POST(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  try {
    const result = await getOrGenerateMinigame(id);
    return NextResponse.json(result);
  } catch (e) {
    console.error("minigame route failed", e);
    return NextResponse.json({ error: "minigame_failed" }, { status: 500 });
  }
}
