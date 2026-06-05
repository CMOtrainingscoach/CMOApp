import Link from "next/link";
import {
  ShieldCheck,
  Sparkles,
  Clock,
  AtSign,
  BookOpen,
  ArrowRight,
  TrendingUp,
  Puzzle,
  Map,
} from "lucide-react";
import { Topbar } from "@/components/shell/topbar";
import {
  Card,
  CardBody,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ADMIN_EMAIL, requireAdmin } from "@/lib/admin";
import { getProfessorConfigAdmin } from "@/lib/professor-config.server";
import { createClient } from "@/lib/supabase/server";
import { timeAgo } from "@/lib/utils";
import { AdminForm } from "./admin-form";
import { AvatarUploader } from "./avatar-uploader";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const adminUser = await requireAdmin();
  const supabase = await createClient();

  const [{ data: profile }, cfg] = await Promise.all([
    supabase
      .from("profiles")
      .select("display_name, avatar_url")
      .eq("id", adminUser.id)
      .maybeSingle(),
    getProfessorConfigAdmin(),
  ]);

  return (
    <>
      <Topbar
        displayName={profile?.display_name ?? "Admin"}
        avatarUrl={profile?.avatar_url}
        subtitle="Configure the AI Professor's identity, voice, and avatar."
      />
      <div className="px-6 lg:px-8 pb-12 grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-5">
        <div className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle>
                <Sparkles className="size-3.5" /> Professor portrait
              </CardTitle>
            </CardHeader>
            <CardBody>
              <AvatarUploader
                initialUrl={cfg.professor_avatar_url}
                professorName={cfg.professor_name}
              />
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>
                <Puzzle className="size-3.5" /> Minigames
              </CardTitle>
            </CardHeader>
            <CardBody>
              <p className="text-sm text-text-secondary leading-relaxed mb-4">
                Upload banner images for the P&amp;L and Strategy jargon matchup practice games.
              </p>
              <Link
                href="/admin/minigames"
                className="btn-gold px-4 py-2 inline-flex items-center gap-2 text-sm"
              >
                Open minigame headers
                <ArrowRight className="size-4" />
              </Link>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>
                <Map className="size-3.5" /> CMO Life roadmap
              </CardTitle>
            </CardHeader>
            <CardBody>
              <p className="text-sm text-text-secondary leading-relaxed mb-4">
                Define the global, sequential Progress tab path: lesson-linked and custom
                milestones with optional rewards (copy and images).
              </p>
              <Link
                href="/admin/cmo-life"
                className="btn-gold px-4 py-2 inline-flex items-center gap-2 text-sm"
              >
                Edit CMO Life
                <ArrowRight className="size-4" />
              </Link>
            </CardBody>
          </Card>

          <AdminForm initial={cfg} />

          <Card>
            <CardHeader>
              <CardTitle>
                <BookOpen className="size-3.5" /> Strategy Lab CMS
              </CardTitle>
            </CardHeader>
            <CardBody>
              <p className="text-sm text-text-secondary leading-relaxed mb-4">
                Author curriculum for Strategy Lab, P&amp;L, Lifestyle, and Career:
                tracks, modules, lessons, assignments, and rewards.
                Regenerate AI-cached theory and mini-games per lesson.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Link
                  href="/admin/strategy"
                  className="btn-gold px-4 py-2 inline-flex items-center justify-center gap-2 text-sm"
                >
                  Open Strategy CMS
                  <ArrowRight className="size-4" />
                </Link>
                <Link
                  href="/admin/strategy?lab=career"
                  className="btn-ghost px-4 py-2 inline-flex items-center justify-center gap-2 text-sm border border-border-subtle"
                >
                  Open Career CMS
                  <ArrowRight className="size-4" />
                </Link>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>
                <TrendingUp className="size-3.5" /> Ascension XP ranks
              </CardTitle>
            </CardHeader>
            <CardBody>
              <p className="text-sm text-text-secondary leading-relaxed mb-4">
                Edit all 101 levels (Initiate → Visionary CMO): rank titles shown
                in the app plus the total XP thresholds that advance learners.
              </p>
              <Link
                href="/admin/xp-levels"
                className="btn-gold px-4 py-2 inline-flex items-center gap-2 text-sm"
              >
                Configure XP levels
                <ArrowRight className="size-4" />
              </Link>
            </CardBody>
          </Card>
        </div>

        <div className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle>
                <ShieldCheck className="size-3.5" /> Admin status
              </CardTitle>
            </CardHeader>
            <CardBody className="space-y-3 text-sm">
              <Row icon={<AtSign className="size-3.5" />} label="Admin email">
                <span className="font-mono text-gold-300 break-all">
                  {ADMIN_EMAIL}
                </span>
              </Row>
              <Row icon={<AtSign className="size-3.5" />} label="Signed in as">
                <span className="text-text-primary break-all">
                  {adminUser.email}
                </span>
              </Row>
              <Row icon={<Clock className="size-3.5" />} label="Last updated">
                <span className="text-text-secondary">
                  {cfg.updated_at && new Date(cfg.updated_at).getTime() > 0
                    ? timeAgo(cfg.updated_at)
                    : "never"}
                </span>
              </Row>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>How this works</CardTitle>
            </CardHeader>
            <CardBody className="space-y-2 text-sm text-text-secondary leading-relaxed">
              <p>
                Changes are applied instantly to every surface that renders the
                Professor: the dashboard portrait card, the chat header and
                bubbles, the morning briefing, and every chat completion via
                <code className="mx-1 px-1.5 py-0.5 rounded bg-white/5 text-gold-300 font-mono text-xs">
                  /api/chat
                </code>
                .
              </p>
              <p>
                The structured controls compile into a system prompt at runtime.
                The <em>advanced override</em> textarea, if non-empty,
                replaces it entirely.
              </p>
              <p>
                The avatar is stored in a public Supabase Storage bucket
                <code className="mx-1 px-1.5 py-0.5 rounded bg-white/5 text-gold-300 font-mono text-xs">
                  cmo-public
                </code>
                with admin-only writes.
              </p>
            </CardBody>
          </Card>
        </div>
      </div>
    </>
  );
}

function Row({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border-hairline bg-bg-elevated/40 px-3 py-2">
      <div className="text-[10px] tracking-[0.18em] uppercase text-text-muted inline-flex items-center gap-1.5 mb-0.5">
        {icon}
        {label}
      </div>
      <div className="text-sm">{children}</div>
    </div>
  );
}
