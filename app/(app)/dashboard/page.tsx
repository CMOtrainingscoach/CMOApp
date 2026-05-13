import { createClient } from "@/lib/supabase/server";
import { ensureTodayMission, generateProfessorBriefing } from "@/lib/coach";
import { computeDailyMissionProgressPercent } from "@/lib/dashboard/mission-progress";
import { loadDashboardLabTrackSnapshot } from "@/lib/dashboard/current-strategy-track";
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

  const mission = await ensureTodayMission(user.id);

  const [
    { data: profile },
    { data: skills },
    { data: tasks },
    { data: docs },
    { data: recentMemories },
    professorCfg,
    labSnap,
    missionProgressPct,
    notifQuery,
    { data: lessonActivity },
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
      .from("tasks")
      .select(
        "id, title, status, deadline, created_at, completed_at",
      )
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
    getProfessorConfig(),
    loadDashboardLabTrackSnapshot(user.id),
    computeDailyMissionProgressPercent(supabase, user.id, mission),
    supabase
      .from("tasks")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .in("status", ["pending", "in_progress"]),
    supabase
      .from("lesson_progress")
      .select(
        `
        lesson_id,
        completed_at,
        strategy_lessons ( title )
      `,
      )
      .eq("user_id", user.id)
      .eq("status", "completed")
      .not("completed_at", "is", null)
      .order("completed_at", { ascending: false })
      .limit(8),
  ]);

  const displayName =
    profile?.display_name ?? user.email?.split("@")[0] ?? "Operator";

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

  // Upcoming events: tasks with deadlines
  const upcoming = (tasks ?? [])
    .filter((t) => t.deadline)
    .sort(
      (a, b) =>
        new Date(a.deadline as string).getTime() -
        new Date(b.deadline as string).getTime(),
    )
    .slice(0, 3)
    .map((t) => ({
      id: t.id,
      title: t.title,
      deadline: t.deadline as string,
    }));

  type LessonProgressRow = {
    lesson_id: string;
    completed_at: string;
    strategy_lessons:
      | { title: string | null }
      | { title: string | null }[]
      | null;
  };

  function embeddedLessonTitle(row: LessonProgressRow): string {
    const s = row.strategy_lessons;
    if (!s) return "Lesson";
    const obj = Array.isArray(s) ? s[0] : s;
    return obj?.title?.trim() || "Lesson";
  }

  const notifications = Math.min(99, Math.max(0, notifQuery.count ?? 0));

  const activity: ActivityItem[] = [
    ...(lessonActivity ?? []).map((raw) => {
      const lp = raw as LessonProgressRow;
      return {
        id: `lesson-${lp.lesson_id}`,
        kind: "feedback" as const,
        title: `Completed lesson: ${embeddedLessonTitle(lp)}`,
        at: lp.completed_at,
      };
    }),
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
        at: t.completed_at ?? t.created_at,
      })),
  ]
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, 4);

  return (
    <>
      <Topbar
        displayName={displayName}
        avatarUrl={profile?.avatar_url}
        notifications={notifications}
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
            progress={missionProgressPct}
          />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <YourProgress
              overall={overall}
              skills={skillRowsNormalized.slice(0, 5)}
            />
            <CurrentTrack
              trackTitle={labSnap.trackTitleDisplay}
              trackDescription={labSnap.trackDescription}
              trackIndex={labSnap.trackIndex}
              trackTotal={labSnap.trackTotalInLab}
              percent={labSnap.percent}
              nextLessonTitle={labSnap.nextLessonTitle}
              nextLessonSub={labSnap.nextLessonSub}
              nextLessonHref={labSnap.nextLessonHref ?? labSnap.continueLearningHref}
              continueLearningHref={labSnap.continueLearningHref}
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
