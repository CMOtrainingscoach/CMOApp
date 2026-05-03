"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  GraduationCap,
  Target,
  TrendingUp,
  BookOpen,
  FileText,
  HeartPulse,
  Briefcase,
  Sparkles,
  Flame,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import { Monogram } from "@/components/ui/monogram";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { initials, cn } from "@/lib/utils";

type NavItem = {
  label: string;
  sub: string;
  href: string;
  icon: LucideIcon;
};

const NAV: NavItem[] = [
  { label: "Dashboard",   sub: "Today's Mission",          href: "/dashboard",    icon: LayoutDashboard },
  { label: "Professor",   sub: "Learn & Master",           href: "/professor",    icon: GraduationCap },
  { label: "Coach",       sub: "Tasks & Missions",         href: "/coach",        icon: Target },
  { label: "P&L Lab",     sub: "Finance & Metrics",        href: "/pl-lab",       icon: TrendingUp },
  { label: "Strategy Lab",sub: "Frameworks & Tools",       href: "/strategy-lab", icon: BookOpen },
  { label: "Progress",    sub: "Track & Improve",          href: "/progress",     icon: TrendingUp },
  { label: "Documents",   sub: "Upload & Review",          href: "/documents",    icon: FileText },
  { label: "Lifestyle",   sub: "Discipline & Habits",      href: "/lifestyle",    icon: HeartPulse },
  { label: "Career",      sub: "Brand & Opportunities",    href: "/career",       icon: Briefcase },
  { label: "AI Tools",    sub: "Growth Systems",           href: "/ai-tools",     icon: Sparkles },
];

export function Sidebar({
  displayName,
  avatarUrl,
  weeklyStreak,
  role,
  isAdmin = false,
  rank,
  level,
}: {
  displayName: string;
  avatarUrl?: string | null;
  weeklyStreak: number;
  role: string;
  isAdmin?: boolean;
  rank?: string | null;
  level?: number | null;
}) {
  const pathname = usePathname();
  const items: NavItem[] = isAdmin
    ? [
        ...NAV,
        {
          label: "Admin",
          sub: "Professor & Branding",
          href: "/admin",
          icon: ShieldCheck,
        },
      ]
    : NAV;
  return (
    <aside className="hidden lg:flex flex-col w-[260px] shrink-0 border-r border-border-hairline bg-bg-elevated/50 backdrop-blur">
      <div className="px-5 pt-6 pb-5 border-b border-border-hairline">
        <Link href="/dashboard" className="flex items-start gap-3">
          <Monogram size={56} />
          <div className="pt-1">
            <div className="font-display text-2xl leading-none gold-text">ME</div>
            <div className="mt-1.5 text-[9px] tracking-[0.22em] uppercase text-gold-500">
              CMO Ascension Mode
            </div>
          </div>
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors",
                active
                  ? "bg-gradient-gold-soft border border-border-gold"
                  : "hover:bg-white/[0.03] border border-transparent",
              )}
            >
              <Icon
                className={cn(
                  "size-5 shrink-0 transition-colors",
                  active ? "text-gold-300" : "text-text-muted group-hover:text-gold-400",
                )}
                strokeWidth={1.6}
              />
              <div className="min-w-0">
                <div
                  className={cn(
                    "text-[12.5px] font-semibold tracking-[0.12em] uppercase leading-tight",
                    active ? "text-gold-200" : "text-text-secondary",
                  )}
                >
                  {item.label}
                </div>
                <div className="text-[10px] text-text-muted leading-tight mt-0.5">
                  {item.sub}
                </div>
              </div>
            </Link>
          );
        })}
      </nav>

      <div className="px-3 pb-3 space-y-2">
        {rank && (
          <Link
            href="/progress"
            className="card-premium p-4 block hover:border-border-gold transition-colors"
          >
            <div className="flex items-center justify-between mb-1">
              <div className="text-[10px] tracking-[0.18em] uppercase text-gold-500">
                Rank
              </div>
              {level != null && (
                <span className="text-[10px] tracking-[0.18em] uppercase text-text-muted">
                  Lv. {level}
                </span>
              )}
            </div>
            <div className="font-display text-xl gold-text leading-tight">
              {rank}
            </div>
            <div className="mt-1 text-[10px] text-text-muted leading-tight">
              Overall · all labs combined
            </div>
          </Link>
        )}
        <div className="card-premium p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="text-[10px] tracking-[0.18em] uppercase text-gold-500">
              Weekly Streak
            </div>
            <Flame className="size-4 text-gold-400" strokeWidth={1.8} />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="font-display text-3xl gold-text leading-none">
              {weeklyStreak}
            </span>
            <span className="text-[10px] tracking-[0.18em] uppercase text-gold-500">
              Days
            </span>
          </div>
          <div className="mt-2 text-[11px] text-text-muted leading-relaxed">
            Keep building. No days off.
          </div>
        </div>
      </div>

      <div className="px-3 pb-4 border-t border-border-hairline pt-3">
        <Link
          href="/settings"
          className="flex items-center gap-3 px-2 py-1.5 rounded-lg hover:bg-white/[0.03] transition-colors"
        >
          <Avatar className="h-9 w-9">
            {avatarUrl ? (
              <AvatarImage src={avatarUrl} alt={displayName} />
            ) : null}
            <AvatarFallback>{initials(displayName)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-text-primary truncate">
              {displayName.toUpperCase()}
            </div>
            <div className="text-[10px] tracking-[0.16em] uppercase text-text-muted truncate">
              {role}
            </div>
          </div>
        </Link>
      </div>
    </aside>
  );
}
