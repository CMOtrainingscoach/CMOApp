"use client";

import { useEffect, useState, useTransition } from "react";
import {
  Plus,
  Save,
  Trash2,
  RotateCw,
  ScrollText,
  Award,
  Loader2,
  BookMarked,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import {
  upsertModule,
  deleteModule,
  upsertLesson,
  deleteLesson,
  regenerateLessonCaches,
  upsertAssignment,
  upsertReward,
  replaceModuleBooks,
} from "./actions";
import { LessonHeroUploader } from "./lesson-hero-uploader";

type ModuleT = {
  id: string;
  ord: number;
  title: string;
  summary: string;
  description: string;
  xp_reward: number;
};
type LessonT = {
  id: string;
  module_id: string;
  ord: number;
  title: string;
  learning_objective: string;
  key_points: string[];
  estimated_minutes: number;
  xp_reward: number;
  hero_image_url: string | null;
};
type AssignmentT = {
  id: string;
  module_id: string;
  title: string;
  prompt: string;
  rubric: Record<string, string>;
  success_criteria: string[];
  max_score: number;
};
type RewardT = {
  id: string;
  module_id: string;
  ord: number;
  kind: "letter" | "template" | "video" | "quote_card";
  title: string;
  description: string;
  content: Record<string, unknown>;
};

type ModuleBookRowT = {
  id: string;
  ord: number;
  title: string;
  author: string | null;
  url: string | null;
  notes: string | null;
  xp_reward: number;
};

export function TrackEditorClient({
  trackId,
  trackTitle,
  modules,
  lessons,
  assignments,
  rewards,
  moduleBooksById,
}: {
  trackId: string;
  trackTitle: string;
  modules: ModuleT[];
  lessons: LessonT[];
  assignments: AssignmentT[];
  rewards: RewardT[];
  moduleBooksById: Record<string, ModuleBookRowT[]>;
}) {
  const [activeModuleId, setActiveModuleId] = useState<string | null>(
    modules[0]?.id ?? null,
  );
  const activeModule = modules.find((m) => m.id === activeModuleId) ?? null;

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle>Modules · {trackTitle}</CardTitle>
        </CardHeader>
        <CardBody>
          <div className="space-y-3">
            {modules.length === 0 && (
              <p className="text-sm text-text-muted italic">
                No modules yet. Add the first one below.
              </p>
            )}
            <ul className="space-y-2">
              {modules.map((m) => (
                <li
                  key={m.id}
                  className={`rounded-xl border px-4 py-3 transition-all ${
                    activeModuleId === m.id
                      ? "border-gold-500/60 bg-gold-500/[0.06]"
                      : "border-border-subtle bg-white/[0.02]"
                  }`}
                >
                  <ModuleRow
                    trackId={trackId}
                    module={m}
                    active={activeModuleId === m.id}
                    onSelect={() => setActiveModuleId(m.id)}
                  />
                </li>
              ))}
            </ul>
            <NewModuleRow trackId={trackId} nextOrd={modules.length} />
          </div>
        </CardBody>
      </Card>

      {activeModule && (
        <>
          <LessonsBlock
            module={activeModule}
            lessons={lessons.filter((l) => l.module_id === activeModule.id)}
          />
          <AssignmentBlock
            module={activeModule}
            assignment={
              assignments.find((a) => a.module_id === activeModule.id) ?? null
            }
          />
          <RewardsBlock
            module={activeModule}
            rewards={rewards.filter((r) => r.module_id === activeModule.id)}
          />
          <BooksBlock
            module={activeModule}
            books={moduleBooksById[activeModule.id] ?? []}
          />
        </>
      )}
    </div>
  );
}

