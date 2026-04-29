"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * Lesson-specific Professor / hero portrait (admin-uploaded).
 * Matches dashboard professor card proportions for brand consistency.
 */
export function LessonHeroBanner({
  imageUrl,
  lessonTitle,
  moduleTitle,
}: {
  imageUrl: string;
  lessonTitle: string;
  moduleTitle?: string;
}) {
  return (
    <div
      className={cn(
        "relative w-full overflow-hidden rounded-2xl border border-border-gold/15 shadow-lg",
      )}
    >
      <div className="relative aspect-[21/9] min-h-[180px] sm:min-h-[220px] w-full md:aspect-[24/9]">
        <Image
          src={imageUrl}
          alt={`Professor — ${lessonTitle}`}
          fill
          sizes="(max-width: 1280px) 100vw, 1100px"
          className="object-cover object-[center_22%]"
          priority
        />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              "linear-gradient(90deg, rgba(10,10,10,0.92) 0%, rgba(10,10,10,0.45) 55%, transparent 85%), linear-gradient(180deg, transparent 35%, rgba(10,10,10,0.88) 100%)",
          }}
        />
        <div className="absolute bottom-4 left-5 right-5 flex flex-wrap items-end justify-between gap-2">
          <div>
            <p className="text-[10px] tracking-[0.22em] uppercase text-gold-300 mb-1">
              Strategy Lab · Lesson
            </p>
            <p className="font-display text-xl sm:text-2xl text-text-primary tracking-tight max-w-xl">
              {lessonTitle}
            </p>
            {moduleTitle && (
              <p className="text-xs text-text-muted mt-1">{moduleTitle}</p>
            )}
          </div>
          <span className="text-[10px] tracking-[0.2em] uppercase text-gold-200/80 hidden sm:inline">
            In session
          </span>
        </div>
      </div>
    </div>
  );
}
