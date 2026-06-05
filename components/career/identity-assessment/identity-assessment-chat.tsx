"use client";

import { useChat } from "@ai-sdk/react";
import Image from "next/image";
import { Loader2, Send } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { AssessmentSession } from "@/lib/career/identity-assessment/schema";
import {
  identityAssessmentCopy,
  IDENTITY_PROFESSOR_NAME,
} from "@/lib/career/identity-assessment/copy";
import { completeIdentityAssessmentChatSession } from "@/app/(app)/career/identity-assessment/actions";

function Avatar({
  professorAvatarUrl,
}: {
  professorAvatarUrl?: string | null;
}) {
  if (professorAvatarUrl) {
    return (
      <div className="relative size-10 shrink-0 overflow-hidden rounded-lg border border-border-gold">
        <Image
          src={professorAvatarUrl}
          alt={IDENTITY_PROFESSOR_NAME}
          fill
          className="object-cover"
          sizes="40px"
        />
      </div>
    );
  }
  return (
    <div className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-border-gold bg-gradient-gold-soft text-gold-300 text-xs font-display">
      EC
    </div>
  );
}

export function IdentityAssessmentChat({
  session,
  displayName,
  professorAvatarUrl,
}: {
  session: AssessmentSession;
  displayName: string;
  professorAvatarUrl?: string | null;
}) {
  const router = useRouter();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [completeError, setCompleteError] = useState<string | null>(null);
  const [completing, setCompleting] = useState(false);

  const initialMessages = useMemo(
    () =>
      session.conversation.map((t, i) => ({
        id: `seed-${session.id}-${i}-${t.role}`,
        role: t.role as "user" | "assistant",
        content: t.content,
      })),
    [session.conversation, session.id],
  );

  const { messages, input, handleInputChange, handleSubmit, status } = useChat({
    id: `exec-identity-${session.id}`,
    api: "/api/career/identity-assessment/chat",
    body: { sessionId: session.id },
    initialMessages,
  });

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  async function onFinishInterview() {
    setCompleteError(null);
    setCompleting(true);
    try {
      const outcome = await completeIdentityAssessmentChatSession(session.id);
      if (!outcome.ok) {
        setCompleteError(outcome.error);
        setCompleting(false);
        return;
      }
      router.push(outcome.redirectTo);
    } catch (e) {
      setCompleteError(e instanceof Error ? e.message : "Something failed.");
      setCompleting(false);
    }
  }

  const streaming = status === "streaming" || status === "submitted";
  const userTurnCount = messages.filter((m) => m.role === "user").length;
  const firstName = displayName.split(/\s+/)[0] ?? "you";

  return (
    <div className="flex flex-col gap-5">
      <Card className="flex flex-col overflow-hidden min-h-[calc(100vh-220px)] lg:min-h-[620px] border-border-gold/20">
        <div className="flex items-center gap-3 border-b border-border-hairline px-5 py-4">
          <Avatar professorAvatarUrl={professorAvatarUrl} />
          <div>
            <div className="font-display text-lg leading-none gold-text">
              {IDENTITY_PROFESSOR_NAME}
            </div>
            <div className="mt-1 text-[11px] uppercase tracking-[0.16em] text-text-muted">
              {identityAssessmentCopy.chatSubtitle}
            </div>
          </div>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-6 space-y-5">
          <p className="text-sm text-text-muted max-w-2xl leading-relaxed border-b border-border/40 pb-4">
            {firstName}, this lane is deliberate — vignettes outperform polish. Scroll for the full
            thread; everything saves server-side each time she replies.
          </p>

          {messages.map((m) => (
            <div
              key={m.id}
              className={cn(
                "flex",
                m.role === "user" ? "justify-end" : "justify-start",
              )}
            >
              <div
                className={cn(
                  "max-w-[min(720px,92%)] rounded-2xl px-4 py-3 text-sm leading-relaxed",
                  m.role === "user"
                    ? "bg-gold-500/15 border border-gold-500/35 text-foreground"
                    : "bg-panel/80 border border-border text-text-secondary",
                )}
              >
                <div className="mb-1 text-[10px] uppercase tracking-wider text-text-muted">
                  {m.role === "user" ? "You" : IDENTITY_PROFESSOR_NAME}
                </div>
                <div className="whitespace-pre-wrap">{m.content}</div>
              </div>
            </div>
          ))}

          {streaming && (
            <div className="flex justify-start text-xs text-text-muted gap-2 items-center">
              <Loader2 className="size-4 animate-spin" /> She&apos;s composing…
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="border-t border-border-hairline px-4 py-3">
          <label className="sr-only" htmlFor="identity-chat-input">
            Message {IDENTITY_PROFESSOR_NAME}
          </label>
          <div className="flex gap-2 items-end">
            <textarea
              id="identity-chat-input"
              rows={2}
              value={input}
              onChange={handleInputChange}
              placeholder="Share history, appetite, craft, channels — whatever’s honest."
              disabled={streaming}
              className="flex-1 rounded-xl border border-border bg-background/60 px-4 py-3 text-sm min-h-[72px] resize-y"
            />
            <Button type="submit" disabled={streaming || !input.trim()} className="shrink-0 h-11">
              {streaming ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Send className="size-4" />
              )}
            </Button>
          </div>
        </form>
      </Card>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-text-muted max-w-xl">
          {identityAssessmentCopy.completingHint}{" "}
          <span className="text-text-secondary">
            (Your sent messages: <span className="tabular-nums">{userTurnCount}</span>)
          </span>
        </p>
        <button
          type="button"
          disabled={streaming || completing}
          onClick={onFinishInterview}
          className="btn-gold px-5 py-2.5 text-sm shrink-0 disabled:opacity-50"
        >
          {completing ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="size-4 animate-spin" /> Packaging dossier…
            </span>
          ) : (
            identityAssessmentCopy.completeCta
          )}
        </button>
      </div>

      {completeError && (
        <p className="text-sm text-red-400" role="alert">
          {completeError}
        </p>
      )}
    </div>
  );
}
