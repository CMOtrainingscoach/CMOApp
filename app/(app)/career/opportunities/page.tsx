import { Topbar } from "@/components/shell/topbar";
import { CareerWorkbench } from "@/components/career/career-workbench";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function CareerOpportunitiesPage() {
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

  const hasTavily = Boolean(process.env.TAVILY_API_KEY?.trim());
  const hasOpenAi = Boolean(process.env.OPENAI_API_KEY?.trim());

  let readyDocs:
    | { id: string; title: string; status: string }[]
    | null = [];
  let savedJobs:
    | {
        id: string;
        listing_url: string;
        title: string;
        source_domain: string | null;
        posted_at: string | null;
        stars: number;
        professor_feedback: string | null;
      }[]
    | null = [];

  if (user) {
    const [dRes, sRes] = await Promise.all([
      supabase
        .from("documents")
        .select("id,title,status")
        .eq("user_id", user.id)
        .eq("status", "ready")
        .order("created_at", { ascending: false }),
      supabase
        .from("career_saved_jobs")
        .select(
          "id,listing_url,title,source_domain,posted_at,stars,professor_feedback",
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),
    ]);
    readyDocs = dRes.data;
    savedJobs = sRes.data;
  }

  return (
    <>
      <Topbar
        displayName={profile?.display_name ?? "Operator"}
        avatarUrl={profile?.avatar_url}
        subtitle="Build the operator the C-suite hires."
      />
      <div className="px-6 lg:px-8 pb-12 space-y-5">
        <Link
          href="/career"
          className="inline-flex lg:hidden items-center gap-2 text-xs uppercase tracking-[0.18em] text-text-muted hover:text-gold-300 transition-colors"
        >
          <ArrowLeft className="size-3.5" /> Career Lab
        </Link>
        <CareerWorkbench
          hasTavily={hasTavily}
          hasOpenAi={hasOpenAi}
          documents={(readyDocs ?? []).map((r) => ({ id: r.id, title: r.title }))}
          savedJobs={savedJobs ?? []}
        />
      </div>
    </>
  );
}
