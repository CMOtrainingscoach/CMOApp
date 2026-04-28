import { Sparkles } from "lucide-react";
import { Topbar } from "@/components/shell/topbar";
import { TrackComingSoon } from "@/components/shell/track-coming-soon";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AIToolsPage() {
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
        subtitle="AI is becoming marketing infrastructure. Learn to wield it like a CMO."
      />
      <TrackComingSoon
        icon={Sparkles}
        pillar="Pillar 06 / AI Marketing"
        title="AI Tools & Growth Systems"
        tagline="AI is the new operating leverage. Use it like a CMO, not a tinkerer."
        description="A workshop for using LLMs, embeddings, agents, and AI workflows to build durable marketing leverage — from research and brief writing to campaign orchestration and demand forecasting."
        outcomes={[
          "Build a personal AI workflow that compounds quality, not noise.",
          "Stand up a content-and-research engine that scales without you.",
          "Use embeddings and memory to make your team's institutional knowledge searchable.",
          "Run an experiment portfolio with AI co-pilots, scored against a P&L.",
        ]}
        modules={[
          { title: "AI for Strategy", sub: "Research, framing, and synthesis." },
          { title: "Content Engine", sub: "Briefs, drafts, and editorial QA at scale." },
          { title: "Memory & Embeddings", sub: "Make your firm's knowledge searchable." },
          { title: "Agentic Workflows", sub: "Orchestration with measurable output." },
        ]}
      />
    </>
  );
}
