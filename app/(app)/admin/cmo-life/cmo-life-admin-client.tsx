"use client";

import Image from "next/image";
import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";
import {
  ChevronDown,
  ChevronUp,
  Loader2,
  Plus,
  Search,
  Trash2,
  Upload,
} from "lucide-react";
import type { Database } from "@/types/database";
import { Button } from "@/components/ui/button";
import {
  adminSetCmoLifeMilestoneForUser,
  clearCmoLifeMilestoneRewardImage,
  createCmoLifeMilestone,
  deleteCmoLifeMilestone,
  moveCmoLifeMilestone,
  searchCmoLifeLessons,
  updateCmoLifeMilestone,
  uploadCmoLifeMilestoneRewardImage,
  type CmoLifeLessonSearchHit,
} from "./actions";

export type EnrichedMilestone =
  Database["public"]["Tables"]["cmo_life_milestones"]["Row"] & {
    lesson_label: string | null;
    lesson_href: string | null;
  };

function lessonHrefFromSearchHit(h: CmoLifeLessonSearchHit): string {
  const base =
    h.lab_slug === "pl"
      ? "/pl-lab"
      : h.lab_slug === "lifestyle"
        ? "/lifestyle"
        : h.lab_slug === "career"
          ? "/career"
          : "/strategy-lab";
  return `${base}/${h.trackSlug}/${h.moduleId}/${h.id}`;
}

