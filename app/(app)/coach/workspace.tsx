"use client";

import { useState, useTransition } from "react";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import {
  RefreshCw,
  Plus,
  Send,
  Trash2,
  Loader2,
  Check,
  Star,
  Sparkles,
  BookOpen,
  Target,
  MessageSquare,
  Heart,
} from "lucide-react";
import {
  createTaskFromMission,
  deleteTask,
  regenerateTodayMission,
  saveReflection,
  setTaskStatus,
} from "./actions";
import { cn, timeAgo } from "@/lib/utils";

type Task = {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  status: string;
  score: number | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  feedback: any;
  deadline: string | null;
  created_at: string;
};

type Reflection = {
  id: string;
  prompt: string;
  response: string;
  created_at: string;
};

type Mission = {
  id: string;
  study_item: string;
  task_item: string;
  reflection_prompt: string;
  lifestyle_item: string;
};

export function CoachWorkspace({
  mission,
  tasks,
  reflections,
}: {
  mission: Mission;
  tasks: Task[];
  reflections: Reflection[];
}) {
  const [isRegen, startRegen] = useTransition();
  const [isCreating, startCreating] = useTransition();
  const [isReflecting, startReflecting] = useTransition();
  const [reflectionDraft, setReflectionDraft] = useState("");

  function regenerate() {
    startRegen(() => regenerateTodayMission());
  }

  function pushTask() {
    startCreating(() =>
      createTaskFromMission({
        title: mission.task_item.replace(/^Task:\s*/i, "").slice(0, 120),
        description: mission.task_item,
        category: "daily_mission",
      }),
    );
  }

  function submitReflection() {
    if (!reflectionDraft.trim()) return;
    startReflecting(async () => {
      await saveReflection(mission.reflection_prompt, reflectionDraft.trim());
      setReflectionDraft("");
    });
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-5">
      <div className="space-y-5">
        <Card>
          <CardHeader>
            <CardTitle>
              <Star className="size-3.5" /> Today&apos;s CMO Mission
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={regenerate}
              disabled={isRegen}
            >
              {isRegen ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <RefreshCw className="size-3.5" />
              )}
              Regenerate
            </Button>
          </CardHeader>
          <CardBody className="space-y-3">
            <MissionRow
              icon={BookOpen}
              label="Study"
              body={mission.study_item.replace(/^Study:\s*/i, "")}
            />
            <MissionRow
              icon={Target}
              label="Task"
              body={mission.task_item.replace(/^Task:\s*/i, "")}
              action={
                <Button size="sm" onClick={pushTask} disabled={isCreating}>
                  {isCreating ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Plus className="size-3.5" />
                  )}
                  Push to tasks
                </Button>
              }
            />
            <MissionRow
              icon={MessageSquare}
              label="Reflection"
              body={mission.reflection_prompt.replace(/^Reflection:\s*/i, "")}
            />
            <MissionRow
              icon={Heart}
              label="Lifestyle"
              body={mission.lifestyle_item.replace(/^Lifestyle:\s*/i, "")}
            />
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              <Target className="size-3.5" /> Active Tasks
            </CardTitle>
            <span className="text-[11px] tracking-[0.16em] uppercase text-text-muted">
              {tasks.length} total
            </span>
          </CardHeader>
          <CardBody className="space-y-3">
            {tasks.length === 0 && (
              <div className="text-sm text-text-muted py-6 text-center">
                No tasks yet. Push today&apos;s mission task above to start.
              </div>
            )}
            {tasks.map((t) => (
              <TaskRow key={t.id} task={t} />
            ))}
          </CardBody>
        </Card>
      </div>

      <div className="space-y-5">
        <Card>
          <CardHeader>
            <CardTitle>
              <MessageSquare className="size-3.5" /> Daily Reflection
            </CardTitle>
          </CardHeader>
          <CardBody className="space-y-3">
            <p className="text-sm text-text-secondary leading-relaxed">
              {mission.reflection_prompt.replace(/^Reflection:\s*/i, "")}
            </p>
            <Textarea
              placeholder="Type your honest answer. The Professor remembers it."
              value={reflectionDraft}
              onChange={(e) => setReflectionDraft(e.target.value)}
              className="min-h-[120px]"
            />
            <Button
              onClick={submitReflection}
              disabled={!reflectionDraft.trim() || isReflecting}
              className="w-full"
            >
              {isReflecting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Send className="size-4" />
              )}
              Save Reflection
            </Button>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              <Sparkles className="size-3.5" /> Recent Reflections
            </CardTitle>
          </CardHeader>
          <CardBody className="space-y-3">
            {reflections.length === 0 && (
              <div className="text-sm text-text-muted">
                No reflections yet.
              </div>
            )}
            {reflections.map((r) => (
              <div
                key={r.id}
                className="rounded-xl border border-border-subtle bg-bg-elevated/50 p-3"
              >
                <div className="text-[10px] tracking-[0.18em] uppercase text-gold-500 mb-1">
                  {timeAgo(r.created_at)}
                </div>
                <p className="text-xs text-text-muted line-clamp-2">{r.prompt}</p>
                <p className="text-sm text-text-secondary mt-1.5 line-clamp-3 leading-relaxed">
                  {r.response}
                </p>
              </div>
            ))}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

