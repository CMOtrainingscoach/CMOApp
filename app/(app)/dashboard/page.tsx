import { createClient } from "@/lib/supabase/server";
import { ensureTodayMission, generateProfessorBriefing } from "@/lib/coach";
import { getProfessorConfig } from "@/lib/professor-config.server";
import { Topbar } from "@/components/shell/topbar";
import { TodaysMission } from "@/components/dashboard/todays-mission";
import { ProfessorCard } from "@/components/dashboard/professor-card";
import { YourProgress } from "@/components/dashboard/your-progress";
import { CurrentTrack } from "@/components/dashboard/current-track";
import { UpcomingEvents } from "@/components/dashboard/upcoming-events";
import { TasksMissions } from "@/components/dashboard/tasks-missions";
import {
  RecentActivity,
  type ActivityItem,
} from "@/components/dashboard/recent-activity";
import { RecentDocuments } from "@/components/dashboard/recent-documents";
import { QuoteBand } from "@/components/dashboard/quote-band";
import { normalizeSkillRows, overallFromSkillRows } from "@/lib/skill-progress";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [
    { data: profile },
    { data: skills },
    { data: tracks },
    { data: trackProgress },
    { data: tasks },
    { data: docs },
    { data: recentMemories },
    mission,
    professorCfg,
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("display_name, avatar_url, weekly_streak")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("skill_scores")
      .select("skill_key, score")
      .eq("user_id", user.id),
    supabase
      .from("learning_tracks")
      .select("*")
      .order("ord", { ascending: true }),
    supabase
      .from("track_progress")
      .select("track_id, percent, current_lesson_id")
      .eq("user_id", user.id),
    supabase
      .from("tasks")
      .select("id, title, status, deadline, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(8),
    supabase
      .from("documents")
      .select("id, title, mime_type, size, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(6),
    supabase
      .from("memories")
      .select("content")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(8),
    ensureTodayMission(user.id),
    getProfessorConfig(),
  ]);

  const displayName = profile?.display_name ?? user.email?.split("@")[0] ?? "Operator";

  const skillRowsNormalized = normalizeSkillRows(skills ?? []);
  const overall = overallFromSkillRows(skills ?? []);

  const weakest = [...skillRowsNormalized]
    .sort((a, b) => a.score - b.score)
    .slice(0, 2);

  const briefing = await generateProfessorBriefing({
    displayName,
    weakestSkills: weakest,
    recentMemories: (recentMemories ?? []).map((m) => m.content),
  });

  // Current track: the one with active progress, otherwise first
  const allTracks = tracks ?? [];
  const trackProgressMap = new Map(
    (trackProgress ?? []).map((t) => [t.track_id, t]),
  );
  const currentTrack =
    allTracks.find((t) => trackProgressMap.has(t.id)) ?? allTracks[0];
  const currentTrackProgress = currentTrack
    ? trackProgressMap.get(currentTrack.id)
    : null;
  const trackIndex = currentTrack
    ? allTracks.findIndex((t) => t.id === currentTrack.id) + 1
    : 1;

  // Next lesson title
  let nextLessonTitle = "Unit Economics 101";
  let nextLessonSub = "Understand CAC, LTV, Payback Period";
  if (currentTrack) {
    const { data: nextLesson } = await supabase
      .from("lessons")
      .select("title, body")
      .eq("track_id", currentTrack.id)
      .order("ord", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (nextLesson) {
      nextLessonTitle = nextLesson.title;
      nextLessonSub = nextLesson.body ?? nextLessonSub;
    }
  }

  // Upcoming events: tasks with deadlines
  const upcoming = (tasks ?? [])
    .filter((t) => t.deadline)
    .sort(
      (a, b) =>
        new Date(a.deadline as string).getTime() -
        new Date(b.deadline as string).getTime(),
    )
    .slice(0, 3)
    .map((t) => ({ id: t.id, title: t.title, deadline: t.deadline as string }));

  // Activity feed
  const activity: ActivityItem[] = [
    ...(docs ?? []).map((d) => ({
      id: `doc-${d.id}`,
      kind: "upload" as const,
      title: `Uploaded document: ${d.title}`,
      at: d.created_at,
    })),
    ...(tasks ?? [])
      .filter((t) => t.status === "completed" || t.status === "reviewed")
      .map((t) => ({
        id: `task-${t.id}`,
        kind: "feedback" as const,
        title: `Completed task: ${t.title}`,
        at: t.created_at,
      })),
  ]
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, 4);

  return (
    <>
      <Topbar
        displayName={displayName}
        avatarUrl={profile?.avatar_url}
        notifications={3}
        subtitle="Discipline today. Freedom tomorrow. Lead like a CMO."
      />

      <div className="px-6 lg:px-8 pb-12 grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-5">
        {/* Center column */}
        <div className="space-y-5">
          <TodaysMission
            studyItem={mission?.study_item ?? ""}
            taskItem={mission?.task_item ?? ""}
            reflectionPrompt={mission?.reflection_prompt ?? ""}
            lifestyleItem={mission?.lifestyle_item ?? ""}
            progress={mission?.progress_percent ?? 75}
          />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <YourProgress
              overall={overall}
              skills={skillRowsNormalized.slice(0, 5)}
            />
            <CurrentTrack
              trackTitle={currentTrack?.title ?? "P&L and Business Finance"}
              trackDescription={
                currentTrack?.description ??
                "Master the language of business, unit economics, and how marketing drives real profit."
              }
              trackIndex={trackIndex}
              trackTotal={allTracks.length || 8}
              percent={currentTrackProgress?.percent ?? 65}
              nextLessonTitle={nextLessonTitle}
              nextLessonSub={nextLessonSub}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <TasksMissions
              tasks={(tasks ?? []).map((t) => ({
                id: t.id,
                title: t.title,
                status: t.status,
              }))}
            />
            <RecentActivity items={activity} />
          </div>

          <QuoteBand />
        </div>

        {/* Right rail */}
        <div className="space-y-5">
          <ProfessorCard
            briefing={briefing}
            name={professorCfg.professor_name}
            avatarUrl={professorCfg.professor_avatar_url}
          />
          <UpcomingEvents events={upcoming} />
          <RecentDocuments docs={docs ?? []} />
        </div>
      </div>
    </>
  );
}
