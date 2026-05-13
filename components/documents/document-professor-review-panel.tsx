"use client";

import { useCompletion } from "@ai-sdk/react";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TheoryBody } from "@/components/strategy/theory-body";
import { cn, timeAgo } from "@/lib/utils";

export type DocumentProfessorReview = {
  id: string;
  document_id: string;
  review_angle: string;
  feedback: string;
  opening_question: string | null;
  created_at: string;
};

function snippet(s: string, max = 90) {
  const t = s.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  return t.slice(0, max).trimEnd() + "…";
}

export function DocumentProfessorReviewPanel({
  documentId,
  documentTitle,
  isReady,
  reviews,
}: {
  documentId: string;
  documentTitle: string;
  isReady: boolean;
  reviews: DocumentProfessorReview[];
}) {
  const router = useRouter();
  const [opener, setOpener] = useState("");
  const [openingError, setOpeningError] = useState<string | null>(null);
  const [openingLoading, setOpeningLoading] = useState(false);

  const { completion, complete, stop, error, input, handleInputChange, isLoading, setCompletion } =
    useCompletion({
      api: "/api/documents/review/stream",
      onFinish: () => {
        setCompletion("");
        router.refresh();
      },
    });

  useEffect(() => {
    let cancelled = false;
    async function fetchOpener() {
      setOpeningError(null);
      setOpener("");
      if (!documentId || !isReady) return;
      setOpeningLoading(true);
      try {
        const res = await fetch("/api/documents/review/open", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ documentId }),
        });
        const raw = (await res.json().catch(() => ({}))) as { opener?: unknown; error?: string };
        if (!res.ok) throw new Error(raw.error ?? "opener failed");
        const q = typeof raw.opener === "string" ? raw.opener : "";
        if (!cancelled) setOpener(q.trim());
      } catch (e) {
        if (!cancelled)
          setOpeningError((e as Error).message ?? "could not reach the Professor");
      } finally {
        if (!cancelled) setOpeningLoading(false);
      }
    }
    void fetchOpener();
    return () => {
      cancelled = true;
    };
  }, [documentId, isReady]);

  return (
    <Card className="border-border-subtle shadow-none">
      <CardHeader className="pb-2">
        <CardTitle className="text-[15px]">Professor review</CardTitle>
        <p className="text-[11px] tracking-[0.14em] uppercase text-text-muted leading-snug">
          {snippet(documentTitle, 46)}
        </p>
      </CardHeader>
      <CardBody className="space-y-4 pt-2">
        {!isReady && (
          <p className="text-sm text-text-muted">
            Select a document with status <strong>Ready</strong> to ask for a critique.
          </p>
        )}

        {isReady && openingLoading && (
          <div className="flex items-center gap-2 text-sm text-text-muted">
            <Loader2 className="size-4 animate-spin shrink-0" /> The Professor is
            framing her question…
          </div>
        )}

        {isReady && openingError && (
          <div className="text-sm text-danger bg-danger/10 border border-danger/25 rounded-lg px-3 py-2">
            {openingError}
          </div>
        )}

        {isReady && !openingLoading && opener && (
          <p className="text-sm text-text-secondary leading-relaxed border-l-2 border-gold-400/55 pl-3">
            {opener}
          </p>
        )}

        <form
          className="space-y-2"
          onSubmit={(ev) => {
            ev.preventDefault();
            const trimmed = input.trim();
            if (!trimmed || !isReady || isLoading) return;
            complete(trimmed, {
              body: {
                documentId,
                openingQuestion: opener || undefined,
              },
            });
          }}
        >
          <label htmlFor={`review-angle-${documentId}`} className="sr-only">
            Review angle
          </label>
          <textarea
            id={`review-angle-${documentId}`}
            rows={5}
            value={input}
            onChange={handleInputChange}
            disabled={!isReady || openingLoading || isLoading}
            placeholder={
              !isReady
                ? ""
                : "From which lens should she tear into this deck? Be specific (e.g. Board narrative, CFO / payback realism, ethics in claims…)…"
            }
            className={cn(
              "w-full rounded-xl border bg-bg-deep/70 px-3.5 py-3 text-sm text-text-primary resize-y min-h-[120px]",
              "placeholder:text-text-muted/70 border-border-subtle outline-none transition-colors focus:border-gold-400 focus:ring-1 focus:ring-gold-500/25",
              (!isReady || openingLoading || isLoading) &&
                "opacity-60 cursor-not-allowed pointer-events-none",
            )}
          />
          <div className="flex items-center gap-2">
            <Button
              type="submit"
              variant="gold"
              disabled={!isReady || openingLoading || isLoading || !input.trim()}
            >
              {isLoading ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Generating feedback…
                </>
              ) : (
                "Get Professor feedback"
              )}
            </Button>
            {isLoading && (
              <Button type="button" variant="subtle" size="sm" onClick={() => stop()}>
                Stop
              </Button>
            )}
          </div>
          {error && (
            <p className="text-sm text-danger">
              {(error as Error).message ?? "Stream failed"}
            </p>
          )}
        </form>

        {(isLoading || completion) && (
          <div className="rounded-xl border border-border-subtle bg-bg-deep/35 p-3.5">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[10px] tracking-[0.18em] uppercase text-text-muted font-semibold">
                Live critique
              </span>
              {isLoading && <Loader2 className="size-3.5 animate-spin text-gold-400" />}
            </div>
            <TheoryBody markdown={completion || "…"} />
          </div>
        )}

        {reviews.length > 0 && (
          <div className="space-y-2 pt-1">
            <h4 className="text-[10px] tracking-[0.22em] uppercase text-text-muted font-semibold">
              Prior critiques ({reviews.length})
            </h4>
            <ul className="space-y-2 max-h-[min(42vh,360px)] overflow-y-auto pe-1">
              {reviews.map((r) => (
                <li key={r.id}>
                  <details className="group rounded-xl border border-border-subtle bg-bg-deep/35">
                    <summary className="cursor-pointer px-3 py-2.5 flex flex-wrap items-start justify-between gap-2 hover:bg-bg-elevated/25 transition-colors [&::-webkit-details-marker]:hidden list-none rounded-xl">
                      <span className="text-xs text-text-secondary min-w-0 flex-1">
                        <strong className="text-text-primary font-medium block">
                          {snippet(r.review_angle, 80)}
                        </strong>
                      </span>
                      <span className="text-[10px] text-text-muted shrink-0 whitespace-nowrap">
                        {timeAgo(r.created_at)}
                      </span>
                    </summary>
                    <div className="px-3 pb-3 pt-0 border-t border-border-hairline/60">
                      {r.opening_question && (
                        <p className="text-[11px] text-text-muted mt-3 mb-3 italic leading-relaxed border-l border-border-gold/40 pl-2">
                          {r.opening_question}
                        </p>
                      )}
                      <div className="mt-2">
                        <TheoryBody markdown={r.feedback} />
                      </div>
                    </div>
                  </details>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardBody>
    </Card>
  );
}
