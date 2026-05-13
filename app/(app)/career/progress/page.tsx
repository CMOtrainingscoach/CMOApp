import { LabXpProgressPage } from "@/lib/strategy/lab-pages/lab-xp-progress-page";
import { CAREER_LAB } from "@/lib/strategy/lab-routes";

export const dynamic = "force-dynamic";

export default async function CareerLabProgressPage() {
  return LabXpProgressPage({ lab: CAREER_LAB });
}
