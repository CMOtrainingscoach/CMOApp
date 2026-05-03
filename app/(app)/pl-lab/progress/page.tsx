import { LabXpProgressPage } from "@/lib/strategy/lab-pages/lab-xp-progress-page";
import { PL_LAB } from "@/lib/strategy/lab-routes";

export const dynamic = "force-dynamic";

export default async function PLLabProgressPage() {
  return LabXpProgressPage({ lab: PL_LAB });
}
