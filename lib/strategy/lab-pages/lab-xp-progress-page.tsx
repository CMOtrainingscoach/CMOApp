import Link from "next/link";
import { ArrowLeft, Award, Flame, Trophy } from "lucide-react";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { Topbar } from "@/components/shell/topbar";
import type { LabRouteBundle } from "@/lib/strategy/lab-routes";
import { getLabUserLevel, RANKS, XP_AMOUNTS } from "@/lib/strategy/xp";

const SOURCE_LABEL: Record<string, string> = {
  lesson_complete: "Lesson completed",
  lesson_question_correct: "Correct answer",
  minigame_perfect: "Perfect challenge run",
  assignment_pass: "Assignment passed",
  module_complete: "Module sealed",
  streak_week: "Week-long streak",
};

export async function LabXpProgressPage({ lab }: { lab: LabRouteBundle }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const admin = createServiceRoleClient();

  const [{ data: profile }, level, { data: events }, { data: rewards }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("display_name, avatar_url")
        .eq("id", user.id)
        .maybeSingle(),
      getLabUserLevel(user.id, lab.contentLabSlug),
      admin
        .from("xp_log")
        .select("id, source, xp_delta, created_at")
        .eq("user_id", user.id)
        .eq("lab_slug", lab.contentLabSlug)
        .order("created_at", { ascending: false })
        .limit(20),
      admin
        .from("reward_unlocks")
        .select(
          "id, unlocked_at, viewed_at, module_rewards:reward_id(title, kind, module_id)",
        )
        .eq("user_id", user.id)
        .order("unlocked_at", { ascending: false })
        .limit(10),
    ]);

  return (
    <>
      <Topbar
        displayName={profile?.display_name ?? "Operator"}
        avatarUrl={profile?.avatar_url}
        subtitle={`${lab.badgeLabel} — XP and rank for this lab only.`}
      />
      <div className="px-6 lg:px-8 pb-12 space-y-10">
        <Link
          href={lab.basePath}
          className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-text-muted hover:text-gold-300 transition-colors"
        >
          <ArrowLeft className="size-3.5" /> {lab.badgeLabel}
        </Link>

        <section className="card-premium p-8 sm:p-10">
          <span className="badge-gold inline-flex items-center gap-1">
            <Trophy className="size-3" /> {lab.badgeLabel} rank
          </span>
          <h1 className="mt-3 font-display text-5xl tracking-tight gold-text">
            {level.rank}
          </h1>
          <p className="mt-2 text-text-muted">
            Level {level.level} · {level.total_xp.toLocaleString()} lab XP earned
          </p>

          <div className="mt-8">
            <div className="relative">
              <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-px bg-border-subtle" />
              <ol className="relative grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
                {RANKS.map((r) => {
                  const reached = level.total_xp >= r.threshold;
                  const isCurrent = level.rank === r.name;
                  return (
                    <li key={r.name} className="text-center">
                      <div
                        className={`mx-auto size-8 rounded-full border-2 flex items-center justify-center ${
                          isCurrent
                            ? "border-gold-300 bg-gold-500/20 shadow-[0_0_16px_rgba(212,175,55,0.4)]"
                            : reached
                              ? "border-gold-500/60 bg-gold-500/10"
                              : "border-white/15 bg-bg-card"
                        }`}
                      >
                        <span
                          className={`size-2 rounded-full ${
                            reached ? "bg-gold-300" : "bg-white/20"
                          }`}
                        />
                      </div>
                      <p
                        className={`mt-2 text-[10px] uppercase tracking-[0.16em] ${
                          isCurrent
                            ? "text-gold-200"
                            : reached
                              ? "text-text-secondary"
                              : "text-text-muted"
                        }`}
                      >
                        {r.name}
                      </p>
                      <p className="text-[9px] text-text-muted mt-0.5">
                        {r.threshold.toLocaleString()}
                      </p>
                    </li>
                  );
                })}
              </ol>
            </div>
          </div>

          {level.next_rank && (
            <div className="mt-8 max-w-md">
              <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.18em] text-text-muted mb-2">
                <span>Next rank: {level.next_rank}</span>
                <span>{level.remaining_to_next} XP to go</span>
              </div>
              <div className="skill-bar-track h-2">
                <div
                  className="skill-bar-fill"
                  style={{ width: `${level.pct_to_next}%` }}
                />
              </div>
            </div>
          )}
        </section>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="card-premium p-6">
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-gold-300">
              <Flame className="size-3.5" /> Streak
            </div>
            <p className="mt-3 font-display text-4xl gold-text">
              {level.current_streak}
              <span className="text-text-muted text-base ml-1">days</span>
            </p>
            <p className="text-text-muted text-sm mt-1">
              Overall account streak · see{" "}
              <Link href="/progress" className="text-gold-300 underline">
                Progress
              </Link>
            </p>
          </div>

          <div className="card-premium p-6">
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-gold-300">
              XP Sources
            </div>
            <ul className="mt-3 space-y-2 text-sm">
              {Object.entries(XP_AMOUNTS).map(([k, v]) => (
                <li
                  key={k}
                  className="flex items-center justify-between text-text-secondary"
                >
                  <span>{SOURCE_LABEL[k] ?? k}</span>
                  <span className="text-gold-300">+{v} XP</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="card-premium p-6">
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-gold-300">
              <Award className="size-3.5" /> Rewards Unlocked
            </div>
            {(rewards ?? []).length === 0 ? (
              <p className="mt-3 text-sm text-text-muted italic">
                No rewards yet. Pass a module assignment to earn one.
              </p>
            ) : (
              <ul className="mt-3 space-y-2 text-sm">
                {(rewards ?? []).map((r) => {
                  type Join = { title: string; kind: string };
                  const m = (r as { module_rewards: Join | Join[] | null })
                    .module_rewards;
                  const item = Array.isArray(m) ? m[0] : m;
                  if (!item) return null;
                  return (
                    <li
                      key={r.id as string}
                      className="flex items-center justify-between text-text-secondary"
                    >
                      <span className="truncate">{item.title}</span>
                      <span className="text-[10px] uppercase tracking-[0.18em] text-text-muted">
                        {item.kind}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        <section>
          <h2 className="font-display text-2xl tracking-tight gold-text mb-4">
            Recent {lab.badgeLabel} XP
          </h2>
          {(events ?? []).length === 0 ? (
            <div className="card-premium p-8 text-center text-text-muted">
              Complete a lesson or pass an assignment in this lab to log XP here.
              Week streak bonuses appear under the Shared bucket on Overall
              Progress.
            </div>
          ) : (
            <ul className="card-premium divide-y divide-border-subtle">
              {(events ?? []).map((e) => (
                <li
                  key={e.id as string}
                  className="flex items-center justify-between gap-4 px-5 py-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm text-text-primary truncate">
                      {SOURCE_LABEL[e.source as string] ?? (e.source as string)}
                    </p>
                    <p className="text-[11px] text-text-muted">
                      {new Date(e.created_at as string).toLocaleString()}
                    </p>
                  </div>
                  <span className="text-gold-300 text-sm font-medium shrink-0">
                    +{e.xp_delta as number} XP
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
