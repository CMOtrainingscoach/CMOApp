import { LabXpProgressPage } from "@/lib/strategy/lab-pages/lab-xp-progress-page";
import { STRATEGY_LAB } from "@/lib/strategy/lab-routes";

export const dynamic = "force-dynamic";

export default async function StrategyLabProgressPage() {
  return LabXpProgressPage({ lab: STRATEGY_LAB });
}
