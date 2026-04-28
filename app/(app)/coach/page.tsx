import { createClient } from "@/lib/supabase/server";
import { Topbar } from "@/components/shell/topbar";
import { ensureTodayMission } from "@/lib/coach";
import { CoachWorkspace } from "./workspace";

export const dynamic = "force-dynamic";

export default async function CoachPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: profile }, { data: tasks }, { data: reflections }, mission] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("display_name, avatar_url")
        .eq("id", user.id)
        .maybeSingle(),
      supabase
        .from("tasks")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20),
      supabase
        .from("reflections")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(5),
      ensureTodayMission(user.id),
    ]);

  const displayName = profile?.display_name ?? "Operator";

  return (
    <>
      <Topbar
        displayName={displayName}
        avatarUrl={profile?.avatar_url}
        subtitle="Daily missions. Weekly objectives. Ruthless feedback."
      />
      <div className="px-6 lg:px-8 pb-12">
        <CoachWorkspace
          mission={
            mission ?? {
              id: "",
              study_item: "",
              task_item: "",
              reflection_prompt: "",
              lifestyle_item: "",
            }
          }
          tasks={tasks ?? []}
          reflections={reflections ?? []}
        />
      </div>
    </>
  );
}