function ModuleRow({
  trackId,
  module,
  active,
  onSelect,
}: {
  trackId: string;
  module: ModuleT;
  active: boolean;
  onSelect: () => void;
}) {
  const [pending, start] = useTransition();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(module);
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onSelect}
          className="flex-1 text-left flex items-center gap-3 min-w-0"
        >
          <span
            className={`flex size-7 shrink-0 items-center justify-center rounded-full text-xs ${
              active
                ? "bg-gold-500/20 text-gold-200 border border-gold-500/40"
                : "bg-white/[0.03] text-text-muted border border-white/10"
            }`}
          >
            {module.ord + 1}
          </span>
          <div className="min-w-0">
            <p className="text-sm font-medium text-text-primary truncate">
              {module.title}
            </p>
            <p className="text-xs text-text-muted truncate">{module.summary}</p>
          </div>
        </button>
        <div className="flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setEditing((v) => !v)}
          >
            {editing ? "Close" : "Edit"}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (!confirm("Delete this module and all its lessons?")) return;
              start(async () => {
                await deleteModule(module.id);
              });
            }}
            disabled={pending}
            className="text-red-400 hover:text-red-300"
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      </div>
      {editing && (
        <form
          className="grid gap-3 pt-2 sm:grid-cols-3"
          onSubmit={(e) => {
            e.preventDefault();
            start(async () => {
              await upsertModule({
                id: module.id,
                track_id: trackId,
                ord: draft.ord,
                title: draft.title,
                summary: draft.summary,
                description: draft.description,
                xp_reward: draft.xp_reward,
              });
              setEditing(false);
            });
          }}
        >
          <input
            className="input-field sm:col-span-3"
            placeholder="Title"
            value={draft.title}
            onChange={(e) => setDraft({ ...draft, title: e.target.value })}
          />
          <input
            className="input-field sm:col-span-3"
            placeholder="Summary (one line)"
            value={draft.summary}
            onChange={(e) => setDraft({ ...draft, summary: e.target.value })}
          />
          <textarea
            className="input-field sm:col-span-3"
            placeholder="Description"
            rows={3}
            value={draft.description}
            onChange={(e) => setDraft({ ...draft, description: e.target.value })}
          />
          <NumberField
            label="Order"
            value={draft.ord}
            onChange={(n) => setDraft({ ...draft, ord: n })}
          />
          <NumberField
            label="XP reward"
            value={draft.xp_reward}
            onChange={(n) => setDraft({ ...draft, xp_reward: n })}
          />
          <Button type="submit" disabled={pending} variant="gold">
            {pending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            Save module
          </Button>
        </form>
      )}
    </div>
  );
}

function NewModuleRow({
  trackId,
  nextOrd,
}: {
  trackId: string;
  nextOrd: number;
}) {
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  if (!open) {
    return (
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
        <Plus className="size-3.5" /> Add module
      </Button>
    );
  }
  return (
    <form
      className="flex items-center gap-2 pt-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (!title.trim()) return;
        start(async () => {
          await upsertModule({
            track_id: trackId,
            ord: nextOrd,
            title,
            xp_reward: 150,
          });
          setTitle("");
          setOpen(false);
        });
      }}
    >
      <input
        className="input-field"
        placeholder="New module title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        autoFocus
      />
      <Button type="submit" disabled={pending} variant="gold" size="sm">
        Add
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setOpen(false)}
      >
        Cancel
      </Button>
    </form>
  );
}

