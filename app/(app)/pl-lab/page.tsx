import { TrendingUp } from "lucide-react";
import { Topbar } from "@/components/shell/topbar";
import { TrackComingSoon } from "@/components/shell/track-coming-soon";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function PLLabPage() {
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
        subtitle="Live calculators and unit-economics simulations are coming. Foundations are ready."
      />
      <TrackComingSoon
        icon={TrendingUp}
        pillar="Pillar 02 / Finance"
        title="P&L Lab"
        tagline="Speak fluent CFO. Decide like an owner."
        description="The P&L Lab will turn marketing decisions into financial decisions. Interactive calculators for CAC, LTV, payback period, contribution margin, pricing elasticity, and budget allocation — wired to your own numbers and to the Professor for live coaching."
        outcomes={[
          "Defend any marketing investment with a payback period and a contribution margin number.",
          "Translate any campaign into a P&L impact statement.",
          "Decide pricing changes based on elasticity, not vibes.",
          "Allocate budget across channels by marginal CAC, not last-click attribution.",
        ]}
        modules={[
          { title: "Unit Economics 101", sub: "CAC, LTV, payback period." },
          { title: "Margin Architecture", sub: "Gross vs contribution margin in practice." },
          { title: "Pricing Lab", sub: "Elasticity, packaging, and pricing power." },
          { title: "Budget Allocation", sub: "Marginal CAC and channel ROI." },
          { title: "Marketing P&L", sub: "Translate campaigns into a CFO-ready P&L view." },
        ]}
      />
    </>
  );
}
