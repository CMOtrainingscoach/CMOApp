import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { redirect } from "next/navigation";
import { Topbar } from "@/components/shell/topbar";
import { createClient } from "@/lib/supabase/server";
import { loadIdentitySessionForUser } from "@/lib/career/identity-assessment/load-identity-session";
import { getProfessorConfig } from "@/lib/professor-config.server";
import { IdentityAssessmentChat } from "@/components/career/identity-assessment/identity-assessment-chat";

export const dynamic = "force-dynamic";

export default async function ExecutiveIdentitySessionPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, avatar_url")
    .eq("id", user.id)
    .maybeSingle();

  const session = await loadIdentitySessionForUser(sessionId, user.id);

  if (!session) {
    redirect("/career/identity-assessment");
  }

  if (
    session.status === "completed" ||
    session.status === "generating" ||
    session.status === "failed"
  ) {
    redirect(`/career/identity-assessment/session/${sessionId}/results`);
  }

  const professorCfg = await getProfessorConfig();

  return (
    <>
      <Topbar
        displayName={profile?.display_name ?? "Operator"}
        avatarUrl={profile?.avatar_url}
        subtitle="Executive Identity — continue"
      />
      <div className="px-6 lg:px-8 pb-12 max-w-4xl xl:max-w-5xl mx-auto space-y-6">
        <Link
          href="/career/identity-assessment"
          className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-text-muted hover:text-gold-300 transition-colors"
        >
          <ArrowLeft className="size-3.5" /> Assessment overview
        </Link>
        <IdentityAssessmentChat
          key={`${session.id}-${session.updatedAt}`}
          session={session}
          displayName={profile?.display_name ?? "Operator"}
          professorAvatarUrl={professorCfg.professor_avatar_url}
        />
      </div>
    </>
  );
}
