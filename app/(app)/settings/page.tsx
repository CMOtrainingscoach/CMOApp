import Link from "next/link";
import { Topbar } from "@/components/shell/topbar";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/admin";
import { SettingsForm } from "./form";
import { LogOutButton } from "./logout";
import {
  Settings,
  Database,
  KeyRound,
  UserCircle,
  ShieldCheck,
  ArrowRight,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const userIsAdmin = isAdmin(user);

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  const [{ count: docCount }, { count: memCount }, { count: convCount }] =
    await Promise.all([
      supabase
        .from("documents")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id),
      supabase
        .from("memories")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id),
      supabase
        .from("chat_conversations")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id),
    ]);

  return (
    <>
      <Topbar
        displayName={profile?.display_name ?? "Operator"}
        avatarUrl={profile?.avatar_url}
        subtitle="Account, profile, and program preferences."
      />
      <div className="px-6 lg:px-8 pb-12 grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5">
        <div className="space-y-5">
          {userIsAdmin && (
            <Card className="border-border-gold/40">
              <CardHeader>
                <CardTitle>
                  <ShieldCheck className="size-3.5" /> Admin Panel
                </CardTitle>
                <span className="badge-gold">Admin</span>
              </CardHeader>
              <CardBody className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <p className="text-sm text-text-secondary">
                    Configure the AI Professor&apos;s identity, voice, and
                    avatar — applied instantly across the entire app.
                  </p>
                </div>
                <Button asChild className="shrink-0">
                  <Link href="/admin">
                    Open Admin Panel <ArrowRight className="size-4" />
                  </Link>
                </Button>
              </CardBody>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>
                <UserCircle className="size-3.5" /> Profile
              </CardTitle>
            </CardHeader>
            <CardBody>
              <SettingsForm
                email={user.email ?? ""}
                profile={{
                  display_name: profile?.display_name ?? "",
                  headline: profile?.headline ?? "",
                  role: profile?.role ?? "",
                  persona_summary: profile?.persona_summary ?? "",
                }}
              />
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>
                <Settings className="size-3.5" /> Session
              </CardTitle>
            </CardHeader>
            <CardBody className="flex items-center justify-between gap-4">
              <div>
                <div className="text-sm text-text-secondary">
                  Signed in as{" "}
                  <span className="text-text-primary font-medium">
                    {user.email}
                  </span>
                </div>
                <div className="text-[11px] text-text-muted mt-0.5">
                  Sign out to lock this session.
                </div>
              </div>
              <LogOutButton />
            </CardBody>
          </Card>
        </div>

        <div className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle>
                <Database className="size-3.5" /> Your data
              </CardTitle>
            </CardHeader>
            <CardBody className="space-y-3 text-sm">
              <Stat label="Documents stored" value={docCount ?? 0} />
              <Stat label="Memories captured" value={memCount ?? 0} />
              <Stat label="Conversations" value={convCount ?? 0} />
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>
                <KeyRound className="size-3.5" /> Privacy
              </CardTitle>
            </CardHeader>
            <CardBody>
              <p className="text-sm text-text-muted leading-relaxed">
                Your documents, memories, and conversations are private to your
                account, isolated by row-level security in Supabase. Only you
                can see them — and the AI Professor uses them to coach you.
              </p>
            </CardBody>
          </Card>
        </div>
      </div>
    </>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-border-hairline bg-bg-elevated/40 px-3 py-2">
      <span className="text-text-secondary">{label}</span>
      <span className="font-mono text-gold-300">{value}</span>
    </div>
  );
}
