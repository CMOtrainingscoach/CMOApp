import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Gift } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Topbar } from "@/components/shell/topbar";
import type { ContentLabSlug } from "@/lib/strategy/lab-slug";
import { RewardsGallery, type RewardGalleryItem } from "./rewards-gallery";

export const dynamic = "force-dynamic";

function parseLabSlug(raw: unknown): ContentLabSlug {
  if (raw === "pl" || raw === "strategy" || raw === "lifestyle" || raw === "career") {
    return raw;
  }
  return "strategy";
}

function parseRewardKind(
  raw: unknown,
): RewardGalleryItem["reward"]["kind"] | null {
  if (
    raw === "letter" ||
    raw === "template" ||
    raw === "video" ||
    raw === "quote_card" ||
    raw === "image"
  ) {
    return raw;
  }
  return null;
}

function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : {};
}

/** PostgREST may return embedded rows as objects or single-element arrays. */
function firstEmbedded<T extends Record<string, unknown>>(
  v: T | T[] | null | undefined,
): T | null {
  if (v == null) return null;
  if (Array.isArray(v)) return (v[0] as T | undefined) ?? null;
  return v;
}

type ModuleRewardEmbed = {
  id: string;
  kind: string;
  title: string;
  description: string | null;
  content: unknown;
  module_id: string;
  strategy_modules: unknown;
};

type UnlockRowRaw = {
  unlocked_at: string;
  viewed_at: string | null;
  module_rewards: ModuleRewardEmbed | ModuleRewardEmbed[] | null;
};

export default async function RewardsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, avatar_url")
    .eq("id", user.id)
    .maybeSingle();

  const { data: rawRows } = await supabase
    .from("reward_unlocks")
    .select(
      `
      unlocked_at,
      viewed_at,
      module_rewards:reward_id (
        id,
        kind,
        title,
        description,
        content,
        module_id,
        strategy_modules (
          id,
          title,
          ord,
          strategy_tracks ( slug, title, lab_slug )
        )
      )
    `,
    )
    .eq("user_id", user.id)
    .order("unlocked_at", { ascending: false });

  const items: RewardGalleryItem[] = [];

  for (const row of (rawRows ?? []) as UnlockRowRaw[]) {
    const mr = firstEmbedded(row.module_rewards);
    if (!mr?.id) continue;

    const kind = parseRewardKind(mr.kind);
    if (!kind) continue;

    type ModEmbed = {
      id: string;
      title: string;
      ord: number;
      strategy_tracks: unknown;
    };

    const mod = firstEmbedded(mr.strategy_modules as ModEmbed | ModEmbed[] | null);
    type TrackEmbed = {
      slug: string;
      title: string;
      lab_slug: string | null;
    };
    const track = firstEmbedded(mod?.strategy_tracks as TrackEmbed | TrackEmbed[] | null);
    if (!mod?.id || !track?.slug) continue;

    const labSlug = parseLabSlug(track.lab_slug);

    items.push({
      unlockedAt: row.unlocked_at,
      viewedAt: row.viewed_at,
      reward: {
        id: mr.id,
        kind,
        title: mr.title,
        description: mr.description,
        content: asRecord(mr.content),
      },
      moduleTitle: mod.title,
      moduleId: mod.id,
      trackSlug: track.slug,
      trackTitle: track.title,
      labSlug,
    });
  }

  const displayName = profile?.display_name ?? "Operator";

  return (
    <>
      <Topbar
        displayName={displayName}
        avatarUrl={profile?.avatar_url}
        subtitle="Every Professor reward you have unlocked across all labs."
      />
      <div className="px-6 lg:px-8 pb-12 space-y-8">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-text-muted hover:text-gold-300 transition-colors"
        >
          <ArrowLeft className="size-3.5" /> Dashboard
        </Link>

        <header className="space-y-2">
          <span className="badge-gold inline-flex items-center gap-1">
            <Gift className="size-3" strokeWidth={2} /> Rewards
          </span>
          <h1 className="font-display text-4xl sm:text-5xl tracking-tight gold-text">
            From your Professor
          </h1>
          <p className="text-text-muted max-w-2xl text-sm leading-relaxed">
            Browse everything you have earned by passing graded assignments—letters,
            templates, quote cards, and more—organized by when you unlocked them.
          </p>
        </header>

        <RewardsGallery items={items} displayName={displayName} />
      </div>
    </>
  );
}
