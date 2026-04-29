"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { LessonProfessorChat } from "@/components/strategy/lesson-professor-chat";

/**
 * Responsive row: lesson outcomes beside an embedded professor chat when outcomes exist.
 */
export function LessonObjectivesProfessorRow({
  learningObjectiveSlot,
  lessonId,
  professorName,
  professorAvatarUrl,
  className,
}: {
  learningObjectiveSlot: ReactNode;
  lessonId: string;
  professorName?: string;
  professorAvatarUrl?: string | null;
  className?: string;
}) {
  const hasObjectives = Boolean(learningObjectiveSlot);

  return (
    <div
      className={cn(
        "mt-5 gap-6 lg:gap-8 xl:gap-10",
        hasObjectives ?
          "lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(280px,_min(100%,_380px))] lg:items-start"
        : "",
        className,
      )}
    >
      {hasObjectives && (
        <div className="min-w-0 [&_section]:max-w-none [&_.rounded-2xl]:max-w-none">
          {learningObjectiveSlot}
        </div>
      )}
      <div
        className={cn(
          "min-w-0",
          !hasObjectives && "mx-auto max-w-lg lg:max-w-xl",
        )}
      >
        <LessonProfessorChat
          lessonId={lessonId}
          professorName={professorName}
          professorAvatarUrl={professorAvatarUrl}
        />
      </div>
    </div>
  );
}
