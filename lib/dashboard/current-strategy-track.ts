import "server-only";

import { cache } from "react";

import { labContentBasePath } from "@/lib/strategy/lab-routes";
import type { ContentLabSlug } from "@/lib/strategy/lab-slug";
import { createClient } from "@/lib/supabase/server";

const LAB_ORDER: ContentLabSlug[] = ["strategy", "pl", "lifestyle", "career"];

function labRank(slug: string): number {
  const i = LAB_ORDER.indexOf(slug as ContentLabSlug);
  return i >= 0 ? i : LAB_ORDER.length;
}

function coerceLabSlug(s: string): ContentLabSlug {
  if (
    s === "strategy" ||
    s === "pl" ||
    s === "lifestyle" ||
    s === "career"
  )
    return s;
  return "strategy";
}

type TrackRow = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  tagline: string | null;
  lab_slug: string;
  ord: number;
};

type LessonNode = {
  id: string;
  module_id: string;
  title: string;
  learning_objective: string | null;
  lesson_ord: number;
};

type ProgressRow = {
  lesson_id: string;
  status: string;
  last_seen_at: string;
  completed_at: string | null;
};

export type DashboardLabTrackSnapshot = {
  /** Primary track title for coach context */
  trackTitle: string | null;
  trackSlug: string;
  trackTitleDisplay: string;
  trackDescription: string;
  labSlug: ContentLabSlug;
  basePath: string;
  /** 1-based index within this lab (active tracks ordered by ord) */
  trackIndex: number;
  trackTotalInLab: number;
  percent: number;
  totalLessons: number;
  completedLessons: number;
  nextLessonTitle: string;
  nextLessonSub: string;
  nextLessonHref: string | null;
  continueLearningHref: string;
};

const EMPTY_SNAPSHOT: DashboardLabTrackSnapshot = {
  trackTitle: null,
  trackSlug: "",
  trackTitleDisplay: "Labs",
  trackDescription:
    "Open Strategy, P&L, or Lifestyle lab to continue your reps and track.",
  labSlug: "strategy",
  basePath: labContentBasePath("strategy"),
  trackIndex: 1,
  trackTotalInLab: 1,
  percent: 0,
  totalLessons: 0,
  completedLessons: 0,
  nextLessonTitle: "Choose a lab",
  nextLessonSub: "Pick a published track and start the next lesson.",
  nextLessonHref: "/strategy-lab",
  continueLearningHref: "/strategy-lab",
};

