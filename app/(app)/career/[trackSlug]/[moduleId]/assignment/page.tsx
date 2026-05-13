import { LabAssignmentPage } from "@/lib/strategy/lab-pages/lab-assignment-page";
import { CAREER_LAB } from "@/lib/strategy/lab-routes";

export const dynamic = "force-dynamic";

export default async function CareerAssignmentPage({
  params,
}: {
  params: Promise<{ trackSlug: string; moduleId: string }>;
}) {
  const { trackSlug, moduleId } = await params;
  return LabAssignmentPage({ lab: CAREER_LAB, trackSlug, moduleId });
}
