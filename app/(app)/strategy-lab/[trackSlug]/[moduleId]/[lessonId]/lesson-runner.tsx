"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight, BookOpen, Sparkles, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TheoryBody } from "@/components/strategy/theory-body";
import { LessonHeroBanner } from "@/components/strategy/lesson-hero-banner";
import { MinigameRunner } from "@/components/strategy/minigame/minigame-runner";
import { CompletionBurst } from "@/components/strategy/minigame/completion-burst";
import type { RunnerQuestion } from "@/components/strategy/minigame/types";

type Stage = "theory" | "challenge" | "complete";

type Props = {
  lessonId: string;
  lessonTitle: string;
  moduleTitle: string;
  heroImageUrl: string | null;
  trackSlug: string;
  moduleId: string;
  nextLessonId: string | null;
  theoryMd: string;
  questions: RunnerQuestion[];
};

export function LessonRunner({
  lessonId,
  lessonTitle,
  moduleTitle,
  heroImageUrl,
  trackSlug,
  moduleId,
  nextLessonId,
  theoryMd,
  questions,
}: Props) {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>("theory");
  const [summary, setSummary] = useState<{
    totalXp: number;
    correct: number;
    total: number;
  } | null>(null);
  const [completing, setCompleting] = useState(false);

  const onChallengeComplete = (s: {
    totalXp: number;
    correct: number;
    total: number;
  }) => {
    setSummary(s);
    setStage("complete");
  };

  const finishLesson = async () => {
    if (!summary) return;
    setCompleting(true);
    const score =
      summary.total === 0
        ? 100
        : Math.round((summary.correct / summary.total) * 100);
    try {
      const res = await fetch(
        `/api/strategy/lessons/${lessonId}/complete`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ score }),
        },
      );
      const data = (await res.json()) as {
        next_lesson_id?: string | null;
        is_last_lesson?: boolean;
      };
      const next = data.next_lesson_id ?? nextLessonId;
      if (data.is_last_lesson) {
        router.push(`/strategy-lab/${trackSlug}/${moduleId}/assignment`);
        return;
      }
      if (next) {
        router.push(`/strategy-lab/${trackSlug}/${moduleId}/${next}`);
        return;
      }
      router.push(`/strategy-lab/${trackSlug}/${moduleId}`);
    } finally {
      setCompleting(false);
    }
  };

  if (stage === "theory") {
    return (
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="space-y-6 min-w-0">
          {heroImageUrl && (
            <LessonHeroBanner
              imageUrl={heroImageUrl}
              lessonTitle={lessonTitle}
              moduleTitle={moduleTitle}
            />
          )}
          <div className="card-premium p-6 sm:p-10">
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-gold-300 mb-4">
            <BookOpen className="size-3.5" />
            Theory
          </div>
          <TheoryBody markdown={theoryMd} />
          <div className="mt-10 flex items-center justify-between gap-4">
            <p className="text-sm text-text-muted max-w-md">
              Read it twice. The challenge tests application, not recall.
            </p>
            <Button
              variant="gold"
              onClick={() => setStage("challenge")}
              size="lg"
            >
              Continue to challenge
              <ArrowRight className="size-4" />
            </Button>
          </div>
        </div>
        </div>
        <aside className="space-y-3">
          <div className="card-premium p-5">
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-gold-300">
              <Target className="size-3.5" /> What's next
            </div>
            <ol className="mt-3 space-y-2 text-sm text-text-secondary">
              <li className="flex items-start gap-2">
                <span className="mt-0.5 size-5 rounded-full border border-gold-500/40 text-gold-300 text-[10px] flex items-center justify-center">
                  1
                </span>
                Read the theory.
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 size-5 rounded-full border border-white/10 text-text-muted text-[10px] flex items-center justify-center">
                  2
                </span>
                Pass the challenge ({questions.length} questions).
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 size-5 rounded-full border border-white/10 text-text-muted text-[10px] flex items-center justify-center">
                  3
                </span>
                Earn XP. Move to the next lesson.
              </li>
            </ol>
          </div>
          <div className="card-premium p-5">
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-gold-300">
              <Sparkles className="size-3.5" /> Operator's note
            </div>
            <p className="mt-2 text-sm text-text-secondary leading-relaxed">
              Strategy is the discipline of choosing where not to play. Every
              lesson is a chance to practise that choice.
            </p>
          </div>
        </aside>
      </div>
    );
  }

  if (stage === "challenge") {
    return (
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="space-y-6 min-w-0">
          {heroImageUrl && (
            <LessonHeroBanner
              imageUrl={heroImageUrl}
              lessonTitle={lessonTitle}
              moduleTitle={moduleTitle}
            />
          )}
          <MinigameRunner
            lessonId={lessonId}
            questions={questions}
            onComplete={onChallengeComplete}
          />
        </div>
        <aside className="space-y-3">
          <div className="card-premium p-5">
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-gold-300">
              <Target className="size-3.5" /> Challenge rules
            </div>
            <ul className="mt-3 space-y-2 text-sm text-text-secondary leading-relaxed">
              <li>Submit your answer. The Professor explains either way.</li>
              <li>Bonus XP for a perfect run.</li>
              <li>Don't rush. Read the prompt twice.</li>
            </ul>
          </div>
        </aside>
      </div>
    );
  }

  // complete
  return (
    <div className="max-w-3xl mx-auto">
      {summary && (
        <CompletionBurst
          totalXp={summary.totalXp}
          correct={summary.correct}
          total={summary.total}
          continueLabel={completing ? "Locking in…" : "Complete lesson"}
          onContinue={finishLesson}
        />
      )}
    </div>
  );
}
