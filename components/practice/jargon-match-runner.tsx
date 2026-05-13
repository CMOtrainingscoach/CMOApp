"use client";

import Link from "next/link";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Loader2,
  ArrowLeft,
  Puzzle,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import type {
  JargonSurfaceCell,
  JargonMiss,
  StartPlJargonRoundResult,
  GradePlJargonRoundResult,
} from "@/lib/pl/jargon-match-actions";

type Phase = "loading" | "play" | "grading" | "results";

type DoneGrade = { score: number; total: number; misses: JargonMiss[] };

type StartRoundFn = () => Promise<StartPlJargonRoundResult>;
type GradeRoundFn = (opts: {
  roundId: string;
  submission: Record<string, string>;
}) => Promise<GradePlJargonRoundResult>;
type ValidatePairFn = (opts: {
  roundId: string;
  termId: string;
  defId: string;
}) => Promise<{ ok: boolean } | { error: string }>;

export type JargonMatchRunnerProps = {
  roundSize: number;
  labBackHref: string;
  labBackLabel: string;
  title: string;
  subtitle: string;
  /** Shown in hero banner when present */
  headerImageUrl: string | null;
  headerImageAlt: string;
  professorName: string;
  professorAvatarUrl: string | null;
  professorTips: string[];
  /** POST endpoint path, e.g. `/api/pl/jargon-match/feedback` */
  feedbackPath: string;
  startRound: StartRoundFn;
  gradeRound: GradeRoundFn;
  validatePair: ValidatePairFn;
  loadingAsideLine?: string;
  resultsAsideLine?: string;
};

