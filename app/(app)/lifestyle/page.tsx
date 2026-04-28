import { HeartPulse } from "lucide-react";
import { Topbar } from "@/components/shell/topbar";
import { TrackComingSoon } from "@/components/shell/track-coming-soon";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function LifestylePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = user
    ? await supabase
        .from("profiles")
        .select("display_name, avatar_url")
        .eq("id", user.id)
        .maybeSingle()
    : { data: null };

  return (
    <>
      <Topbar
        displayName={profile?.display_name ?? "Operator"}
        avatarUrl={profile?.avatar_url}
        subtitle="Executive performance is a body sport. Fashion, fitness, focus — wired together."
      />
      <TrackComingSoon
        icon={HeartPulse}
        pillar="Pillar 08 / Lifestyle"
        title="The CMO Lifestyle"
        tagline="Discipline today. Freedom tomorrow."
        description="A coaching layer that connects sleep, training, deep work, fashion, and personal brand to executive output. Your Professor will track patterns and give specific guidance on how to look, train, and operate at C-suite altitude."
        outcomes={[
          "Build a daily operating system anchored to deep work and recovery.",
          "Develop a personal brand wardrobe — minimal, high-status, repeatable.",
          "Convert energy and focus into measurable executive output.",
          "Eliminate scattered execution. One clean signal per day.",
        ]}
        modules={[
          { title: "Operating Cadence", sub: "Sleep, training, deep work blocks." },
          { title: "Fashion as Signal", sub: "Wardrobe rules for the C-suite." },
          { title: "Personal Brand", sub: "Narrative, presence, posture." },
          { title: "Energy & Focus", sub: "Nutrition, training, recovery." },
          { title: "Executive Bearing", sub: "How you walk into the room." },
        ]}
      />
    </>
  );
}
