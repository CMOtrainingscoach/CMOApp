"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  assignmentId: string;
  trackSlug: string;
  moduleId: string;
};

export function AssignmentForm({ assignmentId, trackSlug, moduleId }: Props) {
  const router = useRouter();
  const [content, setContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    setError(null);
    if (content.trim().length < 250) {
      setError(
        "Aim for at least a paragraph per element of the brief. The Professor cannot grade a stub.",
      );
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(
        `/api/strategy/assignments/${assignmentId}/submit`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content }),
        },
      );
      const data = (await res.json()) as { error?: string };
      if (!res.ok && data.error) {
        setError(data.error);
        return;
      }
      router.push(`/strategy-lab/${trackSlug}/${moduleId}/review`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Submission failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="card-premium p-6 sm:p-8 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold tracking-tight gold-text">
          Your Submission
        </h3>
        <span className="text-xs uppercase tracking-[0.18em] text-text-muted">
          {content.length} chars
        </span>
      </div>
      <p className="text-sm text-text-muted leading-relaxed">
        Write directly. Use frameworks. Be specific. The Professor reads this as
        if it landed on a board's desk.
      </p>
      <textarea
        rows={14}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Open with the punchline. Then the analysis. Then the move."
        className="input-field min-h-[300px] resize-y leading-relaxed text-sm"
        disabled={submitting}
      />
      {error && (
        <p className="text-sm text-red-400 border border-red-500/30 bg-red-500/[0.04] rounded-xl px-4 py-3">
          {error}
        </p>
      )}
      <div className="flex items-center justify-between gap-4">
        <p className="text-xs text-text-muted">
          Submitting locks the answer. Re-submission is allowed if revision is
          required.
        </p>
        <Button
          variant="gold"
          onClick={submit}
          disabled={submitting || content.trim().length < 50}
          size="lg"
        >
          {submitting ? (
            <>
              <Loader2 className="size-4 animate-spin" /> Grading…
            </>
          ) : (
            <>
              <Send className="size-4" /> Submit for review
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
