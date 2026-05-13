"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { updateStrategyTrack } from "./actions";

export function TrackMetaEditor({
  trackId,
  labSlug,
  initialSlug,
  initialTitle,
  initialTagline,
  initialDescription,
  initialColor,
}: {
  trackId: string;
  labSlug:
    | "strategy"
    | "pl"
    | "lifestyle"
    | "career";
  initialSlug: string;
  initialTitle: string;
  initialTagline: string;
  initialDescription: string;
  initialColor: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [slug, setSlug] = useState(initialSlug);
  const [title, setTitle] = useState(initialTitle);
  const [tagline, setTagline] = useState(initialTagline);
  const [description, setDescription] = useState(initialDescription);
  const [color, setColor] = useState(initialColor);
  const [pending, start] = useTransition();

  useEffect(() => {
    setSlug(initialSlug);
    setTitle(initialTitle);
    setTagline(initialTagline);
    setDescription(initialDescription);
    setColor(initialColor);
  }, [initialSlug, initialTitle, initialTagline, initialDescription, initialColor]);

  function slugifyTitle() {
    const s = title
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
    if (s.length >= 2) setSlug(s);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    start(async () => {
      try {
        await updateStrategyTrack({
          trackId,
          labSlug,
          slug,
          title,
          tagline: tagline.trim() || null,
          description: description.trim() || null,
          color: color.trim() || null,
        });
        if (slug !== initialSlug) {
          router.replace(
            `/admin/strategy?lab=${labSlug}&track=${encodeURIComponent(slug)}`,
          );
        }
        router.refresh();
        setOpen(false);
      } catch (err) {
        alert((err as Error).message);
      }
    });
  }

  if (!open) {
    return (
      <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(true)}>
        Edit track title / slug / description
      </Button>
    );
  }

  return (
    <form
      className="rounded-xl border border-border-subtle bg-white/[0.02] p-4 space-y-3"
      onSubmit={submit}
    >
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-text-primary">Track shell</h3>
        <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
          Close
        </Button>
      </div>

      <label className="block">
        <span className="text-[11px] uppercase tracking-[0.18em] text-text-muted block mb-1.5">
          Title *
        </span>
        <input className="input-field" required value={title} onChange={(e) => setTitle(e.target.value)} />
      </label>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <label className="flex-1 block min-w-0">
          <span className="text-[11px] uppercase tracking-[0.18em] text-text-muted block mb-1.5">
            URL slug *
          </span>
          <input
            className="input-field font-mono text-sm"
            required
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
          />
        </label>
        <Button type="button" variant="subtle" size="sm" onClick={slugifyTitle}>
          From title
        </Button>
      </div>
      <p className="text-[11px] text-amber-200/70">
        Changing the slug moves the learner URL; old links won&apos;t redirect.
      </p>

      <label className="block">
        <span className="text-[11px] uppercase tracking-[0.18em] text-text-muted block mb-1.5">
          Tagline
        </span>
        <input className="input-field" value={tagline} onChange={(e) => setTagline(e.target.value)} />
      </label>

      <label className="block">
        <span className="text-[11px] uppercase tracking-[0.18em] text-text-muted block mb-1.5">
          Description
        </span>
        <textarea className="input-field min-h-[80px]" value={description} onChange={(e) => setDescription(e.target.value)} />
      </label>

      <label className="block">
        <span className="text-[11px] uppercase tracking-[0.18em] text-text-muted block mb-1.5">
          Accent color
        </span>
        <input className="input-field font-mono text-xs" value={color} onChange={(e) => setColor(e.target.value)} />
      </label>

      <div className="flex justify-end">
        <Button type="submit" variant="gold" size="sm" disabled={pending}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          Save track
        </Button>
      </div>
    </form>
  );
}
