import { LabRewardPage } from "@/lib/strategy/lab-pages/lab-reward-page";
import { LIFESTYLE_LAB } from "@/lib/strategy/lab-routes";

export const dynamic = "force-dynamic";

export default async function LifestyleRewardPage({
  params,
}: {
  params: Promise<{ trackSlug: string; moduleId: string }>;
}) {
  const { trackSlug, moduleId } = await params;
  return LabRewardPage({ lab: LIFESTYLE_LAB, trackSlug, moduleId });
}