function MilestoneEditor({
  initial,
  onDone,
  defaultOpen,
}: {
  initial: EnrichedMilestone | null;
  onDone?: () => void;
  defaultOpen?: boolean;
}) {
  const isCreate = !initial;
  const [open, setOpen] = useState(Boolean(defaultOpen));
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [kind, setKind] = useState<"lesson" | "custom">(
    initial?.milestone_kind ?? "custom",
  );
  const [lessonId, setLessonId] = useState<string | null>(
    initial?.lesson_id ?? null,
  );
  const [lessonLabel, setLessonLabel] = useState<string | null>(
    initial?.lesson_label ?? null,
  );
  const [lessonPreviewHref, setLessonPreviewHref] = useState<string | null>(
    initial?.lesson_href ?? null,
  );
  const [customDetail, setCustomDetail] = useState(initial?.custom_detail ?? "");
  const [rewardText, setRewardText] = useState(initial?.reward_text ?? "");
  const [isActive, setIsActive] = useState(initial?.is_active ?? true);
  const [lessonQ, setLessonQ] = useState("");
  const [hits, setHits] = useState<CmoLifeLessonSearchHit[]>([]);
  const [busy, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (lessonQ.trim().length < 2) {
      setHits([]);
      return;
    }
    const t = setTimeout(() => {
      start(async () => {
        try {
          const h = await searchCmoLifeLessons(lessonQ);
          setHits(h);
        } catch (e) {
          setErr(e instanceof Error ? e.message : "Search failed.");
        }
      });
    }, 280);
    return () => clearTimeout(t);
  }, [lessonQ]);

  const rewardUrl = initial?.reward_image_url ?? null;

  const save = () => {
    setErr(null);
    start(async () => {
      try {
        if (isCreate) {
          await createCmoLifeMilestone({
            title,
            description: description || null,
            milestone_kind: kind,
            lesson_id: kind === "lesson" ? lessonId : null,
            custom_detail: customDetail || null,
            reward_text: rewardText || null,
            is_active: isActive,
          });
          setTitle("");
          setDescription("");
          setKind("custom");
          setLessonId(null);
          setLessonLabel(null);
          setLessonPreviewHref(null);
          setCustomDetail("");
          setRewardText("");
          setIsActive(true);
          setLessonQ("");
          onDone?.();
        } else if (initial) {
          await updateCmoLifeMilestone({
            id: initial.id,
            title,
            description: description || null,
            milestone_kind: kind,
            lesson_id: kind === "lesson" ? lessonId : null,
            custom_detail: customDetail || null,
            reward_text: rewardText || null,
            is_active: isActive,
          });
          onDone?.();
        }
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Save failed.");
      }
    });
  };

  if (!open && !isCreate) {
    return (
      <Button
        type="button"
        variant="subtle"
        size="sm"
        onClick={() => setOpen(true)}
      >
        Edit
      </Button>
    );
  }

  return (
    <div className="rounded-lg border border-border-subtle bg-black/20 p-4 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="font-display text-sm gold-text">
          {isCreate ? "New milestone" : "Edit milestone"}
        </div>
        {!isCreate && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-[11px] uppercase tracking-wide"
            onClick={() => setOpen(false)}
          >
            Collapse
          </Button>
        )}
      </div>

      <label className="block space-y-1">
        <span className="text-[10px] uppercase tracking-[0.2em] text-text-muted">
          Title
        </span>
        <input
          className="w-full rounded-md border border-border-subtle bg-bg-primary/80 px-3 py-2 text-sm"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </label>

      <label className="block space-y-1">
        <span className="text-[10px] uppercase tracking-[0.2em] text-text-muted">
          Description (optional, Markdown ok)
        </span>
        <textarea
          className="w-full min-h-[72px] rounded-md border border-border-subtle bg-bg-primary/80 px-3 py-2 text-sm"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </label>

      <div className="flex flex-wrap gap-4">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="radio"
            name={`kind-${initial?.id ?? "new"}`}
            checked={kind === "lesson"}
            onChange={() => {
              setKind("lesson");
            }}
          />
          Lesson-linked
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="radio"
            name={`kind-${initial?.id ?? "new"}`}
            checked={kind === "custom"}
            onChange={() => {
              setKind("custom");
              setLessonId(null);
              setLessonLabel(null);
              setLessonPreviewHref(null);
            }}
          />
          Custom goal
        </label>
      </div>

      {kind === "lesson" && (
        <div className="space-y-2">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 size-4 text-text-muted" />
            <input
              className="w-full rounded-md border border-border-subtle bg-bg-primary/80 pl-8 pr-3 py-2 text-sm"
              placeholder="Search lessons by title…"
              value={lessonQ}
              onChange={(e) => setLessonQ(e.target.value)}
            />
          </div>
          {lessonId && lessonLabel && (
            <p className="text-xs text-gold-200/90">
              Selected: {lessonLabel}
              {(lessonPreviewHref || initial?.lesson_href) && (
                <>
                  {" · "}
                  <Link
                    href={(lessonPreviewHref ?? initial?.lesson_href)!}
                    className="underline text-gold-400"
                  >
                    Open lesson
                  </Link>
                </>
              )}
            </p>
          )}
          {hits.length > 0 && (
            <ul className="max-h-40 overflow-auto rounded-md border border-border-subtle divide-y divide-border-subtle text-xs">
              {hits.map((h) => (
                <li key={h.id}>
                  <button
                    type="button"
                    className="w-full text-left px-3 py-2 hover:bg-white/5"
                    onClick={() => {
                      setLessonId(h.id);
                      setLessonLabel(
                        `${h.title} · ${h.trackTitle} · ${h.moduleTitle}`,
                      );
                      setLessonPreviewHref(lessonHrefFromSearchHit(h));
                      setHits([]);
                      setLessonQ("");
                    }}
                  >
                    <span className="text-text-primary">{h.title}</span>
                    <span className="block text-text-muted text-[11px]">
                      {h.trackTitle} · {h.moduleTitle} ({h.lab_slug})
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {kind === "custom" && (
        <label className="block space-y-1">
          <span className="text-[10px] uppercase tracking-[0.2em] text-text-muted">
            Learner instructions
          </span>
          <textarea
            className="w-full min-h-[72px] rounded-md border border-border-subtle bg-bg-primary/80 px-3 py-2 text-sm"
            value={customDetail}
            onChange={(e) => setCustomDetail(e.target.value)}
          />
        </label>
      )}

      <label className="block space-y-1">
        <span className="text-[10px] uppercase tracking-[0.2em] text-text-muted">
          Reward copy (optional)
        </span>
        <textarea
          className="w-full min-h-[64px] rounded-md border border-border-subtle bg-bg-primary/80 px-3 py-2 text-sm"
          value={rewardText}
          onChange={(e) => setRewardText(e.target.value)}
        />
      </label>

      {!isCreate && initial && (
        <div className="space-y-2">
          <div className="text-[10px] uppercase tracking-[0.2em] text-text-muted">
            Reward image
          </div>
          {rewardUrl ? (
            <div className="rounded-md border border-border-subtle overflow-hidden max-w-sm bg-black/40">
              <Image
                src={rewardUrl}
                alt="Reward"
                width={400}
                height={220}
                className="w-full h-auto object-contain max-h-48"
              />
            </div>
          ) : (
            <p className="text-xs text-text-muted">No image.</p>
          )}
          <div className="flex flex-wrap gap-2">
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              id={`reward-${initial.id}`}
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (!file) return;
                const fd = new FormData();
                fd.set("milestone_id", initial.id);
                fd.set("file", file);
                start(async () => {
                  try {
                    await uploadCmoLifeMilestoneRewardImage(fd);
                    onDone?.();
                  } catch (errUp) {
                    setErr(
                      errUp instanceof Error ? errUp.message : "Upload failed.",
                    );
                  }
                });
              }}
            />
            <Button
              type="button"
              variant="subtle"
              size="sm"
              disabled={busy}
              onClick={() =>
                document.getElementById(`reward-${initial.id}`)?.click()
              }
            >
              {busy ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Upload className="size-4" />
              )}
              {rewardUrl ? "Replace" : "Upload"}
            </Button>
            {rewardUrl && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={busy}
                onClick={() =>
                  start(async () => {
                    try {
                      await clearCmoLifeMilestoneRewardImage(initial.id);
                      onDone?.();
                    } catch (er) {
                      setErr(
                        er instanceof Error ? er.message : "Could not remove.",
                      );
                    }
                  })
                }
              >
                Remove image
              </Button>
            )}
          </div>
        </div>
      )}

      <label className="flex items-center gap-2 text-xs text-text-secondary">
        <input
          type="checkbox"
          checked={isActive}
          onChange={(e) => setIsActive(e.target.checked)}
        />
        Active (learners only see active milestones)
      </label>

      {err && <p className="text-xs text-red-300">{err}</p>}

      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" disabled={busy} onClick={save}>
          {busy ? <Loader2 className="size-4 animate-spin" /> : null}
          {isCreate ? "Create" : "Save"}
        </Button>
      </div>
    </div>
  );
}

export function CmoLifeAdminClient({
  milestones,
}: {
  milestones: EnrichedMilestone[];
}) {
  const router = useRouter();
  const refresh = useCallback(() => {
    router.refresh();
  }, [router]);
  const [coachUser, setCoachUser] = useState("");
  const [coachMilestone, setCoachMilestone] = useState("");
  const [listBusy, startList] = useTransition();
  const [coachBusy, startCoach] = useTransition();
  const [coachErr, setCoachErr] = useState<string | null>(null);

  const ordered = useMemo(
    () => [...milestones].sort((a, b) => a.sort_order - b.sort_order),
    [milestones],
  );

  return (
    <div className="space-y-8">
      <MilestoneEditor initial={null} defaultOpen onDone={refresh} />

      <div className="space-y-4">
        {ordered.map((m, idx) => (
          <div
            key={m.id}
            className="rounded-lg border border-border-subtle p-4 space-y-3 bg-bg-primary/40"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-text-muted">
                  <span>Step {idx + 1}</span>
                  <span className="text-gold-500/90">
                    {m.milestone_kind === "lesson" ? "Lesson" : "Custom"}
                  </span>
                  {!m.is_active && (
                    <span className="text-text-muted">Inactive</span>
                  )}
                </div>
                <h3 className="font-display text-base mt-1">{m.title}</h3>
                {m.lesson_label && (
                  <p className="text-xs text-text-muted mt-1">{m.lesson_label}</p>
                )}
              </div>
              <div className="flex flex-wrap gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="px-2"
                  disabled={idx === 0 || listBusy}
                  title="Move up"
                  onClick={() =>
                    startList(async () => {
                      await moveCmoLifeMilestone(m.id, "up");
                      refresh();
                    })
                  }
                >
                  <ChevronUp className="size-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="px-2"
                  disabled={idx === ordered.length - 1 || listBusy}
                  title="Move down"
                  onClick={() =>
                    startList(async () => {
                      await moveCmoLifeMilestone(m.id, "down");
                      refresh();
                    })
                  }
                >
                  <ChevronDown className="size-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-red-300 px-2"
                  title="Delete"
                  disabled={listBusy}
                  onClick={() => {
                    if (
                      !window.confirm(
                        "Delete this milestone and learner progress rows for it?",
                      )
                    )
                      return;
                    startList(async () => {
                      await deleteCmoLifeMilestone(m.id);
                      refresh();
                    });
                  }}
                >
                  <Trash2 className="size-4" />
                </Button>
                <MilestoneEditor initial={m} onDone={refresh} />
              </div>
            </div>
          </div>
        ))}
        {ordered.length === 0 && (
          <p className="text-sm text-text-muted">
            No milestones yet. Create the first step above.
          </p>
        )}
      </div>

      <div className="rounded-lg border border-border-subtle border-dashed p-4 space-y-3">
        <div className="text-[10px] uppercase tracking-[0.2em] text-text-muted flex items-center gap-2">
          <Plus className="size-3.5" /> Coaching override
        </div>
        <p className="text-xs text-text-secondary">
          Set or clear completion for any user (UUID). Uses admin service access.
        </p>
        <input
          className="w-full rounded-md border border-border-subtle bg-bg-primary/80 px-3 py-2 text-xs font-mono"
          placeholder="User id (uuid)"
          value={coachUser}
          onChange={(e) => setCoachUser(e.target.value)}
        />
        <select
          className="w-full rounded-md border border-border-subtle bg-bg-primary/80 px-3 py-2 text-sm"
          value={coachMilestone}
          onChange={(e) => setCoachMilestone(e.target.value)}
        >
          <option value="">Select milestone…</option>
          {ordered.map((m) => (
            <option key={m.id} value={m.id}>
              {m.sort_order}. {m.title}
            </option>
          ))}
        </select>
        {coachErr && <p className="text-xs text-red-300">{coachErr}</p>}
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            disabled={coachBusy || !coachUser || !coachMilestone}
            onClick={() => {
              setCoachErr(null);
              startCoach(async () => {
                try {
                  await adminSetCmoLifeMilestoneForUser(
                    coachUser.trim(),
                    coachMilestone,
                    true,
                  );
                  refresh();
                } catch (e) {
                  setCoachErr(
                    e instanceof Error ? e.message : "Could not update user.",
                  );
                }
              });
            }}
          >
            Mark complete
          </Button>
          <Button
            type="button"
            variant="subtle"
            size="sm"
            disabled={coachBusy || !coachUser || !coachMilestone}
            onClick={() => {
              setCoachErr(null);
              startCoach(async () => {
                try {
                  await adminSetCmoLifeMilestoneForUser(
                    coachUser.trim(),
                    coachMilestone,
                    false,
                  );
                  refresh();
                } catch (e) {
                  setCoachErr(
                    e instanceof Error ? e.message : "Could not update user.",
                  );
                }
              });
            }}
          >
            Clear completion
          </Button>
        </div>
      </div>
    </div>
  );
}