export function JargonMatchRunner({
  roundSize,
  labBackHref,
  labBackLabel,
  title,
  subtitle,
  headerImageUrl,
  headerImageAlt,
  professorName,
  professorAvatarUrl,
  professorTips,
  feedbackPath,
  startRound,
  gradeRound,
  validatePair,
  loadingAsideLine = "Shuffling terms for your round…",
  resultsAsideLine = "Read the recap, then shuffle the desk — recognition is repetition with sharper labels.",
}: JargonMatchRunnerProps) {
  const [phase, setPhase] = useState<Phase>("loading");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [roundId, setRoundId] = useState<string | null>(null);
  const [terms, setTerms] = useState<JargonSurfaceCell[]>([]);
  const [defs, setDefs] = useState<JargonSurfaceCell[]>([]);
  const [paired, setPaired] = useState<Record<string, string>>({});
  const [pendTerm, setPendTerm] = useState<string | null>(null);
  const [pendDef, setPendDef] = useState<string | null>(null);
  const [shake, setShake] = useState(false);
  const [matching, setMatching] = useState(false);
  const [gradeResult, setGradeResult] = useState<DoneGrade | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [feedbackErr, setFeedbackErr] = useState<string | null>(null);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [tipIx, setTipIx] = useState(0);

  const submittedPairsRef = useRef<string>("");

  const pairedDefIds = new Set(Object.values(paired));

  const loadRound = useCallback(async () => {
    submittedPairsRef.current = "";
    setPhase("loading");
    setLoadError(null);
    setRoundId(null);
    setTerms([]);
    setDefs([]);
    setPaired({});
    setPendTerm(null);
    setPendDef(null);
    setGradeResult(null);
    setFeedback(null);
    setFeedbackErr(null);
    const got = await startRound();
    if ("error" in got) {
      setLoadError(got.error);
      return;
    }
    setRoundId(got.roundId);
    setTerms(got.terms);
    setDefs(got.defs);
    setPhase("play");
  }, [startRound]);

  useEffect(() => {
    void loadRound();
  }, [loadRound]);

  useEffect(() => {
    if (phase !== "play") return;
    const nTips = professorTips.length || 1;
    const id = window.setInterval(
      () => setTipIx((i) => (i + 1) % nTips),
      14000,
    );
    return () => window.clearInterval(id);
  }, [phase, professorTips.length]);

  const bumpShake = () => {
    setShake(true);
    window.setTimeout(() => setShake(false), 460);
  };

  useEffect(() => {
    if (phase !== "play" || !roundId) return;
    const submission = paired;
    const n = Object.keys(submission).length;
    if (n < roundSize) return;

    const key = `${roundId}:${Object.entries(submission)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([t, d]) => `${t}=${d}`)
      .join("|")}`;
    if (submittedPairsRef.current === key) return;
    submittedPairsRef.current = key;

    setPhase("grading");

    void (async () => {
      const res = await gradeRound({
        roundId,
        submission,
      });
      if ("error" in res) {
        submittedPairsRef.current = "";
        setLoadError(res.error);
        setPhase("play");
        return;
      }
      setGradeResult(res);
      setPhase("results");
      setFeedbackLoading(true);
      try {
        const fr = await fetch(feedbackPath, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            score: res.score,
            total: res.total,
            misses: res.misses,
          }),
        });
        const data = (await fr.json()) as { feedback?: string; error?: string };
        if (!fr.ok) {
          setFeedbackErr(data.error ?? "Could not load professor feedback.");
          return;
        }
        setFeedback(data.feedback ?? null);
      } catch {
        setFeedbackErr("Network error fetching feedback.");
      } finally {
        setFeedbackLoading(false);
      }
    })();
  }, [paired, phase, roundId, roundSize, gradeRound, feedbackPath]);

  const unpairTerm = useCallback((termId: string) => {
    setPaired((p) => {
      const next = { ...p };
      delete next[termId];
      return next;
    });
    submittedPairsRef.current = "";
    setPendTerm(null);
    setPendDef(null);
  }, []);

  const onTermTap = async (tid: string) => {
    if (phase !== "play" || matching || !roundId) return;

    if (paired[tid]) {
      unpairTerm(tid);
      return;
    }

    if (pendDef) {
      setMatching(true);
      const v = await validatePair({
        roundId,
        termId: tid,
        defId: pendDef,
      });
      setMatching(false);
      if ("error" in v) {
        setLoadError(v.error);
        setPendTerm(null);
        setPendDef(null);
        return;
      }
      if (!v.ok) {
        bumpShake();
        setPendTerm(null);
        setPendDef(null);
        return;
      }
      submittedPairsRef.current = "";
      setPaired((prev) => ({ ...prev, [tid]: pendDef }));
      setPendTerm(null);
      setPendDef(null);
      return;
    }

    setPendTerm(pendTerm === tid ? null : tid);
    setPendDef(null);
  };

  const onDefTap = async (did: string) => {
    if (phase !== "play" || matching || !roundId) return;

    const termForDef = Object.entries(paired).find(([, id]) => id === did)?.[0];
    if (termForDef) {
      unpairTerm(termForDef);
      return;
    }

    if (pendTerm) {
      setMatching(true);
      const v = await validatePair({
        roundId,
        termId: pendTerm,
        defId: did,
      });
      setMatching(false);
      if ("error" in v) {
        setLoadError(v.error);
        setPendTerm(null);
        setPendDef(null);
        return;
      }
      if (!v.ok) {
        bumpShake();
        setPendTerm(null);
        setPendDef(null);
        return;
      }
      submittedPairsRef.current = "";
      const t = pendTerm;
      setPaired((prev) => ({ ...prev, [t]: did }));
      setPendTerm(null);
      setPendDef(null);
      return;
    }

    setPendDef(pendDef === did ? null : did);
    setPendTerm(null);
  };

  const profInitial = professorName.slice(0, 1).toUpperCase();
  const tipText =
    professorTips.length > 0 ?
      professorTips[tipIx % professorTips.length]
    : "";

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
              sizes="(max-width: 1280px) 100vw, 1152px"
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

      <div
        className={cn(
          "grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(280px,_360px)] items-start",
          shake && "animate-jargon-shake",
        )}
      >
        <div className="space-y-6 min-w-0">
          <div className="flex flex-wrap gap-3 justify-between items-center">
            <Link
              href={labBackHref}
              className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-text-muted hover:text-gold-300 transition-colors"
            >
              <ArrowLeft className="size-3.5" /> {labBackLabel}
            </Link>
            {(phase === "play" || phase === "grading" || phase === "results") && (
              <button
                type="button"
                onClick={() => void loadRound()}
                disabled={
                  phase === "grading" ||
                  matching ||
                  (phase === "results" && feedbackLoading)
                }
                className="btn-ghost px-3 py-1.5 text-xs uppercase tracking-[0.16em] inline-flex items-center gap-2"
              >
                <RotateCcw className="size-3.5" /> New round
              </button>
            )}
          </div>

          <header className="space-y-2">
            <span className="badge-gold inline-flex items-center gap-1">
              <Puzzle className="size-3" /> Practice
            </span>
            <h1 className="font-display text-3xl sm:text-4xl tracking-tight gold-text">
              {title}
            </h1>
            <p className="text-sm text-text-muted max-w-xl leading-relaxed">
              {subtitle}
            </p>
          </header>

          {loadError && (
            <div
              className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-100"
              role="alert"
            >
              {loadError}{" "}
              <button
                type="button"
                className="underline decoration-red-400/80 ml-1"
                onClick={() => void loadRound()}
              >
                Retry
              </button>
            </div>
          )}

          {phase === "loading" && !loadError && (
            <div className="card-premium flex items-center gap-3 p-10 text-text-muted">
              <Loader2 className="size-8 animate-spin text-gold-300" /> Building
              your round…
            </div>
          )}

          {phase === "play" && roundId && (
            <>
              <div
                className="text-xs uppercase tracking-[0.2em] text-text-muted mb-2"
                aria-live="polite"
              >
                Matched{" "}
                <span className="text-gold-300">{Object.keys(paired).length}</span>
                /{roundSize} · tap a locked chip to unlink
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <h2 className="text-[10px] uppercase tracking-[0.2em] text-gold-300/90">
                    Terms
                  </h2>
                  <div className="flex flex-col gap-2">
                    {terms.map((t) => {
                      const isPaired = Boolean(paired[t.id]);
                      const isHighlighted = pendTerm === t.id && !isPaired;
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => void onTermTap(t.id)}
                          disabled={matching}
                          aria-pressed={isHighlighted || isPaired}
                          aria-label={`Term: ${t.label}${isPaired ? ", paired" : ""}`}
                          className={cn(
                            "text-left rounded-xl border px-3 py-2.5 text-sm transition-colors disabled:opacity-60",
                            isPaired &&
                              "border-emerald-500/50 bg-emerald-500/[0.08] text-emerald-100",
                            !isPaired &&
                              isHighlighted &&
                              "border-gold-400/70 bg-gold-500/15 text-gold-100",
                            !isPaired &&
                              !isHighlighted &&
                              "border-white/12 bg-bg-card hover:border-gold-500/35",
                          )}
                        >
                          {t.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="space-y-2">
                  <h2 className="text-[10px] uppercase tracking-[0.2em] text-gold-300/90">
                    Definitions
                  </h2>
                  <div className="flex flex-col gap-2">
                    {defs.map((d) => {
                      const blocked = pairedDefIds.has(d.id);
                      const isHighlighted = pendDef === d.id && !blocked;
                      return (
                        <button
                          key={d.id}
                          type="button"
                          onClick={() => void onDefTap(d.id)}
                          disabled={matching}
                          aria-pressed={isHighlighted || blocked}
                          aria-label={`Definition strip${blocked ? ", paired" : ""}`}
                          className={cn(
                            "text-left rounded-xl border px-3 py-2.5 text-sm transition-colors disabled:opacity-60",
                            blocked &&
                              "border-emerald-500/50 bg-emerald-500/[0.08] text-emerald-100",
                            !blocked &&
                              isHighlighted &&
                              "border-gold-400/70 bg-gold-500/15 text-gold-100",
                            !blocked &&
                              !isHighlighted &&
                              "border-white/12 bg-bg-card hover:border-gold-500/35",
                          )}
                        >
                          {d.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
              {matching && (
                <p className="text-xs text-text-muted flex items-center gap-2">
                  <Loader2 className="size-3 animate-spin text-gold-400" /> Checking…
                </p>
              )}
            </>
          )}

          {phase === "grading" && (
            <div className="card-premium flex items-center gap-3 p-10 text-text-muted">
              <Loader2 className="size-8 animate-spin text-gold-300" /> Locking score…
            </div>
          )}

          {phase === "results" && gradeResult && (
            <div className="space-y-6">
              <div className="card-premium p-8 space-y-3">
                <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-gold-300">
                  <Sparkles className="size-3.5" /> Round score
                </div>
                <p
                  className="font-display text-4xl gold-text tracking-tight"
                  aria-live="polite"
                >
                  {gradeResult.score} / {gradeResult.total}
                </p>
                {gradeResult.misses.length > 0 ? (
                  <ul className="mt-4 space-y-3 text-sm text-text-secondary leading-relaxed">
                    {gradeResult.misses.map((m, i) => (
                      <li
                        key={i}
                        className="border border-white/[0.06] rounded-lg p-3 bg-bg-card/60"
                      >
                        <div className="text-gold-200/90 font-medium">{m.term}</div>
                        <div className="mt-1 text-text-muted">
                          <span className="text-emerald-300/90">Correct: </span>
                          {m.expectedDef}
                        </div>
                        <div className="mt-1 text-text-muted">
                          <span className="text-red-300/70">Chosen: </span>
                          {m.choseDef}
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-emerald-200/90 text-sm">
                    Perfect run — sharp recognition on these labels.
                  </p>
                )}
              </div>

              <div className="card-premium p-8 space-y-4">
                <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-gold-300">
                  <Sparkles className="size-3.5" /> Professor readout
                </div>
                {feedbackLoading ? (
                  <div className="flex items-center gap-2 text-text-muted text-sm">
                    <Loader2 className="size-4 animate-spin" /> Tailoring feedback…
                  </div>
                ) : feedbackErr ? (
                  <p className="text-sm text-amber-200/90">{feedbackErr}</p>
                ) : feedback ? (
                  <p className="text-sm text-text-secondary leading-relaxed whitespace-pre-wrap">
                    {feedback}
                  </p>
                ) : (
                  <p className="text-sm text-text-muted">
                    Feedback unavailable — try another round shortly.
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={() => void loadRound()}
                className="btn-gold px-6 py-2.5 inline-flex items-center gap-2 text-sm"
              >
                <RotateCcw className="size-4" /> Play another round
              </button>
            </div>
          )}
        </div>

        <aside className="card-premium p-7 space-y-5 lg:sticky lg:top-24">
          <div className="flex flex-col items-center text-center gap-4">
            <Avatar className="size-36 border-4 border-border-gold shadow-[0_0_42px_-8px_rgba(232,196,96,0.45)] rounded-full">
              {professorAvatarUrl ? (
                <AvatarImage
                  src={professorAvatarUrl}
                  alt={professorName}
                  className="object-cover"
                />
              ) : null}
              <AvatarFallback className="rounded-full bg-gradient-gold-soft text-xl font-display text-black/80">
                {profInitial}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-gold-300">
                Coaching you
              </p>
              <p className="mt-2 font-display text-lg text-text-primary tracking-tight">
                {professorName}
              </p>
            </div>
          </div>
          {phase === "play" && tipText ? (
            <p className="text-sm text-text-muted leading-relaxed text-center italic transition-opacity duration-500">
              “{tipText}”
            </p>
          ) : phase === "results" ? (
            <p className="text-sm text-text-secondary leading-relaxed text-center">
              {resultsAsideLine}
            </p>
          ) : (
            <p className="text-sm text-text-muted leading-relaxed text-center">
              {loadingAsideLine}
            </p>
          )}
        </aside>
      </div>
    </>
  );
}
