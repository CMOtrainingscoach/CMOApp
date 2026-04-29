import Link from "next/link";
import { ArrowRight, Lock, Sparkles, Trophy } from "lucide-react";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { Topbar } from "@/components/shell/topbar";
import { getUserLevel } from "@/lib/strategy/xp";

export const dynamic = "force-dynamic";

type TrackRow = {
  id: string;
  slug: string;
  title: string;
  tagline: string | null;
  description: string | null;
  color: string | null;
  ord: number;
  is_active: boolean;
};

export default async function StrategyLabHomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const admin = createServiceRoleClient();

  const [{ data: profile }, { data: tracks }, level, lessonProgressRows] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("display_name, avatar_url")
        .eq("id", user.id)
        .maybeSingle(),
      admin
        .from("strategy_tracks")
        .select("id, slug, title, tagline, description, color, ord, is_active")
        .order("ord", { ascending: true }),
      getUserLevel(user.id),
      admin
        .from("lesson_progress")
        .select("lesson_id, status")
        .eq("user_id", user.id),
    ]);

  // Compute per-track lesson completion %
  const completedLessonIds = new Set(
    (lessonProgressRows.data ?? [])
      .filter((r) => r.status === "completed")
      .map((r) => r.lesson_id as string),
  );

  const { data: allLessons } = await admin
    .from("strategy_lessons")
    .select("id, module_id");
  const { data: allModules } = await admin
    .from("strategy_modules")
    .select("id, track_id");

  const moduleToTrack = new Map(
    (allModules ?? []).map((m) => [m.id as string, m.track_id as string]),
  );
  const trackTotals = new Map<string, number>();
  const trackCompleted = new Map<string, number>();
  for (const l of allLessons ?? []) {
    const trackId = moduleToTrack.get(l.module_id as string);
    if (!trackId) continue;
    trackTotals.set(trackId, (trackTotals.get(trackId) ?? 0) + 1);
    if (completedLessonIds.has(l.id as string)) {
      trackCompleted.set(trackId, (trackCompleted.get(trackId) ?? 0) + 1);
    }
  }

  return (
    <>
      <Topbar
        displayName={profile?.display_name ?? "Operator"}
        avatarUrl={profile?.avatar_url}
        subtitle="Tracks become muscle memory through reps. Pick where to fight."
      />
      <div className="px-6 lg:px-8 pb-12 space-y-10">
        {/* Rank header */}
        <section
          className="card-premium relative overflow-hidden p-8 sm:p-10"
          style={{
            backgroundImage:
              "radial-gradient(circle at 12% 0%, rgba(232,198,110,0.10) 0%, transparent 35%)",
          }}
        >
          <div className="grid gap-8 sm:grid-cols-[minmax(0,1fr)_minmax(0,260px)] items-center">
            <div>
              <span className="badge-gold inline-flex items-center gap-1">
                <Trophy className="size-3" /> Strategy Lab
              </span>
              <h1 className="mt-3 font-display text-4xl sm:text-5xl tracking-tight gold-text leading-tight">
                {level.rank}.
              </h1>
              <p className="mt-3 text-text-secondary max-w-xl leading-relaxed">
                Twelve tracks. Twelve disciplines. Each one transforms a vague
                ambition into a defendable strategic move. You progress by
                producing work, not by clicking through.
              </p>
              <div className="mt-6 grid grid-cols-3 gap-3 max-w-md">
                <Stat label="Total XP" value={level.total_xp.toLocaleString()} accent />
                <Stat label="Level" value={`${level.level}`} />
                <Stat
                  label="Streak"
                  value={`${level.current_streak}d`}
                />
              </div>
              {level.next_rank && (
                <div className="mt-6 max-w-md">
                  <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.18em] text-text-muted mb-2">
                    <span>Progress to {level.next_rank}</span>
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
            </div>
            <div className="flex flex-col gap-2">
              <Link
                href="/strategy-lab/progress"
                className="btn-ghost px-4 py-2 text-center"
              >
                XP Dashboard
              </Link>
            </div>
          </div>
        </section>

        {/* 12 tracks grid */}
        <section>
          <div className="flex items-end justify-between mb-5">
            <div>
              <h2 className="font-display text-2xl tracking-tight gold-text">
                The Twelve Tracks
              </h2>
              <p className="text-text-muted text-sm mt-1">
                Start with the active track. The others light up as the system
                grows.
              </p>
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {(tracks ?? []).map((t) => {
              const total = trackTotals.get(t.id) ?? 0;
              const done = trackCompleted.get(t.id) ?? 0;
              const pct = total === 0 ? 0 : Math.round((done / total) * 100);
              const active = t.is_active;
              return (
                <TrackCard
                  key={t.id}
                  track={t as TrackRow}
                  active={active}
                  completedLessons={done}
                  totalLessons={total}
                  pct={pct}
                />
              );
            })}
          </div>
        </section>
      </div>
    </>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-xl border border-border-subtle bg-white/[0.02] py-3 px-4">
      <div
        className={
          accent
            ? "text-xl font-semibold tracking-tight gold-text"
            : "text-xl font-semibold tracking-tight text-text-primary"
        }
      >
        {value}
      </div>
      <div className="mt-0.5 text-[10px] uppercase tracking-[0.18em] text-text-muted">
        {label}
      </div>
    </div>
  );
}

function TrackCard({
  track,
  active,
  completedLessons,
  totalLessons,
  pct,
}: {
  track: TrackRow;
  active: boolean;
  completedLessons: number;
  totalLessons: number;
  pct: number;
}) {
  const inner = (
    <div className="card-premium-hover relative h-full p-6 flex flex-col">
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-[0.22em] text-gold-300">
          Track {track.ord.toString().padStart(2, "0")}
        </span>
        {active ? (
          <span className="badge-gold">Active</span>
        ) : (
          <span className="badge-muted inline-flex items-center gap-1">
            <Lock className="size-3" /> Coming soon
          </span>
        )}
      </div>
      <h3 className="mt-3 font-display text-2xl tracking-tight text-text-primary">
        {track.title}
      </h3>
      {track.tagline && (
        <p className="mt-1.5 text-sm text-gold-300/80 italic">
          {track.tagline}
        </p>
      )}
      {track.description && (
        <p className="mt-3 text-sm text-text-muted leading-relaxed flex-1">
          {track.description}
        </p>
      )}

      {active && totalLessons > 0 && (
        <div className="mt-5">
          <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.18em] text-text-muted mb-1.5">
            <span>Progress</span>
            <span>
              {completedLessons}/{totalLessons} lessons · {pct}%
            </span>
          </div>
          <div className="skill-bar-track">
            <div
              className="skill-bar-fill"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      )}

      <div className="mt-6 flex items-center justify-end">
        <span
          className={`inline-flex items-center gap-1.5 text-sm ${
            active ? "text-gold-300" : "text-text-muted"
          }`}
        >
          {active ? (
            <>
              {completedLessons > 0 ? "Continue" : "Begin"}{" "}
              <ArrowRight className="size-4" />
            </>
          ) : (
            <>
              <Sparkles className="size-3.5" /> Preview
            </>
          )}
        </span>
      </div>
    </div>
  );

  return (
    <Link href={`/strategy-lab/${track.slug}`} className="block h-full">
      {inner}
    </Link>
  );
}
