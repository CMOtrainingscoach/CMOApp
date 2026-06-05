"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import {
  Award,
  FileDown,
  Gift,
  Mail,
  Quote,
  Video,
  ImageIcon,
  X,
} from "lucide-react";
import { RewardReveal } from "@/components/strategy/reward-reveal";
import { labContentBasePath } from "@/lib/strategy/lab-routes";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type RewardGalleryItem = {
  unlockedAt: string;
  viewedAt: string | null;
  reward: {
    id: string;
    kind: "letter" | "template" | "video" | "quote_card" | "image";
    title: string;
    description: string | null;
    content: Record<string, unknown>;
  };
  moduleTitle: string;
  moduleId: string;
  trackSlug: string;
  trackTitle: string;
  labSlug: "strategy" | "pl" | "lifestyle" | "career";
};

function kindLabel(kind: RewardGalleryItem["reward"]["kind"]) {
  switch (kind) {
    case "letter":
      return "Letter";
    case "template":
      return "Template";
    case "video":
      return "Video";
    case "quote_card":
      return "Quote";
    case "image":
      return "Image";
    default:
      return kind;
  }
}

function KindIcon({
  kind,
  className,
}: {
  kind: RewardGalleryItem["reward"]["kind"];
  className?: string;
}) {
  const cls = cn("size-4 shrink-0 text-gold-300", className);
  if (kind === "letter") return <Mail className={cls} />;
  if (kind === "template") return <FileDown className={cls} />;
  if (kind === "video") return <Video className={cls} />;
  if (kind === "image") return <ImageIcon className={cls} />;
  return <Quote className={cls} />;
}

export function RewardsGallery({
  items,
  displayName,
}: {
  items: RewardGalleryItem[];
  displayName: string;
}) {
  const [open, setOpen] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);

  const active = useMemo(
    () => items.find((i) => i.reward.id === activeId) ?? null,
    [items, activeId],
  );

  function openReward(id: string) {
    setActiveId(id);
    setOpen(true);
  }

  if (items.length === 0) {
    return (
      <div className="card-premium p-10 text-center max-w-xl mx-auto">
        <Gift className="size-10 mx-auto text-gold-400/80 mb-4" strokeWidth={1.5} />
        <h2 className="font-display text-xl text-text-primary tracking-tight">
          No rewards yet
        </h2>
        <p className="mt-3 text-sm text-text-muted leading-relaxed">
          Complete lab assignments and pass grading to unlock letters, templates,
          and notes from your Professor. They will appear here for you to revisit
          anytime.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => (
          <button
            key={`${item.reward.id}-${item.unlockedAt}`}
            type="button"
            onClick={() => openReward(item.reward.id)}
            className={cn(
              "text-left rounded-xl border transition-colors",
              "border-border-subtle bg-bg-card/60 hover:border-border-gold hover:bg-white/[0.03]",
              "p-5 flex flex-col gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500/40",
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="flex size-9 items-center justify-center rounded-lg border border-gold-500/35 bg-gold-500/10">
                  <KindIcon kind={item.reward.kind} className="size-4" />
                </span>
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-gold-400">
                    {kindLabel(item.reward.kind)}
                  </p>
                  <h3 className="font-semibold text-text-primary leading-snug truncate">
                    {item.reward.title}
                  </h3>
                </div>
              </div>
              {!item.viewedAt && (
                <span className="shrink-0 text-[9px] uppercase tracking-[0.16em] px-2 py-0.5 rounded-full bg-gold-500/15 text-gold-200 border border-gold-500/30">
                  New
                </span>
              )}
            </div>
            <p className="text-[11px] text-text-muted leading-relaxed line-clamp-2">
              {item.trackTitle} · {item.moduleTitle}
            </p>
            <p className="text-[10px] text-text-muted uppercase tracking-[0.14em] mt-auto pt-1">
              Unlocked{" "}
              {new Date(item.unlockedAt).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </p>
          </button>
        ))}
      </div>

      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/75 backdrop-blur-[2px]" />
          <Dialog.Content
            aria-describedby={undefined}
            className={cn(
              "fixed z-50 left-1/2 top-1/2 w-[min(640px,calc(100vw-1.5rem))] max-h-[min(90vh,calc(100dvh-2rem))]",
              "-translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border-hairline bg-bg-elevated shadow-elevated outline-none",
              "flex flex-col overflow-hidden",
            )}
          >
            <Dialog.Title className="sr-only">
              {active?.reward.title ?? "Reward"}
            </Dialog.Title>
            <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-border-hairline shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <Award className="size-5 text-gold-400 shrink-0" strokeWidth={1.6} />
                <span className="text-xs uppercase tracking-[0.18em] text-text-muted truncate">
                  Professor reward
                </span>
              </div>
              <Dialog.Close asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="shrink-0"
                  aria-label="Close"
                >
                  <X className="size-5" strokeWidth={1.75} />
                </Button>
              </Dialog.Close>
            </div>

            <div className="overflow-y-auto px-5 py-6 space-y-6">
              {active && (
                <>
                  <RewardReveal
                    rewards={[active.reward]}
                    displayName={displayName}
                    moduleTitle={active.moduleTitle}
                  />
                  <div className="pt-2 border-t border-border-hairline">
                    <Link
                      href={`${labContentBasePath(active.labSlug)}/${active.trackSlug}/${active.moduleId}/reward`}
                      className="text-xs uppercase tracking-[0.18em] text-gold-400 hover:text-gold-300 transition-colors"
                    >
                      Open in track →
                    </Link>
                  </div>
                </>
              )}
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
