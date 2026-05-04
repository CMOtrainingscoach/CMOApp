"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
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
  Menu,
  X,
  type LucideIcon,
} from "lucide-react";
import { Monogram } from "@/components/ui/monogram";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { initials, cn } from "@/lib/utils";

type NavItem = {
  label: string;
  sub: string;
  href: string;
  icon: LucideIcon;
};

const NAV: NavItem[] = [
  { label: "Dashboard", sub: "Today's Mission", href: "/dashboard", icon: LayoutDashboard },
  { label: "Professor", sub: "Learn & Master", href: "/professor", icon: GraduationCap },
  { label: "Coach", sub: "Tasks & Missions", href: "/coach", icon: Target },
  { label: "P&L Lab", sub: "Finance & Metrics", href: "/pl-lab", icon: TrendingUp },
  {
    label: "Strategy Lab",
    sub: "Frameworks & Tools",
    href: "/strategy-lab",
    icon: BookOpen,
  },
  { label: "Progress", sub: "Track & Improve", href: "/progress", icon: TrendingUp },
  { label: "Documents", sub: "Upload & Review", href: "/documents", icon: FileText },
  { label: "Lifestyle", sub: "Discipline & Habits", href: "/lifestyle", icon: HeartPulse },
  { label: "Career", sub: "Brand & Opportunities", href: "/career", icon: Briefcase },
  { label: "AI Tools", sub: "Growth Systems", href: "/ai-tools", icon: Sparkles },
];

function NavLinks({
  items,
  pathname,
  onNavigate,
}: {
  items: NavItem[];
  pathname: string | null;
  onNavigate?: () => void;
}) {
  return (
    <>
      {items.map((item) => {
        const active =
          pathname === item.href || pathname?.startsWith(`${item.href}/`);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
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
    </>
  );
}

function SidebarFooterCards({
  rank,
  level,
  weeklyStreak,
  displayName,
  avatarUrl,
  role,
  onNavigate,
}: {
  rank?: string | null;
  level?: number | null;
  weeklyStreak: number;
  displayName: string;
  avatarUrl?: string | null;
  role: string;
  onNavigate?: () => void;
}) {
  return (
    <div className="px-3 pb-4 pt-0 space-y-2 shrink-0">
      {rank && (
        <Link
          href="/progress"
          onClick={onNavigate}
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
          <div className="font-display text-xl gold-text leading-tight">{rank}</div>
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

      <div className="border-t border-border-hairline pt-3">
        <Link
          href="/settings"
          onClick={onNavigate}
          className="flex items-center gap-3 px-2 py-1.5 rounded-lg hover:bg-white/[0.03] transition-colors"
        >
          <Avatar className="h-9 w-9">
            {avatarUrl ? <AvatarImage src={avatarUrl} alt={displayName} /> : null}
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
    </div>
  );
}

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
  const [mobileOpen, setMobileOpen] = useState(false);

  const items: NavItem[] = useMemo(
    () =>
      isAdmin
        ? [
            ...NAV,
            {
              label: "Admin",
              sub: "Professor & Branding",
              href: "/admin",
              icon: ShieldCheck,
            },
          ]
        : NAV,
    [isAdmin],
  );

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const closeMobile = () => setMobileOpen(false);

  return (
    <>
      {/* Mobile: top bar + menu */}
      <Dialog.Root open={mobileOpen} onOpenChange={setMobileOpen}>
        <header className="lg:hidden fixed inset-x-0 top-0 z-40 flex h-14 shrink-0 items-center gap-3 border-b border-border-hairline bg-bg-elevated/90 px-3 backdrop-blur-md supports-[backdrop-filter]:bg-bg-elevated/75">
          <Dialog.Trigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="shrink-0"
              aria-label="Open navigation menu"
            >
              <Menu className="size-5 text-text-primary" strokeWidth={1.75} />
            </Button>
          </Dialog.Trigger>
          <Link
            href="/dashboard"
            className="flex min-w-0 flex-1 items-center gap-2"
            onClick={() => setMobileOpen(false)}
          >
            <Monogram size={40} />
            <span className="truncate font-display text-lg leading-none gold-text">ME</span>
          </Link>
          <Link
            href="/settings"
            className="shrink-0 rounded-lg p-1.5 hover:bg-white/[0.05]"
            aria-label="Settings"
            onClick={() => setMobileOpen(false)}
          >
            <Avatar className="h-8 w-8">
              {avatarUrl ? <AvatarImage src={avatarUrl} alt={displayName} /> : null}
              <AvatarFallback className="text-[10px]">
                {initials(displayName)}
              </AvatarFallback>
            </Avatar>
          </Link>
        </header>

        <Dialog.Portal>
          <Dialog.Overlay className="lg:hidden fixed inset-0 z-50 bg-black/70 backdrop-blur-[2px]" />
          <Dialog.Content
            aria-describedby={undefined}
            className={cn(
              "lg:hidden fixed left-0 top-0 z-50 flex h-full w-[min(280px,100vw)] max-w-[100vw]",
              "flex-col border-r border-border-hairline bg-bg-elevated shadow-elevated outline-none",
            )}
          >
            <Dialog.Title className="sr-only">Main navigation</Dialog.Title>

            <div className="flex items-center justify-between border-b border-border-hairline px-4 py-4">
              <Link
                href="/dashboard"
                className="flex items-start gap-3"
                onClick={closeMobile}
              >
                <Monogram size={48} />
                <div className="pt-0.5">
                  <div className="font-display text-xl leading-none gold-text">ME</div>
                  <div className="mt-1 text-[9px] tracking-[0.22em] uppercase text-gold-500">
                    CMO Ascension Mode
                  </div>
                </div>
              </Link>
              <Dialog.Close asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="shrink-0"
                  aria-label="Close menu"
                >
                  <X className="size-5" strokeWidth={1.75} />
                </Button>
              </Dialog.Close>
            </div>

            <nav className="min-h-0 flex-1 space-y-0.5 overflow-y-auto px-3 py-3">
              <NavLinks items={items} pathname={pathname} onNavigate={closeMobile} />
            </nav>

            <SidebarFooterCards
              rank={rank}
              level={level}
              weeklyStreak={weeklyStreak}
              displayName={displayName}
              avatarUrl={avatarUrl}
              role={role}
              onNavigate={closeMobile}
            />
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-[260px] shrink-0 flex-col border-r border-border-hairline bg-bg-elevated/50 backdrop-blur">
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
          <NavLinks items={items} pathname={pathname} />
        </nav>

        <SidebarFooterCards
          rank={rank}
          level={level}
          weeklyStreak={weeklyStreak}
          displayName={displayName}
          avatarUrl={avatarUrl}
          role={role}
        />
      </aside>
    </>
  );
}
