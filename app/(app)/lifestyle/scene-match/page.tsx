import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Topbar } from "@/components/shell/topbar";
import { LifestyleSceneMatchRunner } from "@/components/lifestyle/lifestyle-scene-match-runner";
import { createClient, requireUser } from "@/lib/supabase/server";
import { getProfessorConfig } from "@/lib/professor-config.server";

export const dynamic = "force-dynamic";

export default async function LifestyleSceneMatchPage() {
  const user = await requireUser();
  const supabase = await createClient();
  const [{ data: profile }, professor] = await Promise.all([
    supabase
      .from("profiles")
      .select("display_name, avatar_url")
      .eq("id", user.id)
      .maybeSingle(),
    getProfessorConfig(),
  ]);

  return (
    <>
      <Topbar
        displayName={profile?.display_name ?? "Operator"}
        avatarUrl={profile?.avatar_url}
        subtitle="Lifestyle Lab — who’s who in the business scene."
      />
      <div className="px-6 lg:px-8 pb-12 space-y-5">
        <Link
          href="/lifestyle"
          className="hidden lg:inline-flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-text-muted hover:text-gold-300 transition-colors"
        >
          <ArrowLeft className="size-3.5" /> Lab home
        </Link>
        <LifestyleSceneMatchRunner
          professorName={professor.professor_name}
          professorAvatarUrl={professor.professor_avatar_url}
        />
      </div>
    </>
  );
}
