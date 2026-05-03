import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Lock,
  Trophy,
} from "lucide-react";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { Topbar } from "@/components/shell/topbar";
import type { LabRouteBundle } from "@/lib/strategy/lab-routes";
import { ModuleBookAddCoachTaskButton } from "@/components/strategy/module-book-add-coach-task-button";

export async function LabTrackDetailPage(opts: {
  lab: LabRouteBundle;
  trackSlug: string;
}) {
  const { lab, trackSlug } = opts;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const admin = createServiceRoleClient();

  const { data: track } = await admin
    .from("strategy_tracks")
    .select("id, slug, title, tagline, description, is_active, lab_slug")
    .eq("slug", trackSlug)
    .eq("lab_slug", lab.contentLabSlug)
    .maybeSingle();
  if (!track) notFound();

  const [{ data: profile }, { data: modules }, { data: progress }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("display_name, avatar_url")
        .eq("id", user.id)
        .maybeSingle(),
      admin
        .from("strategy_modules")
        .select("id, ord, title, summary, description, xp_reward")
        .eq("track_id", track.id)
        .order("ord", { ascending: true }),
      admin
        .from("lesson_progress")
        .select("lesson_id, status")
        .eq("user_id", user.id),
    ]);

  const completed = new Set(
    (progress ?? [])
      .filter((p) => p.status === "completed")
      .map((p) => p.lesson_id as string),
  );

  const moduleIds = (modules ?? []).map((m) => m.id as string);
  const { data: lessonsAll } = moduleIds.length
    ? await admin
        .from("strategy_lessons")
        .select("id, ord, title, module_id, estimated_minutes, xp_reward")
        .in("module_id", moduleIds)
        .order("ord", { ascending: true })
    : { data: [] };

  let booksAll: Array<{
    id: string;
    module_id: string;
    ord: number;
    title: string;
    author: string | null;
    url: string | null;
    notes: string | null;
  }> = [];
  if (moduleIds.length) {
    const booksRes = await admin
      .from("strategy_module_books")
      .select("id, module_id, ord, title, author, url, notes")
      .in("module_id", moduleIds)
      .order("ord", { ascending: true });
    if (booksRes.error) {
      console.error(
        "[LabTrackDetailPage] strategy_module_books:",
        booksRes.error.message,
      );
    } else {
      booksAll = (booksRes.data ?? []) as typeof booksAll;
    }
  }

  const booksByModule = new Map<
    string,
    {
      id: string;
      ord: number;
      title: string;
      author: string | null;
      url: string | null;
      notes: string | null;
    }[]
  >();
  for (const b of booksAll ?? []) {
    const mid = b.module_id as string;
    const list = booksByModule.get(mid) ?? [];
    list.push({
      id: b.id as string,
      ord: b.ord as number,
      title: b.title as string,
      author: (b.author as string | null) ?? null,
      url: (b.url as string | null) ?? null,
      notes: (b.notes as string | null) ?? null,
    });
    booksByModule.set(mid, list);
  }

  const unlockResults = await Promise.all(
    (modules ?? []).map(async (m) => {
      const { data } = await admin.rpc("module_is_unlocked", {
        p_user_id: user.id,
        p_module_id: m.id as string,
      });
      return { id: m.id as string, unlocked: Boolean(data) };
    }),
  );
  const unlockMap = new Map(unlockResults.map((u) => [u.id, u.unlocked]));

  const { data: passedSubs } = await admin
    .from("assignment_submissions")
    .select(
      "id, assignment_id, module_assignments:assignment_id(module_id), assignment_reviews!inner(verdict)",
    )
    .eq("user_id", user.id);
  type AssignmentJoin = { module_id: string };
  type RevJoin = { verdict: string };
  type Row = {
    id: string;
    assignment_id: string;
    module_assignments: AssignmentJoin | AssignmentJoin[] | null;
    assignment_reviews: RevJoin | RevJoin[];
  };
  const passedModuleIds = new Set<string>();
  for (const r of (passedSubs ?? []) as Row[]) {
    const reviews = Array.isArray(r.assignment_reviews)
      ? r.assignment_reviews
      : [r.assignment_reviews];
    if (!reviews.some((rev) => rev.verdict === "pass")) continue;
    const a = Array.isArray(r.module_assignments)
      ? r.module_assignments[0]
      : r.module_assignments;
    if (a?.module_id) passedModuleIds.add(a.module_id);
  }

  const starter = `${lab.basePath}/${lab.starterTrackSlug}`;

  return (
    <>
      <Topbar
        displayName={profile?.display_name ?? "Operator"}
        avatarUrl={profile?.avatar_url}
        subtitle={track.tagline ?? track.title}
      />
      <div className="px-6 lg:px-8 pb-12">
        <Link
          href={lab.basePath}
          className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-text-muted hover:text-gold-300 transition-colors"
        >
          <ArrowLeft className="size-3.5" /> All tracks
        </Link>

        <header className="mt-6 mb-10 max-w-3xl">
          <span className="badge-gold inline-flex items-center gap-1">
            <Trophy className="size-3" /> {lab.badgeLabel} · Track
          </span>
          <h1 className="mt-3 font-display text-4xl sm:text-5xl tracking-tight gold-text">
            {track.title}
          </h1>
          {track.description && (
            <p className="mt-3 text-text-secondary leading-relaxed">
              {track.description}
            </p>
          )}
        </header>

        {!track.is_active && (
          <div className="card-premium p-8 max-w-2xl">
            <div className="flex items-center gap-3 mb-3">
              <Lock className="size-5 text-gold-300" />
              <h2 className="text-lg font-semibold tracking-tight text-text-primary">
                Coming soon
              </h2>
            </div>
            <p className="text-sm text-text-secondary leading-relaxed">
              This track is in development. Begin with{" "}
              <Link
                href={starter}
                className="text-gold-300 underline underline-offset-4"
              >
                the starter track
              </Link>{" "}
              in {lab.badgeLabel}.
            </p>
          </div>
        )}

        {track.is_active && (
          <ol className="space-y-4 max-w-3xl">
            {(modules ?? []).map((m, i) => {
              const lessons = (lessonsAll ?? []).filter(
                (l) => (l.module_id as string) === m.id,
              );
              const lessonsCompleted = lessons.filter((l) =>
                completed.has(l.id as string),
              ).length;
              const unlocked = unlockMap.get(m.id as string) ?? false;
              const passed = passedModuleIds.has(m.id as string);
              const isLast = i === (modules ?? []).length - 1;
              return (
                <li key={m.id as string} className="relative">
                  {!isLast && (
                    <span
                      aria-hidden
                      className="absolute left-[19px] top-12 bottom-[-16px] w-px bg-border-subtle"
                    />
                  )}
                  <div className="flex items-start gap-4">
                    <div
                      className={`relative z-10 flex size-10 shrink-0 items-center justify-center rounded-full border ${
                        passed
                          ? "border-emerald-500/60 bg-emerald-500/10 text-emerald-300"
                          : unlocked
                            ? "border-gold-500/60 bg-gold-500/10 text-gold-300"
                            : "border-white/10 bg-white/[0.02] text-text-muted"
                      }`}
                    >
                      {passed ? (
                        <CheckCircle2 className="size-5" />
                      ) : unlocked ? (
                        <span className="font-display text-base">
                          {(m.ord as number) + 1}
                        </span>
                      ) : (
                        <Lock className="size-4" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <ModuleCard
                        basePath={lab.basePath}
                        trackSlug={track.slug as string}
                        moduleId={m.id as string}
                        title={m.title as string}
                        summary={(m.summary as string) ?? ""}
                        ord={m.ord as number}
                        xpReward={m.xp_reward as number}
                        unlocked={unlocked}
                        passed={passed}
                        lessonsCompleted={lessonsCompleted}
                        lessonsTotal={lessons.length}
                        books={booksByModule.get(m.id as string) ?? []}
                        lessons={lessons.map((l) => ({
                          id: l.id as string,
                          ord: l.ord as number,
                          title: l.title as string,
                          completed: completed.has(l.id as string),
                          minutes: (l.estimated_minutes as number) ?? 8,
                        }))}
                      />
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </>
  );
}

function ModuleCard({
  basePath,
  trackSlug,
  moduleId,
  title,
  summary,
  ord,
  xpReward,
  unlocked,
  passed,
  lessonsCompleted,
  lessonsTotal,
  books,
  lessons,
}: {
  basePath: string;
  trackSlug: string;
  moduleId: string;
  title: string;
  summary: string;
  ord: number;
  xpReward: number;
  unlocked: boolean;
  passed: boolean;
  lessonsCompleted: number;
  lessonsTotal: number;
  books: {
    id: string;
    ord: number;
    title: string;
    author: string | null;
    url: string | null;
    notes: string | null;
  }[];
  lessons: {
    id: string;
    ord: number;
    title: string;
    completed: boolean;
    minutes: number;
  }[];
}) {
  const p = `${basePath}/${trackSlug}/${moduleId}`;
  return (
    <div className={`card-premium p-6 ${unlocked ? "" : "opacity-60"}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-[0.22em] text-gold-300/80">
            Module {ord + 1}
          </div>
          <h3 className="mt-1 font-display text-2xl tracking-tight text-text-primary">
            {title}
          </h3>
          {summary && (
            <p className="mt-2 text-sm text-text-muted leading-relaxed">
              {summary}
            </p>
          )}
        </div>
        <div className="text-right shrink-0">
          {passed ? (
            <span className="badge-success">Passed</span>
          ) : unlocked ? (
            <span className="badge-gold">+{xpReward} XP</span>
          ) : (
            <span className="badge-muted">Locked</span>
          )}
        </div>
      </div>

      {books.length > 0 && (
        <div className="mt-5">
          <div className="text-[10px] uppercase tracking-[0.22em] text-text-muted mb-2">
            Books to read
          </div>
          {unlocked ? (
            <ul className="space-y-2">
              {books.map((b) => (
                <li
                  key={b.id}
                  className="rounded-xl border border-border-subtle bg-white/[0.02] px-3 py-2.5"
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-text-primary">
                        {b.url ? (
                          <a
                            href={b.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline-offset-4 hover:text-gold-300 hover:underline"
                          >
                            {b.title}
                          </a>
                        ) : (
                          b.title
                        )}
                      </p>
                      {b.author && (
                        <p className="text-xs text-text-muted mt-0.5">{b.author}</p>
                      )}
                      {b.notes && (
                        <p className="text-xs text-text-secondary mt-1.5 leading-relaxed">
                          {b.notes}
                        </p>
                      )}
                    </div>
                    <ModuleBookAddCoachTaskButton
                      bookId={b.id}
                      moduleId={moduleId}
                    />
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-text-muted italic">
              {books.length} book{books.length === 1 ? "" : "s"} listed — unlock
              to add them to Coach tasks.
            </p>
          )}
        </div>
      )}

      {lessonsTotal > 0 && (
        <div className="mt-5">
          <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.18em] text-text-muted mb-1.5">
            <span>Progress</span>
            <span>
              {lessonsCompleted}/{lessonsTotal} lessons
            </span>
          </div>
          <div className="skill-bar-track">
            <div
              className="skill-bar-fill"
              style={{
                width: `${
                  lessonsTotal === 0
                    ? 0
                    : Math.round((lessonsCompleted / lessonsTotal) * 100)
                }%`,
              }}
            />
          </div>
        </div>
      )}

      {unlocked && (
        <ul className="mt-5 space-y-1.5">
          {lessons.map((l) => (
            <li key={l.id}>
              <Link
                href={`${p}/${l.id}`}
                className="flex items-center justify-between gap-3 rounded-xl border border-transparent px-3 py-2 hover:border-border-gold hover:bg-white/[0.03] transition-all"
              >
                <span className="flex items-center gap-3 min-w-0">
                  <span
                    className={`flex size-6 shrink-0 items-center justify-center rounded-full text-[11px] ${
                      l.completed
                        ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/40"
                        : "bg-white/[0.03] text-text-muted border border-white/10"
                    }`}
                  >
                    {l.completed ? "✓" : l.ord + 1}
                  </span>
                  <span className="text-sm text-text-primary truncate">
                    {l.title}
                  </span>
                </span>
                <span className="text-[10px] uppercase tracking-[0.18em] text-text-muted shrink-0">
                  {l.minutes} min
                </span>
              </Link>
            </li>
          ))}
          <li>
            <Link
              href={`${p}/assignment`}
              className="mt-2 flex items-center justify-between gap-3 rounded-xl border border-gold-500/25 bg-gold-500/[0.04] px-3 py-2.5 hover:border-border-gold hover:bg-gold-500/[0.07] transition-all"
            >
              <span className="flex items-center gap-3 min-w-0">
                <Trophy className="size-4 text-gold-300" />
                <span className="text-sm text-gold-200 font-medium">
                  End-of-module assignment
                </span>
              </span>
              <ArrowRight className="size-4 text-gold-300" />
            </Link>
          </li>
        </ul>
      )}

      {!unlocked && (
        <p className="mt-5 text-xs text-text-muted italic">
          Pass the previous module&apos;s assignment to unlock.
        </p>
      )}
    </div>
  );
}
