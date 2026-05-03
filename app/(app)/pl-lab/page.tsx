import { LabTracksHome } from "@/components/strategy/lab-tracks-home";
import { PL_LAB } from "@/lib/strategy/lab-routes";

export const dynamic = "force-dynamic";

export default async function PLLabHomePage() {
  return LabTracksHome({ lab: PL_LAB });
}
