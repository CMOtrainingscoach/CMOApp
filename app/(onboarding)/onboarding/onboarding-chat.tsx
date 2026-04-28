"use client";

import { useChat } from "@ai-sdk/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  CheckCircle2,
  Circle,
  GraduationCap,
  Loader2,
  Send,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CrownMark } from "@/components/ui/monogram";
import { cn } from "@/lib/utils";
import {
  ONBOARDING_TOPICS,
  type OnboardingTopicId,
} from "@/lib/onboarding/topics";

type StoredMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

function ProfessorAvatar({
  size,
  name,
  url,
}: {
  size: number;
  name: string;
  url: string | null | undefined;
}) {
  if (url) {
    return (
      <div
        className="relative shrink-0 rounded-lg overflow-hidden border border-border-gold"
        style={{ width: size, height: size }}
      >
        <Image
          src={url}
          alt={name}
          fill
          className="object-cover object-top"
          sizes={`${size}px`}
        />
      </div>
    );
  }
  return (
    <div
      className="shrink-0 rounded-lg bg-gradient-gold-soft border border-border-gold flex items-center justify-center text-gold-300"
      style={{ width: size, height: size }}
    >
      <GraduationCap
        style={{ width: size * 0.5, height: size * 0.5 }}
        strokeWidth={1.6}
      />
    </div>
  );
}

