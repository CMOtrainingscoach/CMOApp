import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, ArrowRight, Award, RotateCcw } from "lucide-react";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { Topbar } from "@/components/shell/topbar";
import { TheoryBody } from "@/components/strategy/theory-body";

export const dynamic = "force-dynamic";

export default async function ReviewPage({
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
    .select("id, title, slug")
    .eq("slug", trackSlug)
    .maybeSingle();
  if (!track) notFound();

  const { data: module } = await admin
    .from("strategy_modules")
    .select("id, ord, title, track_id")
    .eq("id", moduleId)
    .eq("track_id", track.id)
    .maybeSingle();
  if (!module) notFound();

  const { data: assignment } = await admin
    .from("module_assignments")
    .select("id, title")
    .eq("module_id", module.id)
    .maybeSingle();
  if (!assignment) notFound();

  // Latest submission + review for this user
  const { data: submission } = await admin
    .from("assignment_submissions")
    .select("id, status, created_at")
    .eq("user_id", user.id)
    .eq("assignment_id", assignment.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!submission) {
    redirect(`/strategy-lab/${trackSlug}/${moduleId}/assignment`);
  }

  const { data: review } = await admin
    .from("assignment_reviews")
    .select("score, strengths, weaknesses, required_revisions, verdict, feedback_md")
    .eq("submission_id", submission.id)
    .maybeSingle();

  const { data: nextModule } = await admin
    .from("strategy_modules")
    .select("id, ord, title")
    .eq("track_id", track.id)
    .eq("ord", (module.ord as number) + 1)
    .maybeSingle();

  // Reward unlocks for this module
  const { data: rewards } = await admin
    .from("module_rewards")
    .select("id, kind, title, description")
    .eq("module_id", module.id)
    .order("ord", { ascending: true });

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, avatar_url")
    .eq("id", user.id)
    .maybeSingle();

  const passed = review?.verdict === "pass";
  const score = review?.score ?? 0;

  return (
    <>
      <Topbar
        displayName={profile?.display_name ?? "Operator"}
        avatarUrl={profile?.avatar_url}
        subtitle={`${track.title} · Professor's review`}
      />
      <div className="px-6 lg:px-8 pb-12">
        <Link
          href={`/strategy-lab/${trackSlug}/${moduleId}`}
          className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-text-muted hover:text-gold-300 transition-colors"
        >
          <ArrowLeft className="size-3.5" /> Back to module
        </Link>

        <header className="mt-6 mb-8 max-w-3xl">
          <span
            className={
              passed
                ? "badge-success"
                : "badge-warning"
            }
          >
            {passed ? "PASS" : "REVISION REQUIRED"}
          </span>
          <h1 className="mt-3 font-display text-4xl tracking-tight gold-text">
            {assignment.title}
          </h1>
          <p className="mt-2 text-sm text-text-muted">
            Module {(module.ord as number) + 1}: {module.title}
          </p>
        </header>

        {!review && (
          <div className="card-premium p-8 text-center text-text-muted">
            The Professor is still reviewing your submission. Refresh in a
            moment.
          </div>
        )}

        {review && (
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="space-y-6">
              <div className="card-premium p-6 sm:p-8">
                <div className="flex items-center justify-between">
                  <div className="text-xs uppercase tracking-[0.18em] text-gold-300">
                    Score
                  </div>
                  <div className="font-display text-5xl tracking-tight gold-text">
                    {score}
                    <span className="text-text-muted text-2xl ml-1">/ 100</span>
                  </div>
                </div>
                <div className="mt-4 skill-bar-track">
                  <div
                    className="skill-bar-fill"
                    style={{ width: `${Math.min(100, score)}%` }}
                  />
                </div>
              </div>

              {review.feedback_md && (
                <div className="card-premium p-6 sm:p-8">
                  <div className="text-xs uppercase tracking-[0.18em] text-gold-300 mb-4">
                    Professor's Feedback
                  </div>
                  <TheoryBody markdown={review.feedback_md as string} />
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <ListBlock
                  title="Strengths"
                  items={(review.strengths ?? []) as string[]}
                  tone="positive"
                />
                <ListBlock
                  title="Weaknesses"
                  items={(review.weaknesses ?? []) as string[]}
                  tone="warn"
                />
              </div>

              {!passed && (review.required_revisions as string[])?.length > 0 && (
                <ListBlock
                  title="Required Revisions"
                  items={(review.required_revisions ?? []) as string[]}
                  tone="warn"
                />
              )}

              <div className="card-premium p-6 flex items-center justify-between gap-4 flex-wrap">
                {passed ? (
                  <>
                    <p className="text-sm text-text-secondary max-w-md">
                      You passed. Reward unlocked.{" "}
                      {nextModule
                        ? `Module ${(nextModule.ord as number) + 1} is now available.`
                        : "Track complete."}
                    </p>
                    <div className="flex items-center gap-2">
                      {rewards && rewards.length > 0 && (
                        <Link
                          href={`/strategy-lab/${trackSlug}/${moduleId}/reward`}
                          className="btn-ghost px-4 py-2 inline-flex items-center gap-2"
                        >
                          <Award className="size-4 text-gold-300" /> Open reward
                        </Link>
                      )}
                      {nextModule ? (
                        <Link
                          href={`/strategy-lab/${trackSlug}/${nextModule.id}`}
                          className="btn-gold px-5 py-2.5 inline-flex items-center gap-2"
                        >
                          Next module
                          <ArrowRight className="size-4" />
                        </Link>
                      ) : (
                        <Link
                          href={`/strategy-lab/${trackSlug}`}
                          className="btn-gold px-5 py-2.5 inline-flex items-center gap-2"
                        >
                          Back to track
                          <ArrowRight className="size-4" />
                        </Link>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-text-secondary max-w-md">
                      Address the required revisions and resubmit. The
                      Professor wants sharper, not more.
                    </p>
                    <Link
                      href={`/strategy-lab/${trackSlug}/${moduleId}/assignment`}
                      className="btn-gold px-5 py-2.5 inline-flex items-center gap-2"
                    >
                      <RotateCcw className="size-4" />
                      Revise & resubmit
                    </Link>
                  </>
                )}
              </div>
            </div>

            <aside className="space-y-4">
              <div className="card-premium p-5">
                <div className="text-xs uppercase tracking-[0.18em] text-gold-300">
                  Verdict
                </div>
                <p
                  className={`mt-2 text-2xl font-semibold tracking-tight ${
                    passed ? "text-emerald-300" : "text-amber-300"
                  }`}
                >
                  {passed ? "Pass" : "Revision required"}
                </p>
                <p className="mt-2 text-sm text-text-muted leading-relaxed">
                  {passed
                    ? "Your work is at CMO-track standard. Module unlocked."
                    : "You're directionally correct but missing rigor. Sharpen the gaps and try again."}
                </p>
              </div>
            </aside>
          </div>
        )}
      </div>
    </>
  );
}

function ListBlock({
  title,
  items,
  tone,
}: {
  title: string;
  items: string[];
  tone: "positive" | "warn";
}) {
  return (
    <div className="card-premium p-6">
      <div className="text-xs uppercase tracking-[0.18em] text-gold-300 mb-3">
        {title}
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-text-muted italic">None.</p>
      ) : (
        <ul className="space-y-2">
          {items.map((it, i) => (
            <li
              key={i}
              className="flex items-start gap-3 text-sm leading-relaxed"
            >
              <span
                className={`mt-1.5 size-1.5 rounded-full shrink-0 ${
                  tone === "positive" ? "bg-emerald-400" : "bg-amber-400"
                }`}
              />
              <span className="text-text-secondary">{it}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
