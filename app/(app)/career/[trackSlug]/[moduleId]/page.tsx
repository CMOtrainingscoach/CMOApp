import { LabModuleHubRedirect } from "@/lib/strategy/lab-pages/lab-module-hub-redirect";
import { CAREER_LAB } from "@/lib/strategy/lab-routes";

export const dynamic = "force-dynamic";

export default async function CareerModuleHubPage({
  params,
}: {
  params: Promise<{ trackSlug: string; moduleId: string }>;
}) {
  const { trackSlug, moduleId } = await params;
  return LabModuleHubRedirect({ lab: CAREER_LAB, trackSlug, moduleId });
}
