"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createStrategyTrack } from "./actions";
import { labContentBasePath } from "@/lib/strategy/lab-routes";
import type { ContentLabSlug } from "@/lib/strategy/lab-slug";

type CmsLabSlug = Extract<
  ContentLabSlug,
  "strategy" | "pl" | "lifestyle" | "career"
>;

export function TrackCreateForm({
  labSlug,
  labLabel,
}: {
  labSlug: CmsLabSlug;
  labLabel: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [slug, setSlug] = useState("");
  const [title, setTitle] = useState("");
  const [tagline, setTagline] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("");
  const [pending, start] = useTransition();

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
        const { slug: createdSlug } = await createStrategyTrack({
          labSlug,
          slug,
          title,
          tagline: tagline.trim() || null,
          description: description.trim() || null,
          color: color.trim() || null,
        });
        setOpen(false);
        setSlug("");
        setTitle("");
        setTagline("");
        setDescription("");
        setColor("");
        router.refresh();
        router.push(
          `/admin/strategy?lab=${labSlug}&track=${encodeURIComponent(createdSlug)}`,
        );
      } catch (err) {
        alert((err as Error).message);
      }
    });
  }

  if (!open) {
    return (
      <div className="mt-6 border-t border-border-hairline pt-5">
        <Button variant="ghost" size="sm" type="button" onClick={() => setOpen(true)}>
          <Plus className="size-3.5" /> Add track to {labLabel}
        </Button>
      </div>
    );
  }

  return (
    <form
      className="mt-6 rounded-xl border border-border-gold/30 bg-white/[0.02] p-4 space-y-3"
      onSubmit={submit}
    >
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-text-primary">New track</h3>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-text-muted"
          onClick={() => setOpen(false)}
        >
          Cancel
        </Button>
      </div>
      <p className="text-xs text-text-muted leading-relaxed">
        Slugs must be unique across <strong className="text-text-secondary">all</strong> labs
        (URLs like{" "}
        <code className="text-gold-300/90">
          {labContentBasePath(labSlug)}/&lt;slug&gt;
        </code>
        ).
      </p>

      <label className="block">
        <span className="text-[11px] uppercase tracking-[0.18em] text-text-muted block mb-1.5">
          Title *
        </span>
        <input
          className="input-field"
          required
          placeholder="e.g. Pipeline Mastery"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </label>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <label className="flex-1 block min-w-0">
          <span className="text-[11px] uppercase tracking-[0.18em] text-text-muted block mb-1.5">
            URL slug *
          </span>
          <input
            className="input-field font-mono text-sm"
            required
            placeholder="pipeline-mastery"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
          />
        </label>
        <Button type="button" variant="subtle" size="sm" onClick={slugifyTitle}>
          From title
        </Button>
      </div>

      <label className="block">
        <span className="text-[11px] uppercase tracking-[0.18em] text-text-muted block mb-1.5">
          Tagline
        </span>
        <input
          className="input-field"
          placeholder="One line under the title on lab home"
          value={tagline}
          onChange={(e) => setTagline(e.target.value)}
        />
      </label>

      <label className="block">
        <span className="text-[11px] uppercase tracking-[0.18em] text-text-muted block mb-1.5">
          Description
        </span>
        <textarea
          className="input-field min-h-[80px]"
          placeholder="Shows on track detail header"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </label>

      <label className="block">
        <span className="text-[11px] uppercase tracking-[0.18em] text-text-muted block mb-1.5">
          Accent color <span className="normal-case tracking-normal opacity-70">(optional)</span>
        </span>
        <input
          className="input-field font-mono text-xs"
          placeholder="#D4AF37 or tailwind token"
          value={color}
          onChange={(e) => setColor(e.target.value)}
        />
      </label>

      <div className="flex justify-end pt-1">
        <Button type="submit" variant="gold" disabled={pending}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
          Create draft track
        </Button>
      </div>
      <p className="text-[11px] text-text-muted italic">
        New tracks start as <strong>Draft</strong> and unpublished. Add modules below, then
        publish when ready.
      </p>
    </form>
  );
}
