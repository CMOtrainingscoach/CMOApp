import { createClient } from "@/lib/supabase/server";
import { Topbar } from "@/components/shell/topbar";
import Link from "next/link";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { ProgressRing } from "@/components/ui/progress-ring";
import { SkillBar } from "@/components/ui/skill-bar";
import {
  overallCmoIndexFromStoredRows,
  skillScoreMapFromRows,
} from "@/lib/skill-progress";
import {
  STRATEGY_LAB,
  PL_LAB,
  LIFESTYLE_LAB,
  CAREER_LAB,
} from "@/lib/strategy/lab-routes";
import {
  getLabUserLevel,
  getOverallUserLevel,
} from "@/lib/strategy/xp";
import {
  computeDisciplineHeatmap,
} from "@/lib/progress/discipline-heatmap";
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
    overallXp,
    strategyXp,
    plXp,
    lifestyleXp,
    careerXp,
    sharedXp,
    heatmapCells,
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("display_name, avatar_url")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("skill_scores")
      .select("skill_key, score")
      .eq("user_id", user.id),
    getOverallUserLevel(user.id),
    getLabUserLevel(user.id, "strategy"),
    getLabUserLevel(user.id, "pl"),
    getLabUserLevel(user.id, "lifestyle"),
    getLabUserLevel(user.id, "career"),
    getLabUserLevel(user.id, "shared"),
    computeDisciplineHeatmap(supabase, user.id),
  ]);

  const skillsBy = skillScoreMapFromRows(skills ?? []);
  const overall = overallCmoIndexFromStoredRows(skills ?? []);

  const cells = heatmapCells;

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
                  {" — "}
                  rolls up Strategy, P&L, Lifestyle, Career, and shared (e.g. streak)
                  bonuses from your live XP log.
                </p>
                {overallXp.next_rank && (
                  <>
                    <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.18em] text-text-muted">
                      <span>To {overallXp.next_rank}</span>
                      <span>{overallXp.remaining_to_next.toLocaleString()} XP left</span>
                    </div>
                    <div className="skill-bar-track h-2">
                      <div
                        className="skill-bar-fill"
                        style={{ width: `${overallXp.pct_to_next}%` }}
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
              <LabXpBreakdownCard
                title="Lifestyle Lab"
                xp={lifestyleXp.total_xp}
                rank={lifestyleXp.rank}
                progressHref={`${LIFESTYLE_LAB.basePath}/progress`}
                labHref={LIFESTYLE_LAB.basePath}
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
              <LabXpBreakdownCard
                title="Career Lab"
                xp={careerXp.total_xp}
                rank={careerXp.rank}
                progressHref={`${CAREER_LAB.basePath}/progress`}
                labHref={CAREER_LAB.basePath}
              />
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
                {overallXp.current_streak} day streak
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
                        title={
                          c.xpSum > 0
                            ? `${c.date}: ${c.xpSum.toLocaleString()} XP`
                            : c.hadFallbackActivity
                              ? `${c.date}: Study / coach activity (no XP logged)`
                              : `${c.date}: rest`
                        }
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
            const score = skillsBy.get(key);
            const barValue = score ?? 0;

            return (
              <Card key={key}>
                <CardHeader className="space-y-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-[10px] uppercase tracking-[0.22em] text-gold-500">
                        {SKILL_LABELS[key].toUpperCase()}
                      </div>
                      <CardTitle className="mt-2 text-lg leading-snug">
                        <span className="inline-flex items-center gap-2">
                          <Target className="size-3.5 shrink-0" />
                          {SKILL_LABELS[key]}
                        </span>
                      </CardTitle>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="font-mono text-sm text-text-primary">
                        {score !== undefined ? `${score}/100` : "—"}
                      </div>
                      <div className="font-mono text-xs text-gold-300 mt-0.5">
                        {score !== undefined ? `${score}%` : ""}
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardBody className="space-y-3">
                  <SkillBar value={barValue} />
                  <p className="text-sm text-text-muted leading-relaxed">
                    {SKILL_BLURB[key]}
                  </p>
                  <div className="text-[11px] tracking-[0.16em] uppercase text-gold-500 inline-flex items-center gap-1.5">
                    <Trophy className="size-3" />{" "}
                    {score === undefined
                      ? "Not assessed yet"
                      : score >= 85
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
