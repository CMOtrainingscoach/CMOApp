import { LabLessonPage } from "@/lib/strategy/lab-pages/lab-lesson-page";
import { CAREER_LAB } from "@/lib/strategy/lab-routes";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export default async function CareerLessonPage({
  params,
}: {
  params: Promise<{ trackSlug: string; moduleId: string; lessonId: string }>;
}) {
  const { trackSlug, moduleId, lessonId } = await params;
  return LabLessonPage({
    lab: CAREER_LAB,
    trackSlug,
    moduleId,
    lessonId,
  });
}
