import { LabAssignmentPage } from "@/lib/strategy/lab-pages/lab-assignment-page";
import { PL_LAB } from "@/lib/strategy/lab-routes";

export const dynamic = "force-dynamic";

export default async function PLAssignmentPage({
  params,
}: {
  params: Promise<{ trackSlug: string; moduleId: string }>;
}) {
  const { trackSlug, moduleId } = await params;
  return LabAssignmentPage({ lab: PL_LAB, trackSlug, moduleId });
}
