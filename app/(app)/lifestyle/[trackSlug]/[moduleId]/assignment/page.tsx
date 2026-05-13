import { LabAssignmentPage } from "@/lib/strategy/lab-pages/lab-assignment-page";
import { LIFESTYLE_LAB } from "@/lib/strategy/lab-routes";

export const dynamic = "force-dynamic";

export default async function LifestyleAssignmentPage({
  params,
}: {
  params: Promise<{ trackSlug: string; moduleId: string }>;
}) {
  const { trackSlug, moduleId } = await params;
  return LabAssignmentPage({ lab: LIFESTYLE_LAB, trackSlug, moduleId });
}
