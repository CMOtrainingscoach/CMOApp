import Link from "next/link";
import { ArrowLeft, BarChart4 } from "lucide-react";
import { Topbar } from "@/components/shell/topbar";
import {
  Card,
  CardBody,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/admin";
import { loadXpLevelConfig } from "@/lib/xp-level-catalog";
import { XpLevelEditor } from "./xp-level-editor";

export const dynamic = "force-dynamic";

export default async function AdminXpLevelsPage() {
  const adminUser = await requireAdmin();
  const supabase = await createClient();

  const [{ data: profile }, rows] = await Promise.all([
    supabase
      .from("profiles")
      .select("display_name, avatar_url")
      .eq("id", adminUser.id)
      .maybeSingle(),
    loadXpLevelConfig(),
  ]);

  const ready = rows.length === 101;

  return (
    <>
      <Topbar
        displayName={profile?.display_name ?? "Admin"}
        avatarUrl={profile?.avatar_url}
        subtitle="Tune rank titles and XP thresholds for levels 0–100."
      />
      <div className="px-6 lg:px-8 pb-12 space-y-5 max-w-5xl">
        <Link
          href="/admin"
          className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-text-muted hover:text-gold-300 transition-colors"
        >
          <ArrowLeft className="size-3.5" /> Admin home
        </Link>

        <Card>
          <CardHeader>
            <CardTitle>
              <BarChart4 className="size-3.5" /> Ascension XP levels
            </CardTitle>
          </CardHeader>
          <CardBody className="space-y-6">
            {!ready ? (
              <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100 leading-relaxed">
                Expected <strong>101</strong> rows in{" "}
                <code className="px-1 rounded bg-white/5 text-gold-200">
                  xp_level_config
                </code>{" "}
                (levels 0–100). Found{" "}
                <strong>{rows.length}</strong>. Apply Supabase migration{" "}
                <code className="px-1 rounded bg-white/5">
                  0008_xp_level_config.sql
                </code>
                , then reload this page.
              </div>
            ) : (
              <XpLevelEditor initialRows={rows} />
            )}
          </CardBody>
        </Card>
      </div>
    </>
  );
}