function LessonsBlock({
  module,
  lessons,
}: {
  module: ModuleT;
  lessons: LessonT[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Lessons · {module.title}</CardTitle>
      </CardHeader>
      <CardBody>
        <div className="space-y-3">
          {lessons.length === 0 && (
            <p className="text-sm text-text-muted italic">
              No lessons yet. Add lessons below.
            </p>
          )}
          <ul className="space-y-3">
            {lessons.map((l) => (
              <li
                key={l.id}
                className="rounded-xl border border-border-subtle bg-white/[0.02] p-4"
              >
                <LessonEditor lesson={l} />
              </li>
            ))}
          </ul>
          <NewLessonRow moduleId={module.id} nextOrd={lessons.length} />
        </div>
      </CardBody>
    </Card>
  );
}

function LessonEditor({ lesson }: { lesson: LessonT }) {
  const [pending, start] = useTransition();
  const [draft, setDraft] = useState(lesson);
  const [keyPointsText, setKeyPointsText] = useState(
    lesson.key_points.join("\n"),
  );
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setDraft((d) =>
      d.id === lesson.id
        ? { ...d, hero_image_url: lesson.hero_image_url }
        : d,
    );
  }, [lesson.id, lesson.hero_image_url]);

  const save = () => {
    start(async () => {
      const points = keyPointsText
        .split(/\r?\n/)
        .map((s) => s.trim())
        .filter((s) => s.length >= 2);
      await upsertLesson({
        id: draft.id,
        module_id: draft.module_id,
        ord: draft.ord,
        title: draft.title,
        learning_objective: draft.learning_objective,
        key_points: points,
        estimated_minutes: draft.estimated_minutes,
        xp_reward: draft.xp_reward,
      });
    });
  };

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <span className="size-7 rounded-full bg-white/[0.03] border border-white/10 text-xs flex items-center justify-center text-text-muted">
            {lesson.ord + 1}
          </span>
          <div className="min-w-0">
            <p className="text-sm font-medium text-text-primary truncate">
              {lesson.title}
            </p>
            <p className="text-xs text-text-muted truncate">
              {lesson.learning_objective}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              start(async () => {
                await regenerateLessonCaches(lesson.id);
              })
            }
            disabled={pending}
          >
            <RotateCw className="size-3.5" />
            Regen caches
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setOpen((v) => !v)}
          >
            {open ? "Close" : "Edit"}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (!confirm("Delete this lesson?")) return;
              start(async () => {
                await deleteLesson(lesson.id);
              });
            }}
            disabled={pending}
            className="text-red-400 hover:text-red-300"
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      </div>
      {open && (
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <input
            className="input-field sm:col-span-3"
            placeholder="Title"
            value={draft.title}
            onChange={(e) => setDraft({ ...draft, title: e.target.value })}
          />
          <textarea
            className="input-field sm:col-span-3"
            placeholder="Learning objective"
            rows={2}
            value={draft.learning_objective}
            onChange={(e) =>
              setDraft({ ...draft, learning_objective: e.target.value })
            }
          />
          <div className="sm:col-span-3">
            <label className="text-[11px] uppercase tracking-[0.18em] text-text-muted block mb-1.5">
              Key points (one per line)
            </label>
            <textarea
              className="input-field"
              rows={6}
              value={keyPointsText}
              onChange={(e) => setKeyPointsText(e.target.value)}
            />
          </div>
          <NumberField
            label="Order"
            value={draft.ord}
            onChange={(n) => setDraft({ ...draft, ord: n })}
          />
          <NumberField
            label="Minutes"
            value={draft.estimated_minutes}
            onChange={(n) => setDraft({ ...draft, estimated_minutes: n })}
          />
          <NumberField
            label="XP"
            value={draft.xp_reward}
            onChange={(n) => setDraft({ ...draft, xp_reward: n })}
          />
          <LessonHeroUploader
            key={`${lesson.id}-${draft.hero_image_url ?? "none"}`}
            lessonId={lesson.id}
            lessonTitle={draft.title || lesson.title}
            initialUrl={draft.hero_image_url}
          />
          <Button onClick={save} disabled={pending} variant="gold">
            {pending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            Save lesson
          </Button>
        </div>
      )}
    </div>
  );
}

function NewLessonRow({
  moduleId,
  nextOrd,
}: {
  moduleId: string;
  nextOrd: number;
}) {
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  if (!open) {
    return (
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
        <Plus className="size-3.5" /> Add lesson
      </Button>
    );
  }
  return (
    <form
      className="flex items-center gap-2 pt-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (!title.trim()) return;
        start(async () => {
          await upsertLesson({
            module_id: moduleId,
            ord: nextOrd,
            title,
            key_points: [],
            estimated_minutes: 8,
            xp_reward: 50,
          });
          setTitle("");
          setOpen(false);
        });
      }}
    >
      <input
        className="input-field"
        placeholder="New lesson title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        autoFocus
      />
      <Button type="submit" disabled={pending} variant="gold" size="sm">
        Add
      </Button>
      <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
        Cancel
      </Button>
    </form>
  );
}

