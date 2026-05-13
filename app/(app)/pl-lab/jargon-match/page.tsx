import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Topbar } from "@/components/shell/topbar";
import { PlJargonMatchRunner } from "@/components/pl/jargon-match-runner";
import { createClient, requireUser } from "@/lib/supabase/server";
import { getProfessorConfig } from "@/lib/professor-config.server";

export const dynamic = "force-dynamic";

export default async function PlJargonMatchPage() {
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
        subtitle="P&L jargon matchup — CFO-ready vocabulary drills."
      />
      <div className="px-6 lg:px-8 pb-12 space-y-5">
        <Link
          href="/pl-lab"
          className="inline-flex lg:hidden items-center gap-2 text-xs uppercase tracking-[0.18em] text-text-muted hover:text-gold-300 transition-colors"
        >
          <ArrowLeft className="size-3.5" /> Lab home
        </Link>
        <PlJargonMatchRunner
          professorName={professor.professor_name}
          professorAvatarUrl={professor.professor_avatar_url}
          headerImageUrl={professor.pl_jargon_match_header_image_url}
        />
      </div>
    </>
  );
}
