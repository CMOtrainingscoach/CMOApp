import Link from "next/link";
import { ArrowLeft, Puzzle } from "lucide-react";
import { Topbar } from "@/components/shell/topbar";
import {
  Card,
  CardBody,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireAdmin } from "@/lib/admin";
import { getProfessorConfigAdmin } from "@/lib/professor-config.server";
import { createClient } from "@/lib/supabase/server";
import { PlJargonMatchHeaderUploader } from "../pl-jargon-header-uploader";
import { StrategyJargonMatchHeaderUploader } from "../strategy-jargon-header-uploader";

export const dynamic = "force-dynamic";

export default async function AdminMinigamesPage() {
  const adminUser = await requireAdmin();
  const supabase = await createClient();
  const [{ data: profile }, cfg] = await Promise.all([
    supabase
      .from("profiles")
      .select("display_name, avatar_url")
      .eq("id", adminUser.id)
      .maybeSingle(),
    getProfessorConfigAdmin(),
  ]);

  return (
    <>
      <Topbar
        displayName={profile?.display_name ?? "Admin"}
        avatarUrl={profile?.avatar_url}
        subtitle="Banners for standalone practice minigames."
      />
      <div className="px-6 lg:px-8 pb-12 space-y-6">
        <Link
          href="/admin"
          className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-text-muted hover:text-gold-300 transition-colors"
        >
          <ArrowLeft className="size-3.5" /> Admin home
        </Link>

        <header className="max-w-3xl space-y-2">
          <span className="badge-gold inline-flex items-center gap-1">
            <Puzzle className="size-3" /> Minigames
          </span>
          <h1 className="font-display text-4xl tracking-tight gold-text">
            Practice game headers
          </h1>
          <p className="text-text-muted text-sm leading-relaxed">
            Upload wide hero images for the jargon matchup drills. Learners see them at the top of
            each minigame; nothing else on this page.
          </p>
        </header>

        <div className="grid gap-5 max-w-3xl">
          <Card>
            <CardHeader>
              <CardTitle>P&amp;L jargon matchup</CardTitle>
            </CardHeader>
            <CardBody>
              <PlJargonMatchHeaderUploader
                initialUrl={cfg.pl_jargon_match_header_image_url}
              />
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Strategy Lab — marketing jargon matchup</CardTitle>
            </CardHeader>
            <CardBody>
              <StrategyJargonMatchHeaderUploader
                initialUrl={cfg.strategy_jargon_match_header_image_url}
              />
            </CardBody>
          </Card>
        </div>
      </div>
    </>
  );
}
