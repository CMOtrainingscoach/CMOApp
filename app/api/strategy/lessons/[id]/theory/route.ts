import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getOrGenerateTheory } from "@/lib/strategy/theory";

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
    const result = await getOrGenerateTheory(user.id, id);
    return NextResponse.json(result);
  } catch (e) {
    console.error("theory route failed", e);
    return NextResponse.json({ error: "theory_failed" }, { status: 500 });
  }
}
