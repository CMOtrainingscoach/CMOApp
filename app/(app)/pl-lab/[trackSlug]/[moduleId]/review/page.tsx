import { LabReviewPage } from "@/lib/strategy/lab-pages/lab-review-page";
import { PL_LAB } from "@/lib/strategy/lab-routes";

export const dynamic = "force-dynamic";

export default async function PLReviewPage({
  params,
}: {
  params: Promise<{ trackSlug: string; moduleId: string }>;
}) {
  const { trackSlug, moduleId } = await params;
  return LabReviewPage({ lab: PL_LAB, trackSlug, moduleId });
}
