import { redirect } from "next/navigation";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { getProfessorConfig } from "@/lib/professor-config.server";
import { OnboardingChat } from "./onboarding-chat";
import type { OnboardingTopicId } from "@/lib/onboarding/topics";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: profile }, professorCfg] = await Promise.all([
    supabase
      .from("profiles")
      .select("display_name, onboarded_at")
      .eq("id", user.id)
      .maybeSingle(),
    getProfessorConfig(),
  ]);

  if (profile?.onboarded_at) redirect("/dashboard");

  const admin = createServiceRoleClient();
  const { data: convs } = await admin
    .from("chat_conversations")
    .select("id, metadata")
    .eq("user_id", user.id)
    .eq("kind", "onboarding")
    .order("updated_at", { ascending: false })
    .limit(1);

  const conv = convs?.[0];
  let history: { id: string; role: "user" | "assistant"; content: string }[] = [];
  let topicsCovered: OnboardingTopicId[] = [];

  if (conv) {
    const meta = (conv.metadata ?? {}) as { topics_covered?: string[] };
    topicsCovered = (meta.topics_covered ?? []) as OnboardingTopicId[];
    const { data: msgs } = await admin
      .from("chat_messages")
      .select("id, role, content, created_at")
      .eq("conversation_id", conv.id)
      .order("created_at", { ascending: true });
    history = (msgs ?? [])
      .filter(
        (m) => (m.role === "user" || m.role === "assistant") && m.content,
      )
      .map((m) => ({
        id: m.id as string,
        role: m.role as "user" | "assistant",
        content: m.content as string,
      }));
  }

  const displayName =
    profile?.display_name ?? user.email?.split("@")[0] ?? "Operator";

  return (
    <OnboardingChat
      displayName={displayName}
      professorName={professorCfg.professor_name}
      professorAvatarUrl={professorCfg.professor_avatar_url}
      initialMessages={history}
      initialTopicsCovered={topicsCovered}
    />
  );
}
