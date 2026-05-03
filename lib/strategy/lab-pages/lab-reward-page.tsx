import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, ArrowRight, Award } from "lucide-react";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { Topbar } from "@/components/shell/topbar";
import type { LabRouteBundle } from "@/lib/strategy/lab-routes";
import { RewardReveal } from "@/components/strategy/reward-reveal";

export async function LabRewardPage(opts: {
  lab: LabRouteBundle;
  trackSlug: string;
  moduleId: string;
}) {
  const { lab, trackSlug, moduleId } = opts;
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
    .eq("lab_slug", lab.contentLabSlug)
    .maybeSingle();
  if (!track) notFound();

  const { data: module } = await admin
    .from("strategy_modules")
    .select("id, ord, title, track_id")
    .eq("id", moduleId)
    .eq("track_id", track.id)
    .maybeSingle();
  if (!module) notFound();

  const { data: rewards } = await admin
    .from("module_rewards")
    .select("id, kind, title, description, content")
    .eq("module_id", module.id)
    .order("ord", { ascending: true });

  const { data: unlocks } = await admin
    .from("reward_unlocks")
    .select("reward_id")
    .eq("user_id", user.id);
  const unlockedSet = new Set((unlocks ?? []).map((u) => u.reward_id as string));

  const visible = (rewards ?? []).filter((r) => unlockedSet.has(r.id as string));

  const modReview = `${lab.basePath}/${trackSlug}/${moduleId}/review`;

  if (visible.length === 0) {
    redirect(modReview);
  }

  const { data: nextModule } = await admin
    .from("strategy_modules")
    .select("id, ord, title")
    .eq("track_id", track.id)
    .eq("ord", (module.ord as number) + 1)
    .maybeSingle();

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, avatar_url")
    .eq("id", user.id)
    .maybeSingle();

  return (
    <>
      <Topbar
        displayName={profile?.display_name ?? "Operator"}
        avatarUrl={profile?.avatar_url}
        subtitle={`${track.title} · Reward unlocked`}
      />
      <div className="px-6 lg:px-8 pb-12">
        <Link
          href={modReview}
          className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-text-muted hover:text-gold-300 transition-colors"
        >
          <ArrowLeft className="size-3.5" /> Back to review
        </Link>

        <div className="max-w-3xl mx-auto">
          <header className="mt-6 mb-8 text-center">
            <span className="badge-gold inline-flex items-center gap-1">
              <Award className="size-3" /> Reward Unlocked
            </span>
            <h1 className="mt-3 font-display text-5xl tracking-tight gold-text">
              You earned this.
            </h1>
            <p className="mt-3 text-text-muted max-w-xl mx-auto">
              Module {(module.ord as number) + 1} of {track.title} is sealed.
              Carry the artifact below into your next move.
            </p>
          </header>

          <RewardReveal
            rewards={visible.map((r) => ({
              id: r.id as string,
              kind: r.kind as "letter" | "template" | "video" | "quote_card",
              title: r.title as string,
              description: (r.description as string | null) ?? null,
              content: (r.content ?? {}) as Record<string, unknown>,
            }))}
            displayName={profile?.display_name ?? "Operator"}
            moduleTitle={module.title as string}
          />

          <div className="mt-10 flex items-center justify-center gap-3">
            {nextModule ? (
              <Link
                href={`${lab.basePath}/${trackSlug}/${nextModule.id}`}
                className="btn-gold px-6 py-3 inline-flex items-center gap-2"
              >
                Begin Module {(nextModule.ord as number) + 1}
                <ArrowRight className="size-4" />
              </Link>
            ) : (
              <Link
                href={`${lab.basePath}/${trackSlug}`}
                className="btn-gold px-6 py-3 inline-flex items-center gap-2"
              >
                Track Complete · Return
                <ArrowRight className="size-4" />
              </Link>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
