import { Bell, Search } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CrownMark } from "@/components/ui/monogram";
import { initials } from "@/lib/utils";

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

export function Topbar({
  displayName,
  avatarUrl,
  notifications = 0,
  subtitle,
}: {
  displayName: string;
  avatarUrl?: string | null;
  notifications?: number;
  subtitle?: string;
}) {
  const firstName = displayName.split(/\s+/)[0];
  return (
    <header className="flex items-center justify-between gap-4 px-6 lg:px-8 py-5">
      <div className="min-w-0">
        <h1 className="font-display text-3xl lg:text-[34px] leading-tight flex items-center gap-2">
          {greeting()}, {firstName}.
          <CrownMark className="ml-1" />
        </h1>
        {subtitle && (
          <p className="mt-1 text-sm text-text-muted">{subtitle}</p>
        )}
      </div>
      <div className="flex items-center gap-3">
        <button
          className="size-10 rounded-xl border border-border-hairline hover:border-border-gold flex items-center justify-center text-text-muted hover:text-gold-300 transition-colors"
          aria-label="Search"
        >
          <Search className="size-4" strokeWidth={1.6} />
        </button>
        <button
          className="relative size-10 rounded-xl border border-border-hairline hover:border-border-gold flex items-center justify-center text-text-muted hover:text-gold-300 transition-colors"
          aria-label="Notifications"
        >
          <Bell className="size-4" strokeWidth={1.6} />
          {notifications > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-gradient-gold text-bg-primary text-[10px] font-semibold flex items-center justify-center">
              {notifications}
            </span>
          )}
        </button>
        <Avatar className="h-10 w-10">
          {avatarUrl ? <AvatarImage src={avatarUrl} alt={displayName} /> : null}
          <AvatarFallback>{initials(displayName)}</AvatarFallback>
        </Avatar>
      </div>
    </header>
  );
}
