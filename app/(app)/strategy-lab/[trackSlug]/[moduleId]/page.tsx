import { notFound, redirect } from "next/navigation";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";

/**
 * There is no dedicated module hub UI yet; lesson and sub-routes use
 * /strategy-lab/[track]/[module]/.... This page exists so "Back to module" and
 * similar links resolve instead of 404-not-found.
 */
export const dynamic = "force-dynamic";

export default async function StrategyModuleRedirectPage({
  params,
}: {
  params: Promise<{ trackSlug: string; moduleId: string }>;
}) {
  const { trackSlug, moduleId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createServiceRoleClient();
  const { data: track } = await admin
    .from("strategy_tracks")
    .select("id")
    .eq("slug", trackSlug)
    .maybeSingle();
  if (!track) notFound();

  const { data: mod } = await admin
    .from("strategy_modules")
    .select("id")
    .eq("id", moduleId)
    .eq("track_id", track.id)
    .maybeSingle();
  if (!mod) notFound();

  redirect(`/strategy-lab/${trackSlug}`);
}
