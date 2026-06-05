import Link from "next/link";
import { ArrowLeft, Brain, Sparkles } from "lucide-react";
import { Topbar } from "@/components/shell/topbar";
import { createClient } from "@/lib/supabase/server";
import {
  identityAssessmentCopy,
  IDENTITY_PROFESSOR_NAME,
} from "@/lib/career/identity-assessment/copy";
import { startNewExecutiveIdentityAssessment } from "./actions";

export const dynamic = "force-dynamic";

export default async function ExecutiveIdentityLandingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = user
    ? await supabase
        .from("profiles")
        .select("display_name, avatar_url")
        .eq("id", user.id)
        .maybeSingle()
    : { data: null };

  let resumeId: string | null = null;
  let lastCompletedId: string | null = null;

  if (user) {
    const { data: resume } = await supabase
      .from("executive_identity_sessions")
      .select("id")
      .eq("user_id", user.id)
      .eq("status", "in_progress")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    resumeId = resume?.id ?? null;

    const { data: done } = await supabase
      .from("executive_identity_sessions")
      .select("id")
      .eq("user_id", user.id)
      .eq("status", "completed")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    lastCompletedId = done?.id ?? null;
  }

  return (
    <>
      <Topbar
        displayName={profile?.display_name ?? "Operator"}
        avatarUrl={profile?.avatar_url}
        subtitle={identityAssessmentCopy.assessmentTitle}
      />
      <div className="px-6 lg:px-8 pb-12 space-y-8 max-w-3xl">
        <Link
          href="/career"
          className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-text-muted hover:text-gold-300 transition-colors"
        >
          <ArrowLeft className="size-3.5" /> Career Lab
        </Link>

        <header className="space-y-4">
          <span className="badge-gold inline-flex items-center gap-1">
            <Sparkles className="size-3" /> {IDENTITY_PROFESSOR_NAME}
          </span>
          <h1 className="font-display text-4xl tracking-tight gold-text">
            {identityAssessmentCopy.assessmentTitle}
          </h1>
          <p className="text-text-secondary leading-relaxed">
            {identityAssessmentCopy.landingLead}
          </p>
          <p className="text-sm text-text-muted leading-relaxed">
            {identityAssessmentCopy.landingBody}
          </p>
        </header>

        <section className="card-premium p-6 space-y-3 border-border-gold/20">
          <h2 className="font-display text-lg gold-text">
            {identityAssessmentCopy.introTitle}
          </h2>
          <ul className="list-disc pl-5 text-sm text-text-secondary space-y-2">
            {identityAssessmentCopy.introBullets.map((b) => (
              <li key={b}>{b}</li>
            ))}
          </ul>
        </section>

        <section className="card-premium p-6 flex flex-col sm:flex-row sm:items-center gap-4 border-border-gold/20">
          <Brain className="size-10 text-gold-400 shrink-0" />
          <div className="flex-1 space-y-1">
            <p className="text-sm font-medium text-foreground">
              Brainmap synthesis
            </p>
            <p className="text-sm text-text-muted leading-relaxed">
              After you finish, you get a professor-style written report plus an
              interactive identity graph clustered by themes you can explore.
            </p>
          </div>
        </section>

        <div className="flex flex-wrap gap-3 items-center">
          {resumeId && (
            <Link
              href={`/career/identity-assessment/session/${resumeId}`}
              className="btn-gold px-6 py-3 text-sm order-first"
            >
              {identityAssessmentCopy.resumeCta}
            </Link>
          )}
          <form action={startNewExecutiveIdentityAssessment}>
            <button
              type="submit"
              className={
                resumeId
                  ? "btn-ghost px-6 py-3 text-sm border border-border rounded-lg"
                  : "btn-gold px-6 py-3 text-sm"
              }
            >
              {resumeId ? "Start a new session" : identityAssessmentCopy.startCta}
            </button>
          </form>
          {lastCompletedId && (
            <Link
              href={`/career/identity-assessment/session/${lastCompletedId}/results`}
              className="btn-ghost px-6 py-3 text-sm text-text-muted border border-transparent"
            >
              View last report
            </Link>
          )}
        </div>
      </div>
    </>
  );
}
