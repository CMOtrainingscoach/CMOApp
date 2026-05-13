import { LabTracksHome } from "@/components/strategy/lab-tracks-home";
import { CAREER_LAB } from "@/lib/strategy/lab-routes";

export const dynamic = "force-dynamic";

export default async function CareerLabHomePage() {
  return LabTracksHome({ lab: CAREER_LAB });
}
