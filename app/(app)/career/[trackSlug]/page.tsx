import { LabTrackDetailPage } from "@/lib/strategy/lab-pages/lab-track-detail-page";
import { CAREER_LAB } from "@/lib/strategy/lab-routes";

export const dynamic = "force-dynamic";

export default async function CareerTrackPage({
  params,
}: {
  params: Promise<{ trackSlug: string }>;
}) {
  const { trackSlug } = await params;
  return LabTrackDetailPage({ lab: CAREER_LAB, trackSlug });
}
