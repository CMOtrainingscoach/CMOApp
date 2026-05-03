import { LabRewardPage } from "@/lib/strategy/lab-pages/lab-reward-page";
import { PL_LAB } from "@/lib/strategy/lab-routes";

export const dynamic = "force-dynamic";

export default async function PLRewardPage({
  params,
}: {
  params: Promise<{ trackSlug: string; moduleId: string }>;
}) {
  const { trackSlug, moduleId } = await params;
  return LabRewardPage({ lab: PL_LAB, trackSlug, moduleId });
}