function AssignmentBlock({
  module,
  assignment,
}: {
  module: ModuleT;
  assignment: AssignmentT | null;
}) {
  const [pending, start] = useTransition();
  const [draft, setDraft] = useState<AssignmentT>(
    assignment ?? {
      id: "",
      module_id: module.id,
      title: "",
      prompt: "",
      rubric: {},
      success_criteria: [],
      max_score: 100,
    },
  );
  const [rubricText, setRubricText] = useState(
    JSON.stringify(draft.rubric, null, 2),
  );
  const [criteriaText, setCriteriaText] = useState(
    draft.success_criteria.join("\n"),
  );
  const [error, setError] = useState<string | null>(null);

  const save = () => {
    setError(null);
    let rubric: Record<string, string>;
    try {
      rubric = JSON.parse(rubricText) as Record<string, string>;
    } catch {
      setError("Rubric must be valid JSON ({\"key\":\"description\"}).");
      return;
    }
    const criteria = criteriaText
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean);
    start(async () => {
      await upsertAssignment({
        id: draft.id || undefined,
        module_id: module.id,
        title: draft.title,
        prompt: draft.prompt,
        rubric,
        success_criteria: criteria,
        max_score: draft.max_score,
      });
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <ScrollText className="size-3.5" /> Assignment · {module.title}
        </CardTitle>
      </CardHeader>
      <CardBody className="space-y-3">
        <input
          className="input-field"
          placeholder="Assignment title"
          value={draft.title}
          onChange={(e) => setDraft({ ...draft, title: e.target.value })}
        />
        <textarea
          className="input-field"
          rows={5}
          placeholder="Prompt: tell the user exactly what to produce."
          value={draft.prompt}
          onChange={(e) => setDraft({ ...draft, prompt: e.target.value })}
        />
        <div>
          <label className="text-[11px] uppercase tracking-[0.18em] text-text-muted block mb-1.5">
            Rubric (JSON: {`{"key":"description"}`})
          </label>
          <textarea
            className="input-field font-mono text-xs"
            rows={6}
            value={rubricText}
            onChange={(e) => setRubricText(e.target.value)}
          />
        </div>
        <div>
          <label className="text-[11px] uppercase tracking-[0.18em] text-text-muted block mb-1.5">
            Success criteria (one per line)
          </label>
          <textarea
            className="input-field"
            rows={4}
            value={criteriaText}
            onChange={(e) => setCriteriaText(e.target.value)}
          />
        </div>
        <NumberField
          label="Max score"
          value={draft.max_score}
          onChange={(n) => setDraft({ ...draft, max_score: n })}
        />
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <div className="flex justify-end">
          <Button onClick={save} disabled={pending} variant="gold">
            {pending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            Save assignment
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}

function BooksBlock({
  module,
  books,
}: {
  module: ModuleT;
  books: ModuleBookRowT[];
}) {
  const fp = JSON.stringify(
    books.map((b) => [b.ord, b.title, b.author, b.url, b.notes, b.xp_reward]),
  );
  const [open, setOpen] = useState(true);
  const [rows, setRows] = useState<ModuleBookDraft[]>(() =>
    rowToDrafts(books),
  );
  const [pending, start] = useTransition();

  useEffect(() => {
    setRows(rowToDrafts(books));
  }, [module.id, fp]);

  const save = () => {
    const payload = rows
      .map((r) => ({
        title: r.title.trim(),
        author: r.author.trim() ? r.author.trim() : null,
        url: r.url.trim() ? r.url.trim() : null,
        notes: r.notes.trim() ? r.notes.trim() : null,
        xp_reward: Math.min(500, Math.max(0, r.xp_reward || 0)),
      }))
      .filter((r) => r.title.length > 0);
    start(async () => {
      await replaceModuleBooks(module.id, payload);
    });
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex w-full items-center justify-between gap-3 text-left"
        >
          <CardTitle className="flex items-center gap-2 text-base">
            <BookMarked className="size-3.5" /> Books to read · {module.title}
          </CardTitle>
          <ChevronDown
            className={`size-4 shrink-0 text-text-muted transition-transform ${open ? "rotate-180" : ""}`}
          />
        </button>
      </CardHeader>
      {open && (
        <CardBody className="space-y-3 pt-0">
          {rows.length === 0 && (
            <p className="text-sm text-text-muted italic">
              No books yet. Add curated reading for this module.
            </p>
          )}
          {rows.map((row, i) => (
            <div
              key={i}
              className="rounded-xl border border-border-subtle bg-white/[0.02] p-4 space-y-3"
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block sm:col-span-2">
                  <span className="text-[11px] uppercase tracking-[0.18em] text-text-muted block mb-1.5">
                    Title *
                  </span>
                  <input
                    className="input-field"
                    placeholder="Book title"
                    value={row.title}
                    onChange={(e) => {
                      const next = [...rows];
                      next[i] = { ...next[i], title: e.target.value };
                      setRows(next);
                    }}
                  />
                </label>
                <label className="block">
                  <span className="text-[11px] uppercase tracking-[0.18em] text-text-muted block mb-1.5">
                    Author
                  </span>
                  <input
                    className="input-field"
                    placeholder="Optional"
                    value={row.author}
                    onChange={(e) => {
                      const next = [...rows];
                      next[i] = { ...next[i], author: e.target.value };
                      setRows(next);
                    }}
                  />
                </label>
                <NumberField
                  label="XP reward"
                  value={row.xp_reward}
                  onChange={(n) => {
                    const next = [...rows];
                    next[i] = { ...next[i], xp_reward: n };
                    setRows(next);
                  }}
                />
                <label className="block sm:col-span-2">
                  <span className="text-[11px] uppercase tracking-[0.18em] text-text-muted block mb-1.5">
                    URL
                  </span>
                  <input
                    className="input-field"
                    placeholder="https://…"
                    value={row.url}
                    onChange={(e) => {
                      const next = [...rows];
                      next[i] = { ...next[i], url: e.target.value };
                      setRows(next);
                    }}
                  />
                </label>
                <label className="block sm:col-span-2">
                  <span className="text-[11px] uppercase tracking-[0.18em] text-text-muted block mb-1.5">
                    Curator notes
                  </span>
                  <textarea
                    className="input-field"
                    rows={2}
                    placeholder="Why read this…"
                    value={row.notes}
                    onChange={(e) => {
                      const next = [...rows];
                      next[i] = { ...next[i], notes: e.target.value };
                      setRows(next);
                    }}
                  />
                </label>
              </div>
              <div className="flex justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-400"
                  onClick={() =>
                    setRows(rows.filter((_, idx) => idx !== i))
                  }
                >
                  <Trash2 className="size-3.5" /> Remove
                </Button>
              </div>
            </div>
          ))}
          <div className="flex flex-wrap gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                setRows([
                  ...rows,
                  {
                    title: "",
                    author: "",
                    url: "",
                    notes: "",
                    xp_reward: 25,
                  },
                ])
              }
            >
              <Plus className="size-3.5" /> Add book
            </Button>
            <Button variant="gold" size="sm" onClick={save} disabled={pending}>
              {pending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Save className="size-4" />
              )}
              Save books
            </Button>
          </div>
        </CardBody>
      )}
    </Card>
  );
}

