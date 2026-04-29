import Link from "next/link";
import { ArrowLeft, BookOpen } from "lucide-react";
import { Topbar } from "@/components/shell/topbar";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdmin } from "@/lib/admin";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { TrackEditorClient } from "./track-editor";

export const dynamic = "force-dynamic";

export default async function StrategyAdminIndex({
  searchParams,
}: {
  searchParams: Promise<{ track?: string }>;
}) {
  const { track: selectedSlug } = await searchParams;
  const adminUser = await requireAdmin();
  const supabase = await createClient();
  const admin = createServiceRoleClient();

  const [{ data: profile }, { data: tracks }] = await Promise.all([
    supabase
      .from("profiles")
      .select("display_name, avatar_url")
      .eq("id", adminUser.id)
      .maybeSingle(),
    admin
      .from("strategy_tracks")
      .select("id, slug, title, tagline, ord, is_active")
      .order("ord", { ascending: true }),
  ]);

  const selected = (tracks ?? []).find((t) => t.slug === selectedSlug) ?? null;

  return (
    <>
      <Topbar
        displayName={profile?.display_name ?? "Admin"}
        avatarUrl={profile?.avatar_url}
        subtitle="Strategy Lab content authoring."
      />
      <div className="px-6 lg:px-8 pb-12 space-y-6">
        <Link
          href="/admin"
          className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-text-muted hover:text-gold-300 transition-colors"
        >
          <ArrowLeft className="size-3.5" /> Admin
        </Link>

        <header className="max-w-3xl">
          <span className="badge-gold inline-flex items-center gap-1">
            <BookOpen className="size-3" /> Strategy Lab CMS
          </span>
          <h1 className="mt-3 font-display text-4xl tracking-tight gold-text">
            Author the curriculum.
          </h1>
          <p className="mt-2 text-text-muted">
            Pick a track, edit modules, lessons, the end-of-module assignment,
            and the reward. Theory and mini-games regenerate on demand.
          </p>
        </header>

        <Card>
          <CardHeader>
            <CardTitle>Tracks</CardTitle>
          </CardHeader>
          <CardBody>
            <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {(tracks ?? []).map((t) => {
                const isSel = selected?.id === t.id;
                return (
                  <li key={t.id as string}>
                    <Link
                      href={`/admin/strategy?track=${t.slug}`}
                      className={`block rounded-xl border px-4 py-3 transition-all ${
                        isSel
                          ? "border-gold-500/60 bg-gold-500/[0.08]"
                          : "border-border-subtle bg-white/[0.02] hover:border-border-gold"
                      }`}
                    >
                      <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.22em] text-text-muted">
                        <span>Track {(t.ord as number).toString().padStart(2, "0")}</span>
                        <span
                          className={
                            t.is_active ? "text-gold-300" : "text-text-muted"
                          }
                        >
                          {t.is_active ? "Active" : "Draft"}
                        </span>
                      </div>
                      <p className="mt-1 text-sm font-medium text-text-primary truncate">
                        {t.title}
                      </p>
                      {t.tagline && (
                        <p className="text-xs text-text-muted mt-0.5 truncate">
                          {t.tagline}
                        </p>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </CardBody>
        </Card>

        {selected && (
          <TrackEditor trackId={selected.id as string} trackTitle={selected.title as string} />
        )}
      </div>
    </>
  );
}

async function TrackEditor({
  trackId,
  trackTitle,
}: {
  trackId: string;
  trackTitle: string;
}) {
  const admin = createServiceRoleClient();
  const { data: modules } = await admin
    .from("strategy_modules")
    .select("id, ord, title, summary, description, xp_reward")
    .eq("track_id", trackId)
    .order("ord", { ascending: true });

  const moduleIds = (modules ?? []).map((m) => m.id as string);
  const [{ data: lessons }, { data: assignments }, { data: rewards }] =
    moduleIds.length > 0
      ? await Promise.all([
          admin
            .from("strategy_lessons")
            .select(
              "id, module_id, ord, title, learning_objective, key_points, estimated_minutes, xp_reward",
            )
            .in("module_id", moduleIds)
            .order("ord", { ascending: true }),
          admin
            .from("module_assignments")
            .select("id, module_id, title, prompt, rubric, success_criteria, max_score")
            .in("module_id", moduleIds),
          admin
            .from("module_rewards")
            .select("id, module_id, ord, kind, title, description, content")
            .in("module_id", moduleIds)
            .order("ord", { ascending: true }),
        ])
      : [{ data: [] }, { data: [] }, { data: [] }];

  return (
    <TrackEditorClient
      trackId={trackId}
      trackTitle={trackTitle}
      modules={(modules ?? []).map((m) => ({
        id: m.id as string,
        ord: m.ord as number,
        title: m.title as string,
        summary: (m.summary as string | null) ?? "",
        description: (m.description as string | null) ?? "",
        xp_reward: m.xp_reward as number,
      }))}
      lessons={(lessons ?? []).map((l) => ({
        id: l.id as string,
        module_id: l.module_id as string,
        ord: l.ord as number,
        title: l.title as string,
        learning_objective: (l.learning_objective as string | null) ?? "",
        key_points: ((l.key_points as string[] | null) ?? []) as string[],
        estimated_minutes: (l.estimated_minutes as number) ?? 8,
        xp_reward: (l.xp_reward as number) ?? 50,
      }))}
      assignments={(assignments ?? []).map((a) => ({
        id: a.id as string,
        module_id: a.module_id as string,
        title: a.title as string,
        prompt: a.prompt as string,
        rubric: (a.rubric as Record<string, string> | null) ?? {},
        success_criteria: ((a.success_criteria as string[] | null) ?? []) as string[],
        max_score: (a.max_score as number) ?? 100,
      }))}
      rewards={(rewards ?? []).map((r) => ({
        id: r.id as string,
        module_id: r.module_id as string,
        ord: r.ord as number,
        kind: r.kind as "letter" | "template" | "video" | "quote_card",
        title: r.title as string,
        description: (r.description as string | null) ?? "",
        content: (r.content as Record<string, unknown> | null) ?? {},
      }))}
    />
  );
}
