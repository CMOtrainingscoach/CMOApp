"use client";

import { useEffect, useState } from "react";
import { FileDown, Mail, Quote, Video } from "lucide-react";
import { cn } from "@/lib/utils";

type Reward = {
  id: string;
  kind: "letter" | "template" | "video" | "quote_card";
  title: string;
  description: string | null;
  content: Record<string, unknown>;
};

export function RewardReveal({
  rewards,
  displayName,
  moduleTitle,
}: {
  rewards: Reward[];
  displayName: string;
  moduleTitle: string;
}) {
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setRevealed(true), 200);
    rewards.forEach((r) => {
      void fetch(`/api/strategy/rewards/${r.id}/view`, { method: "POST" });
    });
    return () => clearTimeout(t);
  }, [rewards]);

  return (
    <div className="space-y-6">
      {rewards.map((r, i) => (
        <div
          key={r.id}
          className={cn(
            "card-premium p-8 transition-all duration-700",
            revealed
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-4",
          )}
          style={{ transitionDelay: `${i * 120}ms` }}
        >
          <div className="flex items-center gap-3 mb-4">
            <RewardIcon kind={r.kind} />
            <div>
              <p className="text-[10px] uppercase tracking-[0.22em] text-gold-300">
                {labelFor(r.kind)}
              </p>
              <h3 className="text-xl font-semibold tracking-tight text-text-primary">
                {r.title}
              </h3>
            </div>
          </div>
          {r.description && (
            <p className="text-sm text-text-muted leading-relaxed mb-5">
              {r.description}
            </p>
          )}
          <RewardContent
            reward={r}
            displayName={displayName}
            moduleTitle={moduleTitle}
          />
        </div>
      ))}
    </div>
  );
}

function RewardIcon({ kind }: { kind: Reward["kind"] }) {
  const cls =
    "size-10 rounded-xl flex items-center justify-center border border-gold-500/40 bg-gold-500/10 text-gold-300";
  if (kind === "letter") return <div className={cls}><Mail className="size-5" /></div>;
  if (kind === "template") return <div className={cls}><FileDown className="size-5" /></div>;
  if (kind === "video") return <div className={cls}><Video className="size-5" /></div>;
  return <div className={cls}><Quote className="size-5" /></div>;
}

function labelFor(kind: Reward["kind"]) {
  switch (kind) {
    case "letter":
      return "Letter from your Professor";
    case "template":
      return "Strategy template";
    case "video":
      return "Cinematic message";
    case "quote_card":
      return "Operator's quote";
  }
}

function RewardContent({
  reward,
  displayName,
  moduleTitle,
}: {
  reward: Reward;
  displayName: string;
  moduleTitle: string;
}) {
  const c = reward.content;
  if (reward.kind === "letter") {
    const body = (c.body as string | undefined) ??
      defaultLetter(displayName, moduleTitle);
    return (
      <article className="border-l border-gold-500/30 pl-4 italic text-text-secondary leading-relaxed whitespace-pre-line">
        {body}
        <div className="not-italic mt-4 text-gold-300 text-sm uppercase tracking-[0.18em]">
          — The Professor
        </div>
      </article>
    );
  }
  if (reward.kind === "quote_card") {
    const quote = (c.quote as string | undefined) ?? "Strategy is choice.";
    const attr = (c.attribution as string | undefined) ?? "The Operator's Doctrine";
    return (
      <div
        className="rounded-xl p-8 text-center"
        style={{
          background:
            "linear-gradient(160deg, rgba(232,198,110,0.10) 0%, rgba(15,15,15,0.0) 50%), linear-gradient(180deg, #0c0c0c 0%, #050505 100%)",
        }}
      >
        <Quote className="size-7 mx-auto text-gold-300/70" />
        <p className="mt-4 font-display text-2xl text-text-primary leading-snug">
          {quote}
        </p>
        <p className="mt-3 text-xs uppercase tracking-[0.22em] text-gold-300/80">
          — {attr}
        </p>
      </div>
    );
  }
  if (reward.kind === "template") {
    const sections = (c.sections as string[] | undefined) ?? [];
    return (
      <div>
        <p className="text-sm text-text-secondary mb-4">
          A printable executive worksheet to apply this module's framework.
        </p>
        {sections.length > 0 && (
          <ol className="grid sm:grid-cols-2 gap-2 list-decimal pl-5">
            {sections.map((s, i) => (
              <li
                key={i}
                className="rounded-lg border border-border-subtle bg-white/[0.02] px-3 py-2 text-sm text-text-secondary"
              >
                {s}
              </li>
            ))}
          </ol>
        )}
      </div>
    );
  }
  // video placeholder
  return (
    <div className="rounded-xl border border-border-subtle bg-black/40 p-10 text-center text-text-muted">
      <Video className="size-7 mx-auto text-gold-300/70" />
      <p className="mt-3 text-sm">
        Premium cinematic reward video. Production pending.
      </p>
    </div>
  );
}

function defaultLetter(displayName: string, moduleTitle: string): string {
  const first = displayName.split(/\s+/)[0] ?? "Operator";
  return `${first},

You closed out "${moduleTitle}" — and you did it the hard way: by submitting work that could be defended.

Most professionals will never produce a single deliverable graded by a strategist. You produced one this week. Hold that.

The next module raises the stakes. Don't dilute the standard you just set.`;
}