type ModuleBookDraft = {
  title: string;
  author: string;
  url: string;
  notes: string;
  xp_reward: number;
};

function rowToDrafts(rows: ModuleBookRowT[]): ModuleBookDraft[] {
  return [...rows]
    .sort((a, b) => a.ord - b.ord)
    .map((b) => ({
      title: b.title,
      author: b.author ?? "",
      url: b.url ?? "",
      notes: b.notes ?? "",
      xp_reward: b.xp_reward,
    }));
}

function RewardsBlock({
  module,
  rewards,
}: {
  module: ModuleT;
  rewards: RewardT[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <Award className="size-3.5" /> Rewards · {module.title}
        </CardTitle>
      </CardHeader>
      <CardBody className="space-y-3">
        {rewards.length === 0 && (
          <p className="text-sm text-text-muted italic">
            No rewards yet. Add one to celebrate the user's win.
          </p>
        )}
        {rewards.map((r) => (
          <RewardEditor key={r.id} reward={r} />
        ))}
        <NewRewardRow moduleId={module.id} nextOrd={rewards.length} />
      </CardBody>
    </Card>
  );
}

function RewardEditor({ reward }: { reward: RewardT }) {
  const [pending, start] = useTransition();
  const [draft, setDraft] = useState(reward);
  const [contentText, setContentText] = useState(
    JSON.stringify(reward.content, null, 2),
  );
  const [error, setError] = useState<string | null>(null);

  const save = () => {
    setError(null);
    let content: Record<string, unknown> = {};
    if (contentText.trim()) {
      try {
        content = JSON.parse(contentText) as Record<string, unknown>;
      } catch {
        setError("Content must be valid JSON.");
        return;
      }
    }
    start(async () => {
      await upsertReward({
        id: draft.id,
        module_id: draft.module_id,
        ord: draft.ord,
        kind: draft.kind,
        title: draft.title,
        description: draft.description,
        content,
      });
    });
  };

  return (
    <div className="rounded-xl border border-border-subtle bg-white/[0.02] p-4 space-y-3">
      <div className="grid gap-3 sm:grid-cols-3">
        <select
          className="input-field"
          value={draft.kind}
          onChange={(e) =>
            setDraft({ ...draft, kind: e.target.value as RewardT["kind"] })
          }
        >
          <option value="letter">Letter</option>
          <option value="template">Template</option>
          <option value="quote_card">Quote card</option>
          <option value="video">Video</option>
        </select>
        <input
          className="input-field sm:col-span-2"
          placeholder="Title"
          value={draft.title}
          onChange={(e) => setDraft({ ...draft, title: e.target.value })}
        />
        <textarea
          className="input-field sm:col-span-3"
          placeholder="Description"
          rows={2}
          value={draft.description}
          onChange={(e) => setDraft({ ...draft, description: e.target.value })}
        />
        <div className="sm:col-span-3">
          <label className="text-[11px] uppercase tracking-[0.18em] text-text-muted block mb-1.5">
            Content (JSON shape per kind)
          </label>
          <textarea
            className="input-field font-mono text-xs"
            rows={5}
            value={contentText}
            onChange={(e) => setContentText(e.target.value)}
          />
        </div>
        <NumberField
          label="Order"
          value={draft.ord}
          onChange={(n) => setDraft({ ...draft, ord: n })}
        />
      </div>
      {error && <p className="text-red-400 text-sm">{error}</p>}
      <div className="flex justify-end">
        <Button onClick={save} disabled={pending} variant="gold" size="sm">
          {pending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          Save reward
        </Button>
      </div>
    </div>
  );
}

function NewRewardRow({
  moduleId,
  nextOrd,
}: {
  moduleId: string;
  nextOrd: number;
}) {
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  if (!open) {
    return (
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
        <Plus className="size-3.5" /> Add reward
      </Button>
    );
  }
  return (
    <Button
      variant="gold"
      size="sm"
      disabled={pending}
      onClick={() => {
        start(async () => {
          await upsertReward({
            module_id: moduleId,
            ord: nextOrd,
            kind: "letter",
            title: "Letter from your Professor",
            description: "A short personal letter on completing this module.",
            content: {
              body: "Operator,\n\nYou earned this. Don't dilute the standard.\n\n— The Professor",
            },
          });
          setOpen(false);
        });
      }}
    >
      <Plus className="size-3.5" /> Insert default letter reward
    </Button>
  );
}

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
}) {
  return (
    <label className="block">
      <span className="text-[11px] uppercase tracking-[0.18em] text-text-muted block mb-1.5">
        {label}
      </span>
      <input
        type="number"
        className="input-field"
        value={value}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
      />
    </label>
  );
}
