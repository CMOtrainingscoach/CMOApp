"use client";

import { useCallback, useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  Loader2,
  Lightbulb,
  RotateCcw,
  Table2,
  Trophy,
} from "lucide-react";
import { TheoryBody } from "@/components/strategy/theory-body";
import { PlSheetTable } from "@/components/pl/pl-sheet-table";
import { Button } from "@/components/ui/button";
import type {
  PlSheetDrillDifficulty,
  PublicPlSheetDrillPayload,
} from "@/lib/pl/pl-sheet-drill-types";
import {
  startPlSheetDrillSession,
  submitPlSheetDrillAnswer,
  requestPlSheetDrillHint,
} from "@/lib/pl/pl-sheet-drill-actions";

const DIFFICULTY_META: {
  id: PlSheetDrillDifficulty;
  label: string;
  blurb: string;
  xp: number;
}[] = [
  { id: "easy", label: "Easy", blurb: "Compact sheet, one clear ratio.", xp: 10 },
  {
    id: "medium",
    label: "Medium",
    blurb: "More line items, bridge-style reading.",
    xp: 20,
  },
  { id: "hard", label: "Hard", blurb: "Dense excerpt; careful line choice.", xp: 50 },
];

export type PlSheetDrillRunnerProps = {
  /** Optional hero from Admin → Minigames */
  headerImageUrl?: string | null;
  headerImageAlt?: string;
};

