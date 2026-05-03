import { LabTrackDetailPage } from "@/lib/strategy/lab-pages/lab-track-detail-page";
import { PL_LAB } from "@/lib/strategy/lab-routes";

export const dynamic = "force-dynamic";

export default async function PLTrackPage({
  params,
}: {
  params: Promise<{ trackSlug: string }>;
}) {
  const { trackSlug } = await params;
  return LabTrackDetailPage({ lab: PL_LAB, trackSlug });
}
