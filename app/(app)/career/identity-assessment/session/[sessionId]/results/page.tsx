import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { redirect } from "next/navigation";
import { Topbar } from "@/components/shell/topbar";
import { createClient } from "@/lib/supabase/server";
import {
  mapRowToAssessmentSession,
  type ExecutiveIdentitySessionDbRow,
} from "@/lib/career/identity-assessment/session-map";
import { IdentityResults } from "@/components/career/identity-assessment/identity-results";
import { GeneratingPoller } from "@/components/career/identity-assessment/generating-poller";
import { identityAssessmentCopy } from "@/lib/career/identity-assessment/copy";

export const dynamic = "force-dynamic";

export default async function ExecutiveIdentityResultsPage({
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

  const { data: raw, error } = await supabase
    .from("executive_identity_sessions")
    .select("*")
    .eq("id", sessionId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error || !raw) {
    redirect("/career/identity-assessment");
  }

  const session = mapRowToAssessmentSession(raw as ExecutiveIdentitySessionDbRow);

  if (session.status === "in_progress") {
    redirect(`/career/identity-assessment/session/${sessionId}`);
  }

  return (
    <>
      <Topbar
        displayName={profile?.display_name ?? "Operator"}
        avatarUrl={profile?.avatar_url}
        subtitle="Executive Identity — Results"
      />
      <div className="px-6 lg:px-8 pb-12 space-y-6">
        <Link
          href="/career/identity-assessment"
          className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-text-muted hover:text-gold-300 transition-colors"
        >
          <ArrowLeft className="size-3.5" /> Assessment overview
        </Link>

        {session.status === "generating" && (
          <>
            <GeneratingPoller />
            <div className="card-premium p-8 text-center text-text-secondary">
              {identityAssessmentCopy.generating}
            </div>
          </>
        )}

        {session.status !== "generating" && (
          <IdentityResults session={session} />
        )}
      </div>
    </>
  );
}
