"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { MultipleChoice } from "./multiple-choice";
import { TrueFalse } from "./true-false";
import { FillStep } from "./fill-step";
import { CaseScenario } from "./case-scenario";
import type {
  AnswerValue,
  FeedbackResult,
  FillPayload,
  McPayload,
  RunnerQuestion,
} from "./types";

type Props = {
  lessonId: string;
  questions: RunnerQuestion[];
  onComplete: (summary: { totalXp: number; correct: number; total: number }) => void;
};

type AnswerState = {
  value: AnswerValue | null;
  result: FeedbackResult | null;
  // Convenience caches for showing correct answer post-grade
  correctIndex: number | null;
  correctValue: boolean | null;
};

const blank = (): AnswerState => ({
  value: null,
  result: null,
  correctIndex: null,
  correctValue: null,
});

export function MinigameRunner({ lessonId, questions, onComplete }: Props) {
  const [idx, setIdx] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [answers, setAnswers] = useState<AnswerState[]>(() =>
    questions.map(blank),
  );
  const [caseDraft, setCaseDraft] = useState("");

  const current = questions[idx];
  const state = answers[idx];
  const totalXp = useMemo(
    () =>
      answers.reduce(
        (acc, a) => acc + (a.result?.correct ? a.result?.xp_awarded ?? 0 : 0),
        0,
      ),
    [answers],
  );
  const correctCount = answers.filter((a) => a.result?.correct).length;
  const isLast = idx === questions.length - 1;
  const locked = state?.result != null;

  if (!current) {
    return (
      <div className="card-premium p-8 text-center text-text-muted">
        No questions available for this lesson yet.
      </div>
    );
  }

  const updateAnswer = (value: AnswerValue) => {
    setAnswers((prev) =>
      prev.map((a, i) => (i === idx ? { ...a, value } : a)),
    );
  };

  const submit = async () => {
    if (!state.value) return;
    setSubmitting(true);
    let payload: unknown = state.value;
    if (state.value.kind === "case_scenario") {
      payload = { text: caseDraft };
    } else if (state.value.kind === "multiple_choice") {
      payload = { index: state.value.index };
    } else if (state.value.kind === "fill_step") {
      payload = { index: state.value.index };
    } else if (state.value.kind === "true_false") {
      payload = { value: state.value.value };
    }
    try {
      const res = await fetch(`/api/strategy/lessons/${lessonId}/answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question_id: current.id, answer: payload }),
      });
      const data = (await res.json()) as FeedbackResult & {
        xp_awarded?: number;
      };
      // Compute "correct" answer reveal from current.payload + (best guess) — but we don't know the
      // truth client-side. So just show the user whether they were right; show their selection.
      setAnswers((prev) =>
        prev.map((a, i) =>
          i === idx
            ? {
                ...a,
                result: {
                  correct: data.correct,
                  explanation: data.explanation,
                  feedback: data.feedback,
                  xp_awarded: data.xp_awarded ?? 0,
                },
                correctIndex:
                  data.correct &&
                  (current.kind === "multiple_choice" ||
                    current.kind === "fill_step") &&
                  state.value &&
                  (state.value.kind === "multiple_choice" ||
                    state.value.kind === "fill_step")
                    ? state.value.index
                    : null,
                correctValue:
                  data.correct &&
                  current.kind === "true_false" &&
                  state.value?.kind === "true_false"
                    ? state.value.value
                    : null,
              }
            : a,
        ),
      );
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  const next = () => {
    if (isLast) {
      onComplete({
        totalXp,
        correct: correctCount,
        total: questions.length,
      });
      return;
    }
    setIdx((i) => i + 1);
    setCaseDraft("");
  };

  return (
    <div className="space-y-6">
      {/* Progress dots */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          {questions.map((_, i) => {
            const a = answers[i];
            const state =
              i < idx
                ? a.result?.correct
                  ? "correct"
                  : "wrong"
                : i === idx
                  ? "active"
                  : "pending";
            return (
              <span
                key={i}
                className={cn(
                  "h-1.5 w-8 rounded-full transition-all",
                  state === "correct" && "bg-emerald-500/70",
                  state === "wrong" && "bg-red-500/70",
                  state === "active" && "bg-gold-500/70",
                  state === "pending" && "bg-white/8",
                )}
              />
            );
          })}
        </div>
        <div className="text-xs uppercase tracking-[0.18em] text-text-muted">
          <span className="text-gold-300">+{totalXp} XP</span> · {correctCount}/
          {questions.length} correct
        </div>
      </div>

      <div className="card-premium p-6 sm:p-8">
        {current.kind === "multiple_choice" && (
          <MultipleChoice
            prompt={current.prompt}
            payload={current.payload as McPayload}
            selected={
              state.value?.kind === "multiple_choice" ? state.value.index : null
            }
            onSelect={(index) =>
              updateAnswer({ kind: "multiple_choice", index })
            }
            locked={locked}
            correctIndex={state.correctIndex}
          />
        )}
        {current.kind === "true_false" && (
          <TrueFalse
            prompt={current.prompt}
            selected={
              state.value?.kind === "true_false" ? state.value.value : null
            }
            onSelect={(value) => updateAnswer({ kind: "true_false", value })}
            locked={locked}
            correctValue={state.correctValue}
          />
        )}
        {current.kind === "fill_step" && (
          <FillStep
            prompt={current.prompt}
            payload={current.payload as FillPayload}
            selected={
              state.value?.kind === "fill_step" ? state.value.index : null
            }
            onSelect={(index) => updateAnswer({ kind: "fill_step", index })}
            locked={locked}
            correctIndex={state.correctIndex}
          />
        )}
        {current.kind === "case_scenario" && (
          <CaseScenario
            prompt={current.prompt}
            value={caseDraft}
            onChange={(text) => {
              setCaseDraft(text);
              updateAnswer({ kind: "case_scenario", text });
            }}
            locked={locked}
          />
        )}

        {state.result && (
          <div
            className={cn(
              "mt-6 rounded-xl border p-4 text-sm leading-relaxed",
              state.result.correct
                ? "border-emerald-500/30 bg-emerald-500/[0.06] text-emerald-100"
                : "border-red-500/30 bg-red-500/[0.06] text-red-100",
            )}
          >
            <div className="flex items-center justify-between">
              <strong className="uppercase tracking-[0.18em] text-[11px]">
                {state.result.correct ? "Correct" : "Not quite"}
              </strong>
              {state.result.correct && state.result.xp_awarded ? (
                <span className="text-gold-300 text-[11px] uppercase tracking-[0.18em]">
                  +{state.result.xp_awarded} XP
                </span>
              ) : null}
            </div>
            <p className="mt-2 text-text-secondary">{state.result.explanation}</p>
            {state.result.feedback && (
              <p className="mt-2 italic text-text-muted">
                {state.result.feedback}
              </p>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-[0.18em] text-text-muted">
          Question {idx + 1} / {questions.length}
        </span>
        {!state.result ? (
          <Button
            onClick={submit}
            disabled={submitting || !canSubmit(current, state.value, caseDraft)}
            variant="gold"
          >
            {submitting ? "Checking…" : "Submit"}
          </Button>
        ) : (
          <Button onClick={next} variant="gold">
            {isLast ? "Finish challenge" : "Next question"}
          </Button>
        )}
      </div>
    </div>
  );
}

function canSubmit(
  q: RunnerQuestion,
  value: AnswerValue | null,
  caseDraft: string,
): boolean {
  if (!value) return q.kind === "case_scenario" ? caseDraft.trim().length >= 20 : false;
  if (value.kind === "case_scenario")
    return caseDraft.trim().length >= 20;
  if (value.kind === "multiple_choice" || value.kind === "fill_step")
    return value.index >= 0;
  if (value.kind === "true_false") return typeof value.value === "boolean";
  return false;
}