export const loadDashboardLabTrackSnapshot = cache(
  async (userId: string): Promise<DashboardLabTrackSnapshot> => {
    const supabase = await createClient();

    const [{ data: tracksRaw }, { data: progress }] = await Promise.all([
      supabase
        .from("strategy_tracks")
        .select("id, slug, title, description, tagline, lab_slug, ord, is_active")
        .eq("is_active", true),
      supabase
        .from("lesson_progress")
        .select("lesson_id, status, last_seen_at, completed_at")
        .eq("user_id", userId),
    ]);

    const tracks = (tracksRaw ?? []) as TrackRow[];
    if (!tracks.length) return { ...EMPTY_SNAPSHOT };

    const sortedTracks = [...tracks].sort((a, b) => {
      const lr = labRank(a.lab_slug) - labRank(b.lab_slug);
      if (lr !== 0) return lr;
      return a.ord - b.ord;
    });

    const trackIds = sortedTracks.map((t) => t.id);
    const { data: modulesRaw } = await supabase
      .from("strategy_modules")
      .select("id, track_id, ord")
      .in("track_id", trackIds)
      .order("ord", { ascending: true });

    const modulesByTrack = new Map<string, { id: string; ord: number }[]>();
    for (const m of modulesRaw ?? []) {
      const tid = (m as { track_id: string }).track_id;
      const list = modulesByTrack.get(tid) ?? [];
      list.push({ id: (m as { id: string }).id, ord: (m as { ord: number }).ord });
      modulesByTrack.set(tid, list);
    }

    const moduleIds = [
      ...new Set((modulesRaw ?? []).map((m) => (m as { id: string }).id)),
    ];

    let lessonsRaw: Record<string, unknown>[] = [];
    if (moduleIds.length) {
      const { data: lessons } = await supabase
        .from("strategy_lessons")
        .select("id, module_id, ord, title, learning_objective")
        .in("module_id", moduleIds)
        .order("ord", { ascending: true });
      lessonsRaw = (lessons ?? []) as Record<string, unknown>[];
    }

    const lessonsByModule = new Map<string, LessonNode[]>();
    for (const row of lessonsRaw) {
      const mid = row.module_id as string;
      const list = lessonsByModule.get(mid) ?? [];
      list.push({
        id: row.id as string,
        module_id: mid,
        title: row.title as string,
        learning_objective: (row.learning_objective as string | null) ?? null,
        lesson_ord: row.ord as number,
      });
      lessonsByModule.set(mid, list);
    }

    function orderedLessonsForTrack(track: TrackRow): LessonNode[] {
      const mods = (modulesByTrack.get(track.id) ?? [])
        .slice()
        .sort((a, b) => a.ord - b.ord);
      const out: LessonNode[] = [];
      for (const mod of mods) {
        const les = (lessonsByModule.get(mod.id) ?? [])
          .slice()
          .sort((a, b) => a.lesson_ord - b.lesson_ord);
        for (const lesson of les) {
          out.push(lesson);
        }
      }
      return out;
    }

    const progMap = new Map<string, ProgressRow>(
      ((progress ?? []) as ProgressRow[]).map((p) => [
        p.lesson_id,
        {
          lesson_id: p.lesson_id,
          status: p.status,
          last_seen_at: p.last_seen_at,
          completed_at: p.completed_at ?? null,
        },
      ]),
    );

    const lessonToTrackId = new Map<string, string>();
    for (const track of sortedTracks) {
      for (const l of orderedLessonsForTrack(track)) {
        lessonToTrackId.set(l.id, track.id);
      }
    }

    /** Track that contains the user's most recently completed lesson (`completed_at`). */
    let lastCompletedTrackId: string | null = null;
    let bestCompletedMs = -1;
    for (const p of progMap.values()) {
      if (p.status !== "completed" || !p.completed_at) continue;
      const ms = Date.parse(p.completed_at);
      if (!Number.isFinite(ms) || ms <= bestCompletedMs) continue;
      bestCompletedMs = ms;
      const tid = lessonToTrackId.get(p.lesson_id);
      if (tid) lastCompletedTrackId = tid;
    }

    type Cand = {
      track: TrackRow;
      lessons: LessonNode[];
      incomplete: boolean;
      maxSeen: number;
    };

    const candidates: Cand[] = [];
    for (const track of sortedTracks) {
      const lessons = orderedLessonsForTrack(track);
      let maxSeen = 0;
      let incomplete = false;
      for (const l of lessons) {
        const pr = progMap.get(l.id);
        if (pr) {
          const ts = Date.parse(pr.last_seen_at);
          if (Number.isFinite(ts) && ts > maxSeen) maxSeen = ts;
        }
        if (!pr || pr.status !== "completed") incomplete = true;
      }
      candidates.push({ track, lessons, incomplete, maxSeen });
    }

    const withLessons = candidates.filter((c) => c.lessons.length > 0);
    let chosen: TrackRow;
    let chosenLessons: LessonNode[];

    const fromLastCompletion =
      lastCompletedTrackId &&
      sortedTracks.find((t) => t.id === lastCompletedTrackId);

    if (fromLastCompletion) {
      chosen = fromLastCompletion;
      chosenLessons = orderedLessonsForTrack(chosen);
    } else if (withLessons.length) {
      const incompletePool = withLessons.filter((c) => c.incomplete);
      const pool = incompletePool.length ? incompletePool : withLessons;
      pool.sort((a, b) => {
        if (b.maxSeen !== a.maxSeen) return b.maxSeen - a.maxSeen;
        const lab = labRank(a.track.lab_slug) - labRank(b.track.lab_slug);
        if (lab !== 0) return lab;
        return a.track.ord - b.track.ord;
      });
      const pick = pool[0]!;
      chosen = pick.track;
      chosenLessons = pick.lessons;
    } else {
      chosen = sortedTracks[0]!;
      chosenLessons = [];
    }

    const labSlug = coerceLabSlug(chosen.lab_slug);
    const basePath = labContentBasePath(labSlug);
    const sameLabTracks = sortedTracks.filter((t) => t.lab_slug === chosen.lab_slug);
    const trackIndex = Math.max(
      1,
      sameLabTracks.findIndex((t) => t.id === chosen.id) + 1,
    );
    const trackTotalInLab = Math.max(1, sameLabTracks.length);

    const totalLessons = chosenLessons.length;
    const completedLessons = chosenLessons.filter(
      (l) => progMap.get(l.id)?.status === "completed",
    ).length;

    let percent =
      totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;
    percent = Math.min(100, Math.max(0, percent));

    let next: LessonNode | null = null;
    for (const l of chosenLessons) {
      const pr = progMap.get(l.id);
      if (!pr || pr.status !== "completed") {
        next = l;
        break;
      }
    }
    if (!next && chosenLessons.length)
      next = chosenLessons[chosenLessons.length - 1]!;

    const trackHomeHref = `${basePath}/${chosen.slug}`;
    const nextLessonHref = next
      ? `${basePath}/${chosen.slug}/${next.module_id}/${next.id}`
      : trackHomeHref;

    const nextLessonTitle = next?.title ?? chosen.title;
    const nextLessonSub =
      next?.learning_objective?.trim() ||
      chosen.tagline?.trim() ||
      chosen.description?.trim() ||
      "Continue where you left off.";

    return {
      trackTitle: chosen.title,
      trackSlug: chosen.slug,
      trackTitleDisplay: chosen.title,
      trackDescription:
        chosen.description?.trim() ||
        chosen.tagline?.trim() ||
        "Practice-led curriculum with Coach, XP, and assignments.",
      labSlug,
      basePath,
      trackIndex,
      trackTotalInLab,
      percent,
      totalLessons,
      completedLessons,
      nextLessonTitle,
      nextLessonSub,
      nextLessonHref,
      continueLearningHref: nextLessonHref,
    };
  },
);
