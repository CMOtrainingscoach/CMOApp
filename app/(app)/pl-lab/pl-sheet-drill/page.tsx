import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Topbar } from "@/components/shell/topbar";
import { PlSheetDrillRunner } from "@/components/pl/pl-sheet-drill-runner";
import { getProfessorConfig } from "@/lib/professor-config.server";
import { createClient, requireUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function PlSheetDrillPage() {
  const user = await requireUser();
  const [supabase, professor] = await Promise.all([
    createClient(),
    getProfessorConfig(),
  ]);
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, avatar_url")
    .eq("id", user.id)
    .maybeSingle();

  return (
    <>
      <Topbar
        displayName={profile?.display_name ?? "Operator"}
        avatarUrl={profile?.avatar_url}
        subtitle="Simulated P&L excerpts — one question, three graded attempts."
      />
      <div className="px-6 lg:px-8 pb-12 space-y-5">
        <Link
          href="/pl-lab"
          className="hidden lg:inline-flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-text-muted hover:text-gold-300 transition-colors"
        >
          <ArrowLeft className="size-3.5" /> Lab home
        </Link>
        <PlSheetDrillRunner
          headerImageUrl={professor.pl_sheet_drill_header_image_url}
        />
      </div>
    </>
  );
}
