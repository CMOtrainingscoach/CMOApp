"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Check, Circle, Lock } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { TheoryBody } from "@/components/strategy/theory-body";
import { completeCmoLifeMilestone } from "@/app/(app)/progress/actions";
import type { CmoLifeRoadmapStepVm } from "@/lib/progress/cmo-life-state";

function initials(name: string | null | undefined): string {
  if (!name?.trim()) return "You";
  const parts = name.trim().split(/\s+/);
  const a = parts[0]?.[0] ?? "";
  const b = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? "" : "";
  return (a + b).toUpperCase() || "You";
}

export function CmoLifeRoadmap({
  steps,
  avatarUrl,
  displayName,
}: {
  steps: CmoLifeRoadmapStepVm[];
  avatarUrl: string | null;
  displayName: string | null;
}) {
  const router = useRouter();
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const total = steps.length;
  const doneCount = steps.filter((s) => s.done).length;
  const ratio = total > 0 ? Math.min(1, doneCount / total) : 0;

  if (total === 0) {
    return (
      <p className="text-sm text-text-muted max-w-xl leading-relaxed">
        The CMO Life path is being set up. Check back soon for your sequential roadmap and
        milestone rewards.
      </p>
    );
  }

  return (
    <div className="relative max-w-4xl pl-14">
      <div
        className="absolute left-[1.125rem] top-0 bottom-0 w-px bg-gradient-to-b from-gold-500/15 via-gold-400/35 to-gold-500/15"
        aria-hidden
      />
      <div
        className="absolute left-[1.125rem] z-10 w-12 -translate-x-1/2 transition-[top] duration-700 ease-out pointer-events-none"
        style={{
          top: `${ratio * 100}%`,
          transform: "translate(-50%, -50%)",
        }}
        title="Your progress"
      >
        <Avatar className="size-12 ring-2 ring-gold-500/50 shadow-lg shadow-black/40 pointer-events-auto">
          {avatarUrl ? <AvatarImage src={avatarUrl} alt="" /> : null}
          <AvatarFallback>{initials(displayName)}</AvatarFallback>
        </Avatar>
      </div>

      <div className="space-y-6 min-w-0">
        <p className="text-sm text-text-muted leading-relaxed">
          Unlock milestones in order. Lesson steps complete automatically when you finish the
          lesson; custom goals use <span className="text-gold-200/90">Mark complete</span> when
          you are ready. Rewards stay hidden until a step is done.
        </p>
        {err && <p className="text-xs text-red-300">{err}</p>}
        <ul className="space-y-6">
          {steps.map((step) => (
            <li
              key={step.id}
              className="rounded-xl border border-border-subtle bg-bg-primary/40 p-4 space-y-3"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="mt-0.5">
                    {step.locked ? (
                      <Lock className="size-5 text-text-muted shrink-0" />
                    ) : step.done ? (
                      <Check className="size-5 text-gold-400 shrink-0" />
                    ) : (
                      <Circle className="size-5 text-gold-500/70 shrink-0" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-[0.16em] text-text-muted">
                      <span>
                        {step.locked
                          ? "Locked"
                          : step.done
                            ? "Done"
                            : "Active"}
                      </span>
                      <span className="text-gold-500/90">
                        {step.milestone_kind === "lesson" ? "Lesson" : "Custom"}
                      </span>
                      {step.progressSource === "admin" && (
                        <span className="text-amber-300/90">Coach</span>
                      )}
                    </div>
                    <h3 className="font-display text-lg mt-1">{step.title}</h3>
                    {step.description?.trim() && (
                      <div className="mt-2 text-sm max-w-none">
                        <TheoryBody markdown={step.description} />
                      </div>
                    )}
                    {step.milestone_kind === "custom" &&
                      step.custom_detail?.trim() && (
                        <div className="mt-3 rounded-lg border border-border-subtle/80 bg-black/20 px-3 py-2 text-xs text-text-secondary leading-relaxed">
                          {step.custom_detail}
                        </div>
                      )}
                    {step.milestone_kind === "lesson" && step.lessonHref && (
                      <div className="mt-3">
                        {step.locked ? (
                          <span className="text-xs text-text-muted">
                            Complete the prior milestone to open this lesson.
                          </span>
                        ) : (
                          <Link
                            href={step.lessonHref}
                            className="btn-ghost px-3 py-2 text-xs uppercase tracking-wide inline-flex"
                          >
                            Open lesson
                            {step.lessonTitle ? ` · ${step.lessonTitle}` : ""}
                          </Link>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                {step.canSelfComplete && (
                  <Button
                    type="button"
                    size="sm"
                    disabled={pending}
                    onClick={() => {
                      setErr(null);
                      start(async () => {
                        try {
                          await completeCmoLifeMilestone(step.id);
                          router.refresh();
                        } catch (e) {
                          setErr(
                            e instanceof Error
                              ? e.message
                              : "Could not save progress.",
                          );
                        }
                      });
                    }}
                  >
                    Mark complete
                  </Button>
                )}
              </div>

              {step.done &&
                (step.reward_text?.trim() || step.reward_image_url) && (
                  <div className="rounded-lg border border-gold-500/25 bg-gradient-to-br from-gold-500/10 to-transparent p-4 space-y-3">
                    <div className="text-[10px] uppercase tracking-[0.2em] text-gold-400">
                      Reward unlocked
                    </div>
                    {step.reward_image_url && (
                      <div className="relative w-full max-w-md overflow-hidden rounded-md border border-border-subtle">
                        <Image
                          src={step.reward_image_url}
                          alt=""
                          width={640}
                          height={360}
                          className="w-full h-auto object-contain max-h-64 bg-black/30"
                        />
                      </div>
                    )}
                    {step.reward_text?.trim() && (
                      <TheoryBody markdown={step.reward_text} />
                    )}
                  </div>
                )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
