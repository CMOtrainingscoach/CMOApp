import { notFound, redirect } from "next/navigation";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import type { LabRouteBundle } from "@/lib/strategy/lab-routes";

export async function LabModuleHubRedirect(opts: {
  lab: LabRouteBundle;
  trackSlug: string;
  moduleId: string;
}) {
  const { lab, trackSlug, moduleId } = opts;
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
    .eq("lab_slug", lab.contentLabSlug)
    .maybeSingle();
  if (!track) notFound();

  const { data: mod } = await admin
    .from("strategy_modules")
    .select("id")
    .eq("id", moduleId)
    .eq("track_id", track.id)
    .maybeSingle();
  if (!mod) notFound();

  redirect(`${lab.basePath}/${trackSlug}`);
}