export function OnboardingChat({
  displayName,
  professorName,
  professorAvatarUrl,
  initialMessages,
  initialTopicsCovered,
}: {
  displayName: string;
  professorName: string;
  professorAvatarUrl: string | null;
  initialMessages: StoredMessage[];
  initialTopicsCovered: OnboardingTopicId[];
}) {
  const router = useRouter();
  const [topicsCovered, setTopicsCovered] = useState<OnboardingTopicId[]>(
    initialTopicsCovered,
  );
  const [redirecting, setRedirecting] = useState(false);
  const initialChatMessages = useMemo(
    () =>
      initialMessages.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
      })),
    [initialMessages],
  );

  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    status,
    append,
    data,
  } = useChat({
    api: "/api/onboarding/chat",
    initialMessages: initialChatMessages,
  });

  // React to streamed custom data parts
  useEffect(() => {
    if (!data) return;
    for (const part of data) {
      if (!part || typeof part !== "object") continue;
      const p = part as Record<string, unknown>;
      if (p.type === "topics" && Array.isArray(p.topicsCovered)) {
        const validIds = new Set<string>(
          ONBOARDING_TOPICS.map((t) => t.id),
        );
        const next = (p.topicsCovered as string[]).filter((id) =>
          validIds.has(id),
        ) as OnboardingTopicId[];
        setTopicsCovered(next);
      }
      if (p.type === "complete" && !redirecting) {
        setRedirecting(true);
        setTimeout(() => {
          router.replace("/dashboard");
          router.refresh();
        }, 1400);
      }
    }
  }, [data, redirecting, router]);

  // Auto-scroll
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  const isEmpty = messages.length === 0;
  const isStreaming = status === "streaming" || status === "submitted";
  const totalTopics = ONBOARDING_TOPICS.length;
  const coveredCount = topicsCovered.length;
  const progressPct = Math.min(
    100,
    Math.round((coveredCount / totalTopics) * 100),
  );

  function beginInterview() {
    append({ role: "user", content: "Hi — I'm ready to start." });
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top brand strip */}
      <div className="border-b border-border-hairline px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <CrownMark className="size-9" />
          <div>
            <div className="font-display text-base leading-none">ME</div>
            <div className="text-[10px] tracking-[0.22em] uppercase text-text-muted mt-1">
              CMO Ascension Mode
            </div>
          </div>
        </div>
        <div className="text-[11px] tracking-[0.18em] uppercase text-gold-400">
          First-login Interview
        </div>
      </div>

      {/* Main */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-5 p-5 max-w-[1400px] mx-auto w-full">
        {/* Chat panel */}
        <Card className="flex flex-col overflow-hidden h-[calc(100vh-130px)]">
          <div className="flex items-center gap-3 px-5 py-4 border-b border-border-hairline">
            <ProfessorAvatar
              size={44}
              name={professorName}
              url={professorAvatarUrl}
            />
            <div>
              <div className="font-display text-lg leading-none">
                {professorName}
              </div>
              <div className="text-[11px] tracking-[0.16em] uppercase text-text-muted mt-1">
                Getting to know you
              </div>
            </div>
          </div>

          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto px-5 py-6 space-y-5"
          >
            {isEmpty && (
              <div className="max-w-2xl mx-auto text-center py-10">
                <div className="mx-auto mb-5 inline-block">
                  <ProfessorAvatar
                    size={72}
                    name={professorName}
                    url={professorAvatarUrl}
                  />
                </div>
                <h2 className="font-display text-3xl mb-2">
                  Welcome, {displayName.split(/\s+/)[0]}.
                </h2>
                <p className="text-text-secondary mb-6 max-w-md mx-auto leading-relaxed">
                  Before we start your training, I want to know who you are.
                  Seven short topics, one at a time. No fluff.
                </p>
                <Button onClick={beginInterview} className="px-6">
                  <Sparkles className="size-4" />
                  Begin interview
                </Button>
              </div>
            )}

            {messages.map((m) => (
              <div
                key={m.id}
                className={cn(
                  "flex gap-3",
                  m.role === "user" ? "justify-end" : "justify-start",
                )}
              >
                {m.role === "assistant" && (
                  <div className="mt-0.5">
                    <ProfessorAvatar
                      size={32}
                      name={professorName}
                      url={professorAvatarUrl}
                    />
                  </div>
                )}
                <div
                  className={cn(
                    "max-w-[78%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap",
                    m.role === "user"
                      ? "bg-gradient-gold text-bg-primary font-medium"
                      : "bg-bg-elevated border border-border-subtle text-text-primary",
                  )}
                >
                  {typeof m.content === "string"
                    ? m.content
                    : (m as { parts?: { type: string; text?: string }[] })
                        .parts?.filter((p) => p.type === "text")
                        .map((p) => p.text)
                        .join("")}
                </div>
              </div>
            ))}

            {isStreaming &&
              messages[messages.length - 1]?.role === "user" && (
                <div className="flex gap-3 justify-start">
                  <ProfessorAvatar
                    size={32}
                    name={professorName}
                    url={professorAvatarUrl}
                  />
                  <div className="bg-bg-elevated border border-border-subtle rounded-2xl px-4 py-3 text-sm text-text-muted flex items-center gap-2">
                    <Loader2 className="size-4 animate-spin text-gold-400" />
                    Thinking
                  </div>
                </div>
              )}

            {redirecting && (
              <div className="text-center py-8">
                <div className="inline-flex items-center gap-2 text-gold-300 text-sm tracking-[0.18em] uppercase">
                  <Loader2 className="size-4 animate-spin" />
                  Unlocking your dashboard
                </div>
              </div>
            )}
          </div>

          <form
            onSubmit={handleSubmit}
            className="border-t border-border-hairline p-4"
          >
            <div className="flex gap-2 items-end">
              <textarea
                value={input}
                onChange={handleInputChange}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    if (input.trim() && !isStreaming && !redirecting) {
                      handleSubmit(e as unknown as React.FormEvent);
                    }
                  }
                }}
                placeholder={
                  redirecting
                    ? "Saving your profile…"
                    : isEmpty
                      ? "Type your first message — or click Begin interview."
                      : "Reply to the Professor… (Enter to send)"
                }
                rows={1}
                disabled={redirecting}
                className="input-field flex-1 resize-none disabled:opacity-50"
                style={{ minHeight: 44, maxHeight: 160 }}
              />
              <Button
                type="submit"
                disabled={!input.trim() || isStreaming || redirecting}
                size="icon"
                className="size-11"
                aria-label="Send"
              >
                <Send className="size-4" />
              </Button>
            </div>
            <div className="mt-2 text-[10px] tracking-[0.16em] uppercase text-text-muted">
              Your answers are private to your account.
            </div>
          </form>
        </Card>

        {/* Topics rail */}
        <Card className="overflow-hidden h-[calc(100vh-130px)] flex flex-col">
          <div className="px-5 py-4 border-b border-border-hairline">
            <div className="text-[11px] tracking-[0.18em] uppercase text-gold-400 mb-2">
              Your interview
            </div>
            <div className="flex items-baseline justify-between mb-2">
              <div className="font-display text-xl">
                {coveredCount} of {totalTopics}
              </div>
              <div className="text-[10px] tracking-[0.16em] uppercase text-text-muted">
                covered
              </div>
            </div>
            <div className="h-1.5 rounded-full bg-bg-elevated border border-border-hairline overflow-hidden">
              <div
                className="h-full bg-gradient-gold transition-all duration-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-1">
            {ONBOARDING_TOPICS.map((t, i) => {
              const isDone = topicsCovered.includes(t.id);
              const isActive = !isDone && i === coveredCount;
              return (
                <div
                  key={t.id}
                  className={cn(
                    "rounded-lg px-3 py-3 border transition-colors",
                    isDone
                      ? "border-border-gold bg-gradient-gold-soft"
                      : isActive
                        ? "border-border-subtle bg-bg-elevated/60"
                        : "border-transparent",
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={cn(
                        "shrink-0 mt-0.5",
                        isDone
                          ? "text-gold-300"
                          : isActive
                            ? "text-gold-500"
                            : "text-text-muted",
                      )}
                    >
                      {isDone ? (
                        <CheckCircle2 className="size-5" />
                      ) : (
                        <Circle className="size-5" strokeWidth={1.5} />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div
                        className={cn(
                          "text-sm font-semibold leading-tight",
                          isDone
                            ? "text-gold-200"
                            : isActive
                              ? "text-text-primary"
                              : "text-text-secondary",
                        )}
                      >
                        {t.label}
                      </div>
                      <div className="text-[11px] text-text-muted mt-1 leading-snug">
                        {t.description}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="px-5 py-3 border-t border-border-hairline text-[10px] tracking-[0.16em] uppercase text-text-muted">
            Dashboard unlocks when all 7 are covered.
          </div>
        </Card>
      </div>
    </div>
  );
}
