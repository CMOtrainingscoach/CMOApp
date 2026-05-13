import { LabModuleHubRedirect } from "@/lib/strategy/lab-pages/lab-module-hub-redirect";
import { LIFESTYLE_LAB } from "@/lib/strategy/lab-routes";

export const dynamic = "force-dynamic";

export default async function LifestyleModuleHubPage({
  params,
}: {
  params: Promise<{ trackSlug: string; moduleId: string }>;
}) {
  const { trackSlug, moduleId } = await params;
  return LabModuleHubRedirect({ lab: LIFESTYLE_LAB, trackSlug, moduleId });
}
