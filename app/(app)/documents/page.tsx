import { createClient } from "@/lib/supabase/server";
import { Topbar } from "@/components/shell/topbar";
import { DocumentsWorkspace } from "./workspace";

export const dynamic = "force-dynamic";

export default async function DocumentsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: profile }, { data: docs }] = await Promise.all([
    supabase
      .from("profiles")
      .select("display_name, avatar_url")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("documents")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
  ]);

  return (
    <>
      <Topbar
        displayName={profile?.display_name ?? "Operator"}
        avatarUrl={profile?.avatar_url}
        subtitle="Upload strategies, briefs, decks. The Professor reads, summarizes, remembers."
      />
      <div className="px-6 lg:px-8 pb-12">
        <DocumentsWorkspace docs={docs ?? []} />
      </div>
    </>
  );
}
