import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, ScrollText, Target, Trophy } from "lucide-react";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { Topbar } from "@/components/shell/topbar";
import { AssignmentForm } from "./assignment-form";

export const dynamic = "force-dynamic";

export default async function AssignmentPage({
  params,
}: {
  params: Promise<{ trackSlug: string; moduleId: string }>;
}) {
  const { trackSlug, moduleId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createServiceRoleClient();

  const { data: track } = await admin
    .from("strategy_tracks")
    .select("id, slug, title")
    .eq("slug", trackSlug)
    .maybeSingle();
  if (!track) notFound();

  const { data: module } = await admin
    .from("strategy_modules")
    .select("id, ord, title, summary, xp_reward")
    .eq("id", moduleId)
    .eq("track_id", track.id)
    .maybeSingle();
  if (!module) notFound();

  const { data: assignment } = await admin
    .from("module_assignments")
    .select("id, title, prompt, rubric, success_criteria, max_score")
    .eq("module_id", module.id)
    .maybeSingle();
  if (!assignment) notFound();

  const [{ data: profile }, { data: lastSubmission }] = await Promise.all([
    supabase
      .from("profiles")
      .select("display_name, avatar_url")
      .eq("id", user.id)
      .maybeSingle(),
    admin
      .from("assignment_submissions")
      .select("id, status, created_at, content")
      .eq("user_id", user.id)
      .eq("assignment_id", assignment.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  // If they already have a graded submission, jump them to the review
  if (lastSubmission?.status === "graded") {
    redirect(`/strategy-lab/${trackSlug}/${moduleId}/review`);
  }

  const rubricEntries = Object.entries(
    (assignment.rubric ?? {}) as Record<string, string>,
  );
  const successCriteria = (assignment.success_criteria ?? []) as string[];

  return (
    <>
      <Topbar
        displayName={profile?.display_name ?? "Operator"}
        avatarUrl={profile?.avatar_url}
        subtitle={`${track.title} · End-of-module assignment`}
      />
      <div className="px-6 lg:px-8 pb-12">
        <Link
          href={`/strategy-lab/${trackSlug}/${moduleId}`}
          className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-text-muted hover:text-gold-300 transition-colors"
        >
          <ArrowLeft className="size-3.5" /> Back to module
        </Link>

        <header className="mt-6 mb-8 max-w-3xl">
          <span className="badge-gold inline-flex items-center gap-1">
            <Trophy className="size-3" /> Module Assignment
          </span>
          <h1 className="mt-3 font-display text-4xl tracking-tight gold-text">
            {assignment.title}
          </h1>
          <p className="mt-2 text-sm text-text-muted">
            Module {(module.ord as number) + 1}: {module.title}
          </p>
        </header>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-6">
            <div className="card-premium p-6 sm:p-8">
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-gold-300 mb-4">
                <ScrollText className="size-3.5" /> The Brief
              </div>
              <p className="text-base leading-relaxed text-text-primary whitespace-pre-line">
                {assignment.prompt}
              </p>
            </div>

            <AssignmentForm
              assignmentId={assignment.id as string}
              trackSlug={trackSlug}
              moduleId={module.id as string}
            />
          </div>

          <aside className="space-y-4">
            <div className="card-premium p-5">
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-gold-300">
                <Target className="size-3.5" /> Success criteria
              </div>
              <ul className="mt-3 space-y-2 text-sm text-text-secondary leading-relaxed">
                {successCriteria.map((c, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="mt-0.5 size-5 rounded-full border border-gold-500/40 text-gold-300 text-[10px] flex items-center justify-center">
                      {i + 1}
                    </span>
                    <span>{c}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="card-premium p-5">
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-gold-300">
                Rubric
              </div>
              <dl className="mt-3 space-y-3 text-sm">
                {rubricEntries.map(([k, v]) => (
                  <div key={k}>
                    <dt className="text-text-primary font-medium uppercase tracking-[0.12em] text-[11px]">
                      {humanize(k)}
                    </dt>
                    <dd className="mt-1 text-text-secondary leading-relaxed">
                      {v}
                    </dd>
                  </div>
                ))}
              </dl>
              <p className="mt-4 text-[11px] uppercase tracking-[0.18em] text-text-muted">
                Pass score: 70 / {assignment.max_score}
              </p>
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}

function humanize(k: string): string {
  return k.replace(/_/g, " ");
}