function MissionRow({
  icon: Icon,
  label,
  body,
  action,
}: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  label: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-border-subtle bg-bg-elevated/40 p-3.5">
      <div className="flex size-9 items-center justify-center rounded-lg bg-gold-500/8 border border-border-gold text-gold-300 shrink-0">
        <Icon className="size-4" strokeWidth={1.6} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[10px] tracking-[0.18em] uppercase text-gold-500 mb-1">
          {label}
        </div>
        <p className="text-sm text-text-primary leading-relaxed">{body}</p>
      </div>
      {action && <div className="shrink-0 self-start">{action}</div>}
    </div>
  );
}

function TaskRow({ task }: { task: Task }) {
  const [submission, setSubmission] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [open, setOpen] = useState(false);
  const [, startStatus] = useTransition();
  const done = task.status === "completed" || task.status === "reviewed";

  async function submit() {
    if (submission.trim().length < 20) return;
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/tasks/score", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ taskId: task.id, submission }),
      });
      if (!res.ok) throw new Error(await res.text());
      window.location.reload();
    } catch (e) {
      alert("Scoring failed: " + (e as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="rounded-xl border border-border-subtle bg-bg-elevated/40 overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() =>
              startStatus(() =>
                setTaskStatus(task.id, done ? "pending" : "completed"),
              )
            }
            className={cn(
              "flex size-5 shrink-0 items-center justify-center rounded border transition-colors",
              done
                ? "bg-gold-500/15 border-border-gold text-gold-300"
                : "border-white/15 text-transparent hover:border-border-gold",
            )}
          >
            {done && <Check className="size-3.5" strokeWidth={2.5} />}
          </button>
          <div className="min-w-0">
            <div
              className={cn(
                "text-sm font-medium truncate",
                done ? "line-through text-text-muted" : "text-text-primary",
              )}
            >
              {task.title}
            </div>
            <div className="text-[11px] text-text-muted mt-0.5">
              {task.category ?? "general"} • {timeAgo(task.created_at)}
              {task.score != null && (
                <span className="ml-2 text-gold-300">Score {task.score}</span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setOpen((o) => !o)}
          >
            {open ? "Close" : task.feedback ? "View feedback" : "Submit"}
          </Button>
          <button
            onClick={() => startStatus(() => deleteTask(task.id))}
            className="size-8 rounded-md border border-border-hairline hover:border-danger/50 flex items-center justify-center text-text-muted hover:text-danger"
            aria-label="Delete task"
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-border-hairline px-4 py-3 space-y-3 bg-black/30">
          {task.description && (
            <p className="text-xs text-text-secondary leading-relaxed">
              {task.description}
            </p>
          )}
          {task.feedback ? (
            <div className="space-y-2 text-sm">
              <Section title="Strengths" items={task.feedback.strengths ?? []} />
              <Section title="Gaps" items={task.feedback.gaps ?? []} />
              <Section title="Next steps" items={task.feedback.next_steps ?? []} />
            </div>
          ) : (
            <>
              <Textarea
                placeholder="Submit your work here. Min 20 characters. The Professor will score it 0-100 and feed your skill bars."
                value={submission}
                onChange={(e) => setSubmission(e.target.value)}
              />
              <Button
                onClick={submit}
                disabled={submission.trim().length < 20 || isSubmitting}
              >
                {isSubmitting ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Send className="size-4" />
                )}
                Submit for evaluation
              </Button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function Section({ title, items }: { title: string; items: string[] }) {
  if (!items?.length) return null;
  return (
    <div>
      <div className="text-[10px] tracking-[0.18em] uppercase text-gold-500 mb-1">
        {title}
      </div>
      <ul className="space-y-1">
        {items.map((s, i) => (
          <li key={i} className="flex gap-2 text-text-secondary">
            <span className="text-gold-400 shrink-0">›</span>
            <span>{s}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
