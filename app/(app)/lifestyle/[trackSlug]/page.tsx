import { LabTrackDetailPage } from "@/lib/strategy/lab-pages/lab-track-detail-page";
import { LIFESTYLE_LAB } from "@/lib/strategy/lab-routes";

export const dynamic = "force-dynamic";

export default async function LifestyleTrackPage({
  params,
}: {
  params: Promise<{ trackSlug: string }>;
}) {
  const { trackSlug } = await params;
  return LabTrackDetailPage({ lab: LIFESTYLE_LAB, trackSlug });
}
