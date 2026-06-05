import Link from "next/link";
import { ArrowLeft, Map as MapIcon } from "lucide-react";
import { Topbar } from "@/components/shell/topbar";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdmin } from "@/lib/admin";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { labContentBasePath } from "@/lib/strategy/lab-routes";
import type { ContentLabSlug } from "@/lib/strategy/lab-slug";
import type { Database } from "@/types/database";
import { CmoLifeAdminClient } from "./cmo-life-admin-client";

export const dynamic = "force-dynamic";

type MilestoneRow = Database["public"]["Tables"]["cmo_life_milestones"]["Row"];

type LessonJoin = {
  id: string;
  title: string;
  strategy_modules: {
    id: string;
    title: string;
    strategy_tracks: { title: string; slug: string; lab_slug: string };
  };
};

function isLabSlug(v: string): v is ContentLabSlug {
  return (
    v === "strategy" || v === "pl" || v === "lifestyle" || v === "career"
  );
}

export default async function CmoLifeAdminPage() {
  const adminUser = await requireAdmin();
  const supabase = await createClient();
  const [{ data: profile }, svc] = await Promise.all([
    supabase
      .from("profiles")
      .select("display_name, avatar_url")
      .eq("id", adminUser.id)
      .maybeSingle(),
    Promise.resolve(createServiceRoleClient()),
  ]);

  const { data: milestoneRows } = await svc
    .from("cmo_life_milestones")
    .select("*")
    .order("sort_order", { ascending: true });

  const milestones = (milestoneRows ?? []) as MilestoneRow[];
  const lessonIds = [
    ...new Set(
      milestones
        .map((m) => m.lesson_id)
        .filter((id): id is string => typeof id === "string"),
    ),
  ];

  const lessonLabelById = new Map<string, string>();
  const lessonHrefById = new Map<string, string>();

  if (lessonIds.length > 0) {
    const { data: lessons } = await svc
      .from("strategy_lessons")
      .select(
        `
        id,
        title,
        strategy_modules!inner (
          id,
          title,
          strategy_tracks!inner ( slug, lab_slug, title )
        )
      `,
      )
      .in("id", lessonIds);

    for (const raw of (lessons ?? []) as unknown as LessonJoin[]) {
      const mod = raw.strategy_modules;
      const tr = mod.strategy_tracks;
      const labRaw = tr.lab_slug;
      const lab = isLabSlug(labRaw) ? labRaw : "strategy";
      const base = labContentBasePath(lab);
      const href = `${base}/${tr.slug}/${mod.id}/${raw.id}`;
      lessonHrefById.set(
        raw.id,
        href,
      );
      lessonLabelById.set(
        raw.id,
        `${raw.title} · ${tr.title} · ${mod.title}`,
      );
    }
  }

  const enriched = milestones.map((m) => ({
    ...m,
    lesson_label: m.lesson_id ? lessonLabelById.get(m.lesson_id) ?? null : null,
    lesson_href: m.lesson_id ? lessonHrefById.get(m.lesson_id) ?? null : null,
  }));

  return (
    <>
      <Topbar
        displayName={profile?.display_name ?? "Admin"}
        avatarUrl={profile?.avatar_url}
        subtitle="Define the global CMO Life roadmap: lessons, custom goals, and rewards."
      />
      <div className="px-6 lg:px-8 pb-12 space-y-6 max-w-3xl">
        <Link
          href="/admin"
          className="text-xs uppercase tracking-[0.18em] text-text-muted hover:text-gold-300 inline-flex items-center gap-2"
        >
          <ArrowLeft className="size-3.5" /> Admin home
        </Link>

        <Card>
          <CardHeader>
            <CardTitle className="inline-flex items-center gap-2">
              <MapIcon className="size-4 text-gold-400" /> CMO Life roadmap
            </CardTitle>
          </CardHeader>
          <CardBody className="space-y-6">
            <p className="text-sm text-text-secondary leading-relaxed">
              Milestones unlock in order for every learner. Lesson-linked steps complete when the
              lesson is finished; custom steps can be self-marked when active. Rewards stay hidden
              until the step is done.
            </p>
            <CmoLifeAdminClient milestones={enriched} />
          </CardBody>
        </Card>
      </div>
    </>
  );
}
