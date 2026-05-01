import { createClient } from "@/lib/supabase/server";
import { Topbar } from "@/components/shell/topbar";
import { getProfessorConfig } from "@/lib/professor-config.server";
import { ProfessorChat } from "./chat";

export const dynamic = "force-dynamic";

export default async function ProfessorPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: profile }, { data: conversations }, professorCfg] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("display_name, avatar_url")
        .eq("id", user.id)
        .maybeSingle(),
      supabase
        .from("chat_conversations")
        .select("id, title, updated_at, kind")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false })
        .limit(30),
      getProfessorConfig(),
    ]);

  const displayName = profile?.display_name ?? "Operator";

  return (
    <>
      <Topbar
        displayName={displayName}
        avatarUrl={profile?.avatar_url}
        subtitle="Direct, intelligent, executive-level coaching."
      />
      <div className="px-6 lg:px-8 pb-8 flex-1 min-h-0">
        <ProfessorChat
          displayName={displayName}
          conversations={conversations ?? []}
          professorName={professorCfg.professor_name}
          professorAvatarUrl={professorCfg.professor_avatar_url}
        />
      </div>
    </>
  );
}
