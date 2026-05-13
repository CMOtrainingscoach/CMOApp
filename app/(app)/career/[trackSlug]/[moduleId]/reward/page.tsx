import { LabRewardPage } from "@/lib/strategy/lab-pages/lab-reward-page";
import { CAREER_LAB } from "@/lib/strategy/lab-routes";

export const dynamic = "force-dynamic";

export default async function CareerRewardPage({
  params,
}: {
  params: Promise<{ trackSlug: string; moduleId: string }>;
}) {
  const { trackSlug, moduleId } = await params;
  return LabRewardPage({ lab: CAREER_LAB, trackSlug, moduleId });
}
