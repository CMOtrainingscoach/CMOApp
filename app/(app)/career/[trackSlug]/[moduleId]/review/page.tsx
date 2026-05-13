import { LabReviewPage } from "@/lib/strategy/lab-pages/lab-review-page";
import { CAREER_LAB } from "@/lib/strategy/lab-routes";

export const dynamic = "force-dynamic";

export default async function CareerReviewPage({
  params,
}: {
  params: Promise<{ trackSlug: string; moduleId: string }>;
}) {
  const { trackSlug, moduleId } = await params;
  return LabReviewPage({ lab: CAREER_LAB, trackSlug, moduleId });
}
