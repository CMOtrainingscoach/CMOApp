import { LabTracksHome } from "@/components/strategy/lab-tracks-home";
import { STRATEGY_LAB } from "@/lib/strategy/lab-routes";

export const dynamic = "force-dynamic";

export default async function StrategyLabHomePage() {
  return LabTracksHome({ lab: STRATEGY_LAB });
}
