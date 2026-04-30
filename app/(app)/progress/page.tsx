import { createClient } from "@/lib/supabase/server";
import { Topbar } from "@/components/shell/topbar";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { ProgressRing } from "@/components/ui/progress-ring";
import { SkillBar } from "@/components/ui/skill-bar";
import { normalizeSkillRows, overallFromSkillRows } from "@/lib/skill-progress";
import { SKILL_KEYS, SKILL_LABELS, type SkillKey } from "@/types/database";
import { Flame, TrendingUp, Trophy, Target } from "lucide-react";

export const dynamic = "force-dynamic";

const SKILL_BLURB: Record<SkillKey, string> = {
  strategic_thinking:
    "Frameworks, choices, and prioritization. The ability to choose what NOT to do.",
  finance_pl:
    "Read a P&L, drive contribution margin, defend a marketing investment with numbers.",
  lead_gen: "Build a measurable, repeatable demand engine with payback discipline.",
  brand: "Positioning, narrative, and category leadership.",
  leadership: "Hire, lead, and scale a team that compounds quarter over quarter.",
  exec_comm: "Translate strategy into financial impact. Speak CFO and CEO.",
  ai_marketing:
    "Use AI as marketing infrastructure — orchestration, memory, and leverage.",
  lifestyle:
    "Deep work, training, sleep, focus. Executive performance is a body sport.",
};

export default async function ProgressPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: profile }, { data: skills }, { data: missions }] =
    await Promise.all([
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
        .from("daily_missions")
        .select("mission_date, progress_percent")
        .eq("user_id", user.id)
        .order("mission_date", { ascending: false })
        .limit(60),
    ]);

  const skillsOrdered = normalizeSkillRows(skills ?? []);
  const skillsBy = new Map<SkillKey, number>(
    skillsOrdered.map((s) => [s.skill_key, s.score]),
  );
  const overall = overallFromSkillRows(skills ?? []);

  // Streak heatmap data: 12 weeks
  const days = 84;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const missionMap = new Map(
    (missions ?? []).map((m) => [m.mission_date, m.progress_percent]),
  );
  const cells: { date: string; intensity: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const ymd = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const v = missionMap.get(ymd) ?? 0;
    const intensity = v >= 100 ? 3 : v >= 60 ? 2 : v > 0 ? 1 : 0;
    cells.push({ date: ymd, intensity });
  }

  return (
    <>
      <Topbar
        displayName={profile?.display_name ?? "Operator"}
        avatarUrl={profile?.avatar_url}
        subtitle="Track development across the eight pillars of CMO mastery."
      />
      <div className="px-6 lg:px-8 pb-12 space-y-5">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>
                <TrendingUp className="size-3.5" /> Overall CMO Score
              </CardTitle>
            </CardHeader>
            <CardBody className="flex flex-col items-center gap-4">
              <ProgressRing
                value={overall}
                size={180}
                stroke={11}
                label={String(overall)}
                caption="Cmo Index"
              />
              <p className="text-sm text-text-muted text-center max-w-xs">
                70+ = solid CMO candidate. 85+ = ready for the seat.
              </p>
            </CardBody>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>
                <Flame className="size-3.5" /> 12-Week Discipline
              </CardTitle>
              <span className="text-[11px] tracking-[0.16em] uppercase text-text-muted">
                {profile?.weekly_streak ?? 0} day streak
              </span>
            </CardHeader>
            <CardBody>
              <div
                className="grid gap-1.5"
                style={{ gridTemplateColumns: "repeat(12, minmax(0, 1fr))" }}
              >
                {Array.from({ length: 12 }).map((_, w) => (
                  <div key={w} className="grid gap-1.5" style={{ gridTemplateRows: "repeat(7, minmax(0, 1fr))" }}>
                    {cells.slice(w * 7, w * 7 + 7).map((c) => (
                      <div
                        key={c.date}
                        title={`${c.date}: ${c.intensity > 0 ? "active" : "idle"}`}
                        className="aspect-square rounded-[3px]"
                        style={{
                          backgroundColor:
                            c.intensity === 0
                              ? "rgba(255,255,255,0.04)"
                              : c.intensity === 1
                                ? "rgba(212,175,55,0.25)"
                                : c.intensity === 2
                                  ? "rgba(212,175,55,0.55)"
                                  : "rgba(232,198,110,0.85)",
                        }}
                      />
                    ))}
                  </div>
                ))}
              </div>
              <div className="mt-4 flex items-center gap-3 text-[10px] tracking-[0.18em] uppercase text-text-muted">
                Less
                <div className="flex gap-1">
                  {[0.04, 0.25, 0.55, 0.85].map((a) => (
                    <span
                      key={a}
                      className="size-3 rounded-[3px]"
                      style={{ backgroundColor: `rgba(212,175,55,${a})` }}
                    />
                  ))}
                </div>
                More
              </div>
            </CardBody>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {SKILL_KEYS.map((key) => {
            const score = skillsBy.get(key) ?? 50;
            return (
              <Card key={key}>
                <CardHeader>
                  <CardTitle>
                    <Target className="size-3.5" /> {SKILL_LABELS[key]}
                  </CardTitle>
                  <span className="font-mono text-gold-300 text-sm">{score}/100</span>
                </CardHeader>
                <CardBody className="space-y-3">
                  <SkillBar label={SKILL_LABELS[key]} value={score} />
                  <p className="text-sm text-text-muted leading-relaxed">
                    {SKILL_BLURB[key]}
                  </p>
                  <div className="text-[11px] tracking-[0.16em] uppercase text-gold-500 inline-flex items-center gap-1.5">
                    <Trophy className="size-3" />{" "}
                    {score >= 85
                      ? "CMO-ready"
                      : score >= 70
                        ? "Strong operator"
                        : score >= 50
                          ? "Average — push harder"
                          : "Critical gap"}
                  </div>
                </CardBody>
              </Card>
            );
          })}
        </div>
      </div>
    </>
  );
}
