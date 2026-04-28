import { NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { ONBOARDING_TOPIC_IDS } from "@/lib/onboarding/topics";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarded_at, display_name")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.onboarded_at) {
    return NextResponse.json({
      onboarded: true,
      topicsCovered: ONBOARDING_TOPIC_IDS,
    });
  }

  const admin = createServiceRoleClient();
  const { data: conv } = await admin
    .from("chat_conversations")
    .select("id, metadata")
    .eq("user_id", user.id)
    .eq("kind", "onboarding")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const meta = (conv?.metadata ?? {}) as { topics_covered?: string[] };
  return NextResponse.json({
    onboarded: false,
    conversationId: conv?.id ?? null,
    topicsCovered: meta.topics_covered ?? [],
  });
}
