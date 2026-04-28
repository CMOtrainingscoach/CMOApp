import { redirect } from "next/navigation";
import { Sidebar } from "@/components/shell/sidebar";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/admin";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, avatar_url, role, weekly_streak, onboarded_at")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.onboarded_at) redirect("/onboarding");

  const displayName =
    profile?.display_name ?? user.email?.split("@")[0] ?? "Operator";
  const userIsAdmin = isAdmin(user);

  return (
    <div className="flex min-h-screen">
      <Sidebar
        displayName={displayName}
        avatarUrl={profile?.avatar_url}
        weeklyStreak={profile?.weekly_streak ?? 0}
        role={profile?.role ?? "CMO in the Making"}
        isAdmin={userIsAdmin}
      />
      <main className="flex-1 min-w-0 flex flex-col">{children}</main>
    </div>
  );
}
