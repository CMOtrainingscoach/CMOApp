import { createClient } from "@/lib/supabase/server";
import { Topbar } from "@/components/shell/topbar";
import Link from "next/link";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { ProgressRing } from "@/components/ui/progress-ring";
import { SkillBar } from "@/components/ui/skill-bar";
import { normalizeSkillRows, overallFromSkillRows } from "@/lib/skill-progress";
import { STRATEGY_LAB, PL_LAB } from "@/lib/strategy/lab-routes";
import {
  getLabUserLevel,
  getOverallUserLevel,
  progressToNextRank,
} from "@/lib/strategy/xp";
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

  const [
    { data: profile },
    { data: skills },
    { data: missions },
    overallXp,
    strategyXp,
    plXp,
    sharedXp,
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
      .from("daily_missions")
      .select("mission_date, progress_percent")
      .eq("user_id", user.id)
      .order("mission_date", { ascending: false })
      .limit(60),
    getOverallUserLevel(user.id),
    getLabUserLevel(user.id, "strategy"),
    getLabUserLevel(user.id, "pl"),
    getLabUserLevel(user.id, "shared"),
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

  const overallRankProg = progressToNextRank(overallXp.total_xp);

  return (
    <>
      <Topbar
        displayName={profile?.display_name ?? "Operator"}
        avatarUrl={profile?.avatar_url}
        subtitle="Track development across the eight pillars of CMO mastery."
      />
      <div className="px-6 lg:px-8 pb-12 space-y-5">
        <section className="space-y-3">
          <h2 className="font-display text-xl tracking-tight gold-text inline-flex items-center gap-2">
            <Trophy className="size-4 text-gold-400" /> Ascension XP · all labs
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Overall</CardTitle>
                <span className="text-[11px] tracking-[0.16em] uppercase text-text-muted">
                  Rank {overallXp.rank} · Level {overallXp.level}
                </span>
              </CardHeader>
              <CardBody className="space-y-3">
                <p className="text-sm text-text-muted">
                  Total{" "}
                  <span className="text-gold-300 font-medium">
                    {overallXp.total_xp.toLocaleString()} XP
                  </span>
                  {" — "}sums Strategy, P&L, future labs, and cross-lab bonuses.
                </p>
                {overallXp.next_rank && (
                  <>
                    <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.18em] text-text-muted">
                      <span>To {overallXp.next_rank}</span>
                      <span>{overallXp.remaining_to_next} XP left</span>
                    </div>
                    <div className="skill-bar-track h-2">
                      <div
                        className="skill-bar-fill"
                        style={{ width: `${overallRankProg.pct}%` }}
                      />
                    </div>
                  </>
                )}
              </CardBody>
            </Card>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <LabXpBreakdownCard
                title="Strategy Lab"
                xp={strategyXp.total_xp}
                rank={strategyXp.rank}
                progressHref={`${STRATEGY_LAB.basePath}/progress`}
                labHref={STRATEGY_LAB.basePath}
              />
              <LabXpBreakdownCard
                title="P&L Lab"
                xp={plXp.total_xp}
                rank={plXp.rank}
                progressHref={`${PL_LAB.basePath}/progress`}
                labHref={PL_LAB.basePath}
              />
              <div className="card-premium p-5 flex flex-col justify-between">
                <div>
                  <div className="text-[10px] uppercase tracking-[0.22em] text-gold-500">
                    Cross-lab
                  </div>
                  <div className="mt-2 font-display text-2xl gold-text">{sharedXp.rank}</div>
                  <p className="mt-2 text-[11px] text-text-muted leading-relaxed">
                    {sharedXp.total_xp.toLocaleString()} XP from streak milestones and other
                    account-wide bonuses. Counts toward your overall rank.
                  </p>
                </div>
              </div>
              <ComingSoonLabCard />
            </div>
          </div>
        </section>

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

function LabXpBreakdownCard({
  title,
  xp,
  rank,
  labHref,
  progressHref,
}: {
  title: string;
  xp: number;
  rank: string;
  labHref: string;
  progressHref: string;
}) {
  return (
    <div className="card-premium p-5 flex flex-col gap-4">
      <div>
        <div className="text-[10px] uppercase tracking-[0.22em] text-text-muted">
          {title}
        </div>
        <div className="mt-2 font-display text-xl gold-text truncate">{rank}</div>
        <p className="mt-2 text-xs text-text-muted">
          <span className="text-gold-300 font-medium">{xp.toLocaleString()}</span> XP in this
          lab
        </p>
      </div>
      <div className="flex flex-wrap gap-2 mt-auto">
        <Link href={labHref} className="btn-ghost px-3 py-2 text-[11px] uppercase tracking-[0.16em]">
          Open lab
        </Link>
        <Link
          href={progressHref}
          className="btn-ghost px-3 py-2 text-[11px] uppercase tracking-[0.16em] text-text-muted"
        >
          Lab XP log
        </Link>
      </div>
    </div>
  );
}

function ComingSoonLabCard() {
  return (
    <div className="rounded-xl border border-dashed border-border-subtle bg-white/[0.02] p-5 flex flex-col justify-center opacity-75">
      <div className="text-[10px] uppercase tracking-[0.22em] text-text-muted">
        Lifestyle · Career labs
      </div>
      <p className="mt-3 text-sm text-text-secondary leading-relaxed">
        More labs unlock on the same XP rails. Your overall rank keeps climbing as we ship them.
      </p>
      <span className="badge-muted mt-4 self-start">Coming soon</span>
    </div>
  );
}
