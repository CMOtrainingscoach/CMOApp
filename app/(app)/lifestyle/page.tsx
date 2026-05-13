import { LabTracksHome } from "@/components/strategy/lab-tracks-home";
import { LIFESTYLE_LAB } from "@/lib/strategy/lab-routes";

export const dynamic = "force-dynamic";

export default async function LifestyleLabHomePage() {
  return LabTracksHome({ lab: LIFESTYLE_LAB });
}
