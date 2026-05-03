import { LabModuleHubRedirect } from "@/lib/strategy/lab-pages/lab-module-hub-redirect";
import { PL_LAB } from "@/lib/strategy/lab-routes";

export const dynamic = "force-dynamic";

export default async function PLModuleHubPage({
  params,
}: {
  params: Promise<{ trackSlug: string; moduleId: string }>;
}) {
  const { trackSlug, moduleId } = await params;
  return LabModuleHubRedirect({ lab: PL_LAB, trackSlug, moduleId });
}
