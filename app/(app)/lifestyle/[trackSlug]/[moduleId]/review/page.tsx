import { LabReviewPage } from "@/lib/strategy/lab-pages/lab-review-page";
import { LIFESTYLE_LAB } from "@/lib/strategy/lab-routes";

export const dynamic = "force-dynamic";

export default async function LifestyleReviewPage({
  params,
}: {
  params: Promise<{ trackSlug: string; moduleId: string }>;
}) {
  const { trackSlug, moduleId } = await params;
  return LabReviewPage({ lab: LIFESTYLE_LAB, trackSlug, moduleId });
}
