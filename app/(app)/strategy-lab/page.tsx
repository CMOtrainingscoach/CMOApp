import { BookOpen } from "lucide-react";
import { Topbar } from "@/components/shell/topbar";
import { TrackComingSoon } from "@/components/shell/track-coming-soon";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function StrategyLabPage() {
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
        subtitle="Frameworks become muscle memory through repetition. Workspaces are coming."
      />
      <TrackComingSoon
        icon={BookOpen}
        pillar="Pillar 01 / Strategy"
        title="Strategy Lab"
        tagline="Frameworks that make better decisions inevitable."
        description="The Strategy Lab will host structured workspaces for the frameworks every CMO must own — 5C, Porter, SWOT, ICP, JTBD, positioning, messaging, GTM, and competitive analysis — with the Professor reviewing each artifact you produce."
        outcomes={[
          "Build a positioning statement that survives a board challenge.",
          "Diagnose any market with 5C and Porter in under an hour.",
          "Define an ICP and buyer persona with measurable filters.",
          "Design a GTM motion that maps to revenue, not activity.",
        ]}
        modules={[
          { title: "5C Analysis", sub: "Customer, Company, Competition, Collaborators, Context." },
          { title: "Porter Five Forces", sub: "Industry structure and profit pools." },
          { title: "SWOT, sharpened", sub: "Translate strengths into strategy, not adjectives." },
          { title: "Positioning + Messaging", sub: "Category, differentiation, and the wedge." },
          { title: "Go-to-Market", sub: "Segmentation, motion, and proof points." },
        ]}
      />
    </>
  );
}