export function PlSheetDrillRunner({
  headerImageUrl = null,
  headerImageAlt = "P&L sheet drill header banner",
}: PlSheetDrillRunnerProps) {
  const [phase, setPhase] = useState<
    "pick" | "play" | "done_ok" | "done_fail"
  >("pick");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sheet, setSheet] = useState<PublicPlSheetDrillPayload | null>(null);
  const [questionMd, setQuestionMd] = useState<string>("");
  const [difficulty, setDifficulty] = useState<PlSheetDrillDifficulty | null>(
    null,
  );
  const [answer, setAnswer] = useState("");
  const [attemptsLeft, setAttemptsLeft] = useState(3);
  const [feedbackMd, setFeedbackMd] = useState<string | null>(null);
  const [hintMd, setHintMd] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [xpAwarded, setXpAwarded] = useState<number | null>(null);
  const [pending, startTransition] = useTransition();
  const [hintPending, startHintTransition] = useTransition();

  const resetToPick = () => {
    setPhase("pick");
    setSessionId(null);
    setSheet(null);
    setQuestionMd("");
    setDifficulty(null);
    setAnswer("");
    setAttemptsLeft(3);
    setFeedbackMd(null);
    setHintMd(null);
    setError(null);
    setXpAwarded(null);
  };

  const start = (d: PlSheetDrillDifficulty) => {
    setError(null);
    setFeedbackMd(null);
    setHintMd(null);
    startTransition(async () => {
      const res = await startPlSheetDrillSession(d);
      if ("error" in res) {
        setError(res.error);
        return;
      }
      setSessionId(res.sessionId);
      setSheet(res.sheet);
      setQuestionMd(res.questionMd);
      setDifficulty(res.difficulty);
      setAttemptsLeft(3);
      setAnswer("");
      setPhase("play");
    });
  };

  const requestHint = () => {
    if (!sessionId || pending || hintPending || hintMd) return;
    setError(null);
    startHintTransition(async () => {
      const res = await requestPlSheetDrillHint({ sessionId });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setHintMd(res.hintMd);
    });
  };

  const submit = () => {
    if (!sessionId || pending || hintPending) return;
    const trimmed = answer.trim();
    if (trimmed.length < 2) {
      setError("Write a short answer before submitting.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await submitPlSheetDrillAnswer({
        sessionId,
        answer: trimmed,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setFeedbackMd(res.feedbackMd);
      setAttemptsLeft(res.attemptsLeft);
      if (res.correct && res.status === "completed") {
        setPhase("done_ok");
        setXpAwarded(res.xpAwarded ?? null);
        setAnswer("");
        return;
      }
      if (!res.correct && res.status === "failed") {
        setPhase("done_fail");
        setAnswer("");
        return;
      }
      setAnswer("");
    });
  };

  const onAnotherDifficulty = useCallback(() => {
    resetToPick();
  }, []);

  return (
    <>
      {headerImageUrl ? (
        <div className="relative mb-8 w-full max-w-6xl overflow-hidden rounded-2xl border border-border-gold/20 shadow-[0_20px_50px_-20px_rgba(0,0,0,.55)]">
          <div className="relative aspect-[21/9] min-h-[160px] w-full md:aspect-[24/9] md:min-h-[200px]">
            <Image
              src={headerImageUrl}
              alt={headerImageAlt}
              fill
              className="object-cover object-[center_30%]"
              sizes="(max-width: 1280px) 100vw,1152px"
              priority
            />
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                backgroundImage:
                  "linear-gradient(90deg, rgba(10,10,10,0.55) 0%, transparent 50%), linear-gradient(180deg, transparent 45%, rgba(10,10,10,0.75) 100%)",
              }}
            />
          </div>
        </div>
      ) : null}

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(260px,_320px)] items-start">
        <div className="space-y-6 min-w-0">
        <div className="flex flex-wrap gap-3 justify-between items-center">
          <Link
            href="/pl-lab"
            className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-text-muted hover:text-gold-300 transition-colors"
          >
            <ArrowLeft className="size-3.5" /> P&amp;L Lab
          </Link>
          {phase !== "pick" && (
            <button
              type="button"
              onClick={resetToPick}
              disabled={pending}
              className="btn-ghost px-3 py-1.5 text-xs uppercase tracking-[0.16em] inline-flex items-center gap-2"
            >
              <RotateCcw className="size-3.5" /> Change difficulty
            </button>
          )}
        </div>

        <header className="space-y-2">
          <span className="badge-gold inline-flex items-center gap-1">
            <Table2 className="size-3" /> Practice
          </span>
          <h1 className="font-display text-3xl sm:text-4xl tracking-tight gold-text">
            P&amp;L sheet drill
          </h1>
          <p className="text-sm text-text-muted max-w-xl leading-relaxed">
            Read a simulated excerpt, answer one question, get Professor
            feedback. You have <strong className="text-text-primary">three</strong>{" "}
            graded attempts per sheet. Easy / medium / hard award{" "}
            <span className="text-gold-300/90">10 / 20 / 50 P&amp;L Lab XP</span>{" "}
            on a correct answer.
          </p>
        </header>

        {error && (
          <div
            className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-100"
            role="alert"
          >
            {error}
          </div>
        )}

        {phase === "pick" && (
          <div className="grid gap-4 sm:grid-cols-3">
            {DIFFICULTY_META.map((d) => (
              <button
                key={d.id}
                type="button"
                disabled={pending}
                onClick={() => start(d.id)}
                className="card-premium-hover p-5 text-left border border-border-subtle rounded-xl transition-colors hover:border-gold-500/35 disabled:opacity-50"
              >
                <div className="text-[10px] uppercase tracking-[0.2em] text-gold-300">
                  {d.label}
                </div>
                <div className="mt-2 font-display text-xl text-text-primary">
                  +{d.xp} XP
                </div>
                <p className="mt-2 text-sm text-text-muted leading-relaxed">
                  {d.blurb}
                </p>
                {pending ? (
                  <Loader2 className="size-4 animate-spin text-gold-400 mt-4" />
                ) : (
                  <span className="mt-4 inline-block text-xs text-gold-300">
                    Start →
                  </span>
                )}
              </button>
            ))}
          </div>
        )}

        {(phase === "play" || phase === "done_ok" || phase === "done_fail") &&
          sheet && (
            <>
              <PlSheetTable sheet={sheet} />

              <div className="card-premium p-6 sm:p-8 space-y-4">
                <div className="text-[10px] uppercase tracking-[0.2em] text-gold-300">
                  Assignment
                </div>
                <TheoryBody markdown={questionMd} />
              </div>

              {phase === "play" && (
                <>
                  <div
                    className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between"
                  >
                    <div
                      className="text-xs uppercase tracking-[0.18em] text-text-muted"
                      aria-live="polite"
                    >
                      Attempts remaining:{" "}
                      <span className="text-gold-300 tabular-nums">
                        {attemptsLeft}
                      </span>{" "}
                      / 3
                    </div>
                    <Button
                      type="button"
                      variant="subtle"
                      size="sm"
                      disabled={pending || hintPending || Boolean(hintMd)}
                      onClick={requestHint}
                      className="uppercase tracking-[0.14em] text-[11px] inline-flex items-center gap-2 shrink-0"
                    >
                      {hintPending ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <Lightbulb className="size-3.5" />
                      )}
                      {hintMd ? "Hint used" : "Ask the Professor for a hint"}
                    </Button>
                  </div>
                  <p className="text-[11px] text-text-muted -mt-1">
                    One hint per sheet — it won&apos;t spend an attempt.
                  </p>
                  {hintMd && (
                    <div className="card-premium p-5 border border-gold-500/25 bg-gold-500/[0.04] space-y-2">
                      <div className="text-[10px] uppercase tracking-[0.2em] text-gold-300 inline-flex items-center gap-1.5">
                        <Lightbulb className="size-3" /> Professor hint
                      </div>
                      <TheoryBody markdown={hintMd} />
                    </div>
                  )}
                  <textarea
                    className="input-field min-h-[140px] text-sm leading-relaxed"
                    placeholder="Your answer — be specific with numbers and line items where it helps."
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    disabled={pending || hintPending}
                  />
                  <Button
                    variant="gold"
                    size="lg"
                    disabled={pending || hintPending || answer.trim().length < 2}
                    onClick={submit}
                  >
                    {pending ? (
                      <>
                        <Loader2 className="size-4 animate-spin" /> Checking…
                      </>
                    ) : (
                      "Submit for grading"
                    )}
                  </Button>
                </>
              )}

              {feedbackMd && phase === "play" && (
                <div className="card-premium p-6 border border-white/10">
                  <div className="text-[10px] uppercase tracking-[0.2em] text-gold-300 mb-3">
                    Professor feedback
                  </div>
                  <TheoryBody markdown={feedbackMd} />
                  <p className="mt-4 text-xs text-text-muted">
                    Revise your answer above and submit again if you still have
                    attempts.
                  </p>
                </div>
              )}

              {phase === "done_ok" && (
                <div className="card-premium border border-emerald-500/30 bg-emerald-500/[0.06] p-8 space-y-4">
                  <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-emerald-300">
                    <Trophy className="size-3.5" /> Correct
                  </div>
                  <p className="font-display text-2xl text-text-primary">
                    {xpAwarded != null ?
                      `+${xpAwarded} P&L Lab XP`
                    : "Round complete"}
                  </p>
                  {feedbackMd && <TheoryBody markdown={feedbackMd} />}
                  <Button variant="gold" onClick={onAnotherDifficulty}>
                    Play again
                  </Button>
                </div>
              )}

              {phase === "done_fail" && (
                <div className="card-premium border border-amber-500/30 bg-amber-500/[0.04] p-8 space-y-4">
                  <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-amber-300">
                    Round closed
                  </div>
                  <p className="text-sm text-text-muted leading-relaxed max-w-lg">
                    You used all three attempts without a correct answer. Start
                    a fresh sheet — same rules, new numbers.
                  </p>
                  {feedbackMd && <TheoryBody markdown={feedbackMd} />}
                  <Button variant="gold" onClick={onAnotherDifficulty}>
                    Try another sheet
                  </Button>
                </div>
              )}
            </>
          )}

        </div>

        <aside className="card-premium p-7 space-y-4 lg:sticky lg:top-24 text-sm text-text-muted leading-relaxed">
        <p>
          <strong className="text-text-primary">How it works</strong>
        </p>
        <ul className="space-y-2 list-disc pl-4">
          <li>One Professor hint per sheet (optional); it does not use a graded attempt.</li>
          <li>Each submit calls the Professor once — wrong answers burn an attempt.</li>
          <li>If OpenAI isn&apos;t configured, grading errors do not use an attempt.</li>
        </ul>
        {difficulty && (
          <p className="text-[11px] uppercase tracking-[0.16em] text-gold-500/90">
            Current session:{" "}
            <span className="text-gold-200">{difficulty}</span>
          </p>
        )}
        </aside>
      </div>
    </>
  );
}
