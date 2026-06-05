import Link from "next/link";
import { ArrowRight, Brain, Briefcase, Lock, Sparkles, Trophy } from "lucide-react";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { Topbar } from "@/components/shell/topbar";
import type { LabRouteBundle } from "@/lib/strategy/lab-routes";
import { getLabUserLevel } from "@/lib/strategy/xp";
import { LabStrategyHomeTabs } from "@/components/strategy/lab-strategy-home-tabs";
import { LabPlHomeTabs } from "@/components/strategy/lab-pl-home-tabs";
import { LabLifestyleHomeTabs } from "@/components/strategy/lab-lifestyle-home-tabs";

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

export async function LabTracksHome({ lab }: { lab: LabRouteBundle }) {
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
        .select(
          "id, slug, title, tagline, description, color, ord, is_active, lab_slug",
        )
        .eq("lab_slug", lab.contentLabSlug)
        .order("ord", { ascending: true }),
      getLabUserLevel(user.id, lab.contentLabSlug),
      admin
        .from("lesson_progress")
        .select("lesson_id, status")
        .eq("user_id", user.id),
    ]);

  let identityResumeId: string | null = null;
  if (lab.contentLabSlug === "career") {
    const { data: ex } = await supabase
      .from("executive_identity_sessions")
      .select("id")
      .eq("user_id", user.id)
      .eq("status", "in_progress")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    identityResumeId = ex?.id ?? null;
  }

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
        subtitle={lab.homeSubtitle}
      />
      <div className="px-6 lg:px-8 pb-12 space-y-10">
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
                <Trophy className="size-3" /> {lab.badgeLabel}
              </span>
              <h1 className="mt-3 font-display text-4xl sm:text-5xl tracking-tight gold-text leading-tight">
                {level.rank}.
              </h1>
              <p className="mt-3 text-text-secondary max-w-xl leading-relaxed">
                Progress and rank here are specific to {lab.badgeLabel}. Your
                overall XP across all labs appears on the Progress page.
              </p>
              <div className="mt-6 grid grid-cols-3 gap-3 max-w-md">
                <Stat label="Lab XP" value={level.total_xp.toLocaleString()} accent />
                <Stat label="Level" value={`${level.level}`} />
                <Stat label="Streak" value={`${level.current_streak}d`} />
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
                href={`${lab.basePath}/progress`}
                className="btn-ghost px-4 py-2 text-center"
              >
                Lab XP feed
              </Link>
              <Link
                href="/progress"
                className="btn-ghost px-4 py-2 text-center text-text-muted"
              >
                Overall labs progress
              </Link>
            </div>
          </div>
        </section>

        {lab.contentLabSlug === "career" && (
          <>
            <section className="card-premium relative overflow-hidden p-8 sm:p-10 border-border-gold/25">
              <div className="grid gap-8 sm:grid-cols-[minmax(0,1fr)_auto] items-center">
                <div>
                  <span className="badge-gold inline-flex items-center gap-1">
                    <Brain className="size-3" /> Executive Identity
                  </span>
                  <h2 className="mt-3 font-display text-2xl tracking-tight gold-text">
                    Executive Identity Assessment
                  </h2>
                <p className="mt-3 text-sm text-text-secondary leading-relaxed max-w-xl">
                  Conversation-first deep dive — career arc, ambitions, ideals, hobbies, sharp
                  elbows, plus how sharp you truly are across marketing storytelling and creator
                  channels (social, podcasting, publishing). Ends in a dossier plus Brainmap of
                  your identity graph — designed to launch credible personal-brand motion.
                </p>
                </div>
                <div className="flex flex-col gap-2 sm:items-end shrink-0">
                  {identityResumeId && (
                    <Link
                      href={`${lab.basePath}/identity-assessment/session/${identityResumeId}`}
                      className="btn-gold px-5 py-3 inline-flex items-center justify-center gap-2 text-sm whitespace-nowrap w-full sm:w-auto"
                    >
                      Continue session <ArrowRight className="size-4" />
                    </Link>
                  )}
                  <Link
                    href={`${lab.basePath}/identity-assessment`}
                    className={
                      identityResumeId
                        ? "btn-ghost px-5 py-3 inline-flex items-center justify-center gap-2 text-sm whitespace-nowrap border border-border rounded-lg w-full sm:w-auto"
                        : "btn-gold px-5 py-3 inline-flex items-center justify-center gap-2 text-sm shrink-0 whitespace-nowrap"
                    }
                  >
                    {identityResumeId ? (
                      <>New assessment</>
                    ) : (
                      <>
                        Start assessment <ArrowRight className="size-4" />
                      </>
                    )}
                  </Link>
                </div>
              </div>
            </section>

            <section className="card-premium relative overflow-hidden p-8 sm:p-10 border-border-gold/25">
              <div className="grid gap-8 sm:grid-cols-[minmax(0,1fr)_auto] items-center">
                <div>
                  <span className="badge-gold inline-flex items-center gap-1">
                    <Briefcase className="size-3" /> Opportunities
                  </span>
                  <h2 className="mt-3 font-display text-2xl tracking-tight gold-text">
                    Resume &amp; job tools
                  </h2>
                  <p className="mt-3 text-sm text-text-secondary leading-relaxed max-w-xl">
                    Scan roles against your CV, star what matters, and keep a tracked list — same workbench as before, now alongside your Career tracks.
                  </p>
                </div>
                <Link
                  href={`${lab.basePath}/opportunities`}
                  className="btn-gold px-5 py-3 inline-flex items-center justify-center gap-2 text-sm shrink-0 whitespace-nowrap"
                >
                  Open opportunities <ArrowRight className="size-4" />
                </Link>
              </div>
            </section>
          </>
        )}

        {lab.contentLabSlug === "strategy" ? (
          <LabStrategyHomeTabs
            tracksSection={
              <section>
                <div className="flex items-end justify-between mb-5">
                  <div>
                    <h2 className="font-display text-2xl tracking-tight gold-text">
                      {lab.homeHeadline}
                    </h2>
                    <p className="text-text-muted text-sm mt-1">{lab.homeLead}</p>
                  </div>
                </div>

                <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                  {(tracks ?? []).map((t) => {
                    const total = trackTotals.get(t.id as string) ?? 0;
                    const done = trackCompleted.get(t.id as string) ?? 0;
                    const pct = total === 0 ? 0 : Math.round((done / total) * 100);
                    const active = t.is_active;
                    return (
                      <TrackCard
                        key={t.id}
                        basePath={lab.basePath}
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
            }
          />
        ) : lab.contentLabSlug === "pl" ? (
          <LabPlHomeTabs
            tracksSection={
              <section>
                <div className="flex items-end justify-between mb-5">
                  <div>
                    <h2 className="font-display text-2xl tracking-tight gold-text">
                      {lab.homeHeadline}
                    </h2>
                    <p className="text-text-muted text-sm mt-1">{lab.homeLead}</p>
                  </div>
                </div>

                <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                  {(tracks ?? []).map((t) => {
                    const total = trackTotals.get(t.id as string) ?? 0;
                    const done = trackCompleted.get(t.id as string) ?? 0;
                    const pct = total === 0 ? 0 : Math.round((done / total) * 100);
                    const active = t.is_active;
                    return (
                      <TrackCard
                        key={t.id}
                        basePath={lab.basePath}
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
            }
          />
        ) : lab.contentLabSlug === "lifestyle" ? (
          <LabLifestyleHomeTabs
            tracksSection={
              <section>
                <div className="flex items-end justify-between mb-5">
                  <div>
                    <h2 className="font-display text-2xl tracking-tight gold-text">
                      {lab.homeHeadline}
                    </h2>
                    <p className="text-text-muted text-sm mt-1">{lab.homeLead}</p>
                  </div>
                </div>

                <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                  {(tracks ?? []).map((t) => {
                    const total = trackTotals.get(t.id as string) ?? 0;
                    const done = trackCompleted.get(t.id as string) ?? 0;
                    const pct = total === 0 ? 0 : Math.round((done / total) * 100);
                    const active = t.is_active;
                    return (
                      <TrackCard
                        key={t.id}
                        basePath={lab.basePath}
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
            }
          />
        ) : (
          <>
            <section>
              <div className="flex items-end justify-between mb-5">
                <div>
                  <h2 className="font-display text-2xl tracking-tight gold-text">
                    {lab.homeHeadline}
                  </h2>
                  <p className="text-text-muted text-sm mt-1">{lab.homeLead}</p>
                </div>
              </div>

              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                {(tracks ?? []).map((t) => {
                  const total = trackTotals.get(t.id as string) ?? 0;
                  const done = trackCompleted.get(t.id as string) ?? 0;
                  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
                  const active = t.is_active;
                  return (
                    <TrackCard
                      key={t.id}
                      basePath={lab.basePath}
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
          </>
        )}
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
  basePath,
  track,
  active,
  completedLessons,
  totalLessons,
  pct,
}: {
  basePath: string;
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
        <p className="mt-1.5 text-sm text-gold-300/80 italic">{track.tagline}</p>
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
    <Link href={`${basePath}/${track.slug}`} className="block h-full">
      {inner}
    </Link>
  );
}
