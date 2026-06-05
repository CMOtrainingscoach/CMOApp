"use client";

import { useEffect, useState } from "react";
import { FileDown, ImageIcon, Mail, Quote, Video, X } from "lucide-react";
import { cn } from "@/lib/utils";

type Reward = {
  id: string;
  kind: "letter" | "template" | "video" | "quote_card" | "image";
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
  if (kind === "letter")
    return (
      <div className={cls}>
        <Mail className="size-5" />
      </div>
    );
  if (kind === "template")
    return (
      <div className={cls}>
        <FileDown className="size-5" />
      </div>
    );
  if (kind === "video")
    return (
      <div className={cls}>
        <Video className="size-5" />
      </div>
    );
  if (kind === "image")
    return (
      <div className={cls}>
        <ImageIcon className="size-5" />
      </div>
    );
  return (
    <div className={cls}>
      <Quote className="size-5" />
    </div>
  );
}

function labelFor(kind: Reward["kind"]) {
  switch (kind) {
    case "letter":
      return "Letter from your Professor";
    case "template":
      return "Strategy template";
    case "video":
      return "Professor video";
    case "image":
      return "Professor image";
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
    const body =
      (c.body as string | undefined) ?? defaultLetter(displayName, moduleTitle);
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
    const attr =
      (c.attribution as string | undefined) ?? "The Operator's Doctrine";
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
  if (reward.kind === "image") {
    const url = typeof c.image_url === "string" ? c.image_url.trim() : "";
    const cap = typeof c.caption === "string" ? c.caption.trim() : "";
    const alt = cap || reward.title || "Professor reward";
    if (!url) {
      return (
        <p className="text-sm text-text-muted text-center py-6">
          This image reward has not been published yet.
        </p>
      );
    }
    return <ImageRewardFigure url={url} alt={alt} caption={cap} />;
  }
  if (reward.kind === "template") {
    const sections = (c.sections as string[] | undefined) ?? [];
    return (
      <div>
        <p className="text-sm text-text-secondary mb-4">
          A printable executive worksheet to apply this module&apos;s framework.
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
  if (reward.kind === "video") {
    const url = typeof c.video_url === "string" ? c.video_url.trim() : "";
    const cap = typeof c.caption === "string" ? c.caption.trim() : "";
    if (!url) {
      return (
        <p className="text-sm text-text-muted text-center py-6">
          This video reward has not been published yet.
        </p>
      );
    }
    return (
      <div className="space-y-3">
        <video
          className="w-full max-h-[min(70vh,560px)] rounded-xl border border-border-subtle bg-black"
          controls
          playsInline
          preload="metadata"
          src={url}
        >
          Your browser does not support embedded video.
        </video>
        {cap ? (
          <p className="text-sm text-center text-text-muted">{cap}</p>
        ) : null}
      </div>
    );
  }
  return (
    <p className="text-sm text-text-muted text-center py-6">
      This reward couldn&apos;t be displayed. Contact support if it persists.
    </p>
  );
}

function ImageRewardFigure({
  url,
  alt,
  caption,
}: {
  url: string;
  alt: string;
  caption: string;
}) {
  const [lightboxOpen, setLightboxOpen] = useState(false);

  useEffect(() => {
    if (!lightboxOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightboxOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [lightboxOpen]);

  return (
    <>
      <figure className="space-y-3">
        <button
          type="button"
          onClick={() => setLightboxOpen(true)}
          className="group relative w-full overflow-hidden rounded-xl border border-border-subtle bg-black/30 p-0 text-left ring-gold-500/40 transition-shadow hover:ring-2 focus:outline-none focus-visible:ring-2"
          aria-label={`Open ${alt} full screen`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- public Supabase URL */}
          <img
            src={url}
            alt={alt}
            className="w-full max-h-[min(70vh,560px)] cursor-zoom-in object-contain transition-transform duration-300 group-hover:scale-[1.01]"
          />
          <span className="pointer-events-none absolute bottom-3 right-3 rounded-lg bg-black/60 px-2 py-1 text-[10px] uppercase tracking-wider text-gold-200/90 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
            Full screen
          </span>
        </button>
        {caption ? (
          <figcaption className="text-sm text-center text-text-muted">
            {caption}
          </figcaption>
        ) : null}
      </figure>

      {lightboxOpen ? (
        <div
          className="fixed inset-0 z-[200]"
          role="dialog"
          aria-modal="true"
          aria-label="Fullscreen image"
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/95"
            aria-label="Close full screen"
            onClick={() => setLightboxOpen(false)}
          />
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-4 md:p-8">
            <div className="pointer-events-auto flex max-h-full max-w-full flex-col items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element -- public Supabase URL */}
              <img
                src={url}
                alt={alt}
                className="max-h-[min(100dvh-5rem,100dvh)] max-w-[min(100vw-2rem,100vw)] object-contain shadow-2xl"
              />
              {caption ? (
                <p className="mt-4 max-w-lg text-center text-sm text-text-muted">
                  {caption}
                </p>
              ) : null}
              <p className="mt-3 text-[11px] text-text-muted/70">
                Click outside or press Esc to close
              </p>
            </div>
          </div>
          <button
            type="button"
            className="absolute right-4 top-4 z-10 flex size-11 items-center justify-center rounded-xl border border-white/20 bg-white/10 text-white backdrop-blur-sm transition-colors hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-400"
            onClick={() => setLightboxOpen(false)}
            aria-label="Close full screen"
          >
            <X className="size-5" strokeWidth={2} />
          </button>
        </div>
      ) : null}
    </>
  );
}

function defaultLetter(displayName: string, moduleTitle: string): string {
  const first = displayName.split(/\s+/)[0] ?? "Operator";
  return `${first},

You closed out "${moduleTitle}" — and you did it the hard way: by submitting work that could be defended.

Most professionals will never produce a single deliverable graded by a strategist. You produced one this week. Hold that.

The next module raises the stakes. Don&apos;t dilute the standard you just set.`;
}
