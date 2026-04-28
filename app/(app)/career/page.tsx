import { Briefcase } from "lucide-react";
import { Topbar } from "@/components/shell/topbar";
import { TrackComingSoon } from "@/components/shell/track-coming-soon";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function CareerPage() {
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
        subtitle="Build the operator the C-suite hires."
      />
      <TrackComingSoon
        icon={Briefcase}
        pillar="Pillar 07 / Career"
        title="Career & Personal Brand"
        tagline="The CMO seat goes to the operator who shows up early."
        description="A career-acceleration workspace: positioning your CV, writing in executive voice, building a personal brand that signals CMO altitude, and turning every interview into a strategic conversation."
        outcomes={[
          "Rewrite your CV to land in CMO and VP of Marketing shortlists.",
          "Build a LinkedIn presence that compounds inbound opportunities.",
          "Turn interviews into board-level strategic conversations.",
          "Negotiate compensation, scope, and equity like a professional.",
        ]}
        modules={[
          { title: "Executive Resume", sub: "Outcomes, P&L, leadership scope." },
          { title: "LinkedIn as Engine", sub: "Position, narrative, and cadence." },
          { title: "Interview Mastery", sub: "Strategic case work, not Q&A ping-pong." },
          { title: "Compensation", sub: "Base, bonus, equity — and how to ask." },
        ]}
      />
    </>
  );
}
