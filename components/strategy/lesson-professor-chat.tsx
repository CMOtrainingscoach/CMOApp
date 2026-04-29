"use client";

import { useChat } from "@ai-sdk/react";
import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { GraduationCap, Loader2, MessageSquare, Send, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

function ProfessorTiny({
  name,
  url,
}: {
  name: string;
  url?: string | null;
}) {
  if (url) {
    return (
      <div className="relative size-9 shrink-0 overflow-hidden rounded-lg border border-border-gold">
        <Image alt={name} src={url} fill className="object-cover" sizes="36px" />
      </div>
    );
  }
  return (
    <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border-gold bg-gradient-gold-soft text-gold-300">
      <GraduationCap className="size-4" strokeWidth={1.6} />
    </div>
  );
}

type StoredMessage = {
  id: string;
  role: string;
  content: string;
};

const STORAGE_PREFIX = "sl-lesson-prof-chat-conv";

const SUGGESTIONS = [
  "Go one level deeper — why does this distinction matter commercially?",
  "Where do teams usually get this wrong in practice?",
  "Give me a concrete example tied to my context.",
];

export function LessonProfessorChat({
  lessonId,
  professorName = "Professor",
  professorAvatarUrl = null as string | null,
}: {
  lessonId: string;
  professorName?: string;
  professorAvatarUrl?: string | null;
}) {
  const storageKey = `${STORAGE_PREFIX}:${lessonId}`;
  const scrollRef = useRef<HTMLDivElement>(null);

  const [convId, setConvId] = useState<string | null>(null);
  const [bootstrapped, setBootstrapped] = useState(false);

  useEffect(() => {
    const v =
      typeof window !== "undefined" ? sessionStorage.getItem(storageKey) : null;
    setConvId(v);
    setBootstrapped(true);
  }, [storageKey]);

  const chatBody = useMemo(
    () =>
      lessonId ?
        convId ?
          { lessonId, conversationId: convId }
        : { lessonId }
      : {},
    [lessonId, convId],
  );

  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    status,
    setMessages,
  } = useChat({
    api: "/api/chat",
    body: chatBody,
    fetch: async (request: RequestInfo | URL | string, opts?: RequestInit) => {
      const res = await fetch(request as RequestInfo, opts);
      const id = res.headers.get("x-conversation-id");
      if (id && typeof window !== "undefined") {
        sessionStorage.setItem(storageKey, id);
        setConvId((prev) => (prev === id ? prev : id));
      }
      return res;
    },
    initialMessages: [],
  });

  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function loadHistory() {
      if (!bootstrapped || !convId) {
        return;
      }
      setHistoryLoading(true);
      const supabase = createClient();
      const { data } = await supabase
        .from("chat_messages")
        .select("id, role, content, created_at")
        .eq("conversation_id", convId)
        .order("created_at", { ascending: true });
      if (cancelled) return;
      const rows = (data ?? []) as StoredMessage[];
      setMessages(
        rows.map((r) => ({
          id: r.id,
          role: r.role === "user" ? "user" : "assistant",
          content: r.content,
        })),
      );
      setHistoryLoading(false);
    }
    void loadHistory();
    return () => {
      cancelled = true;
    };
  }, [bootstrapped, convId, setMessages]);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  const streaming = status === "streaming";

  const showStarter = !historyLoading && messages.length === 0;

  return (
    <aside
      className="rounded-2xl border border-gold-500/20 bg-[linear-gradient(165deg,rgba(212,175,55,0.06)_0%,rgba(10,10,10,0.5)_42%,rgba(10,10,10,0.88)_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] flex flex-col min-h-[400px] max-h-[min(620px,calc(100vh-12rem))]"
      aria-label="Professor lesson chat"
    >
      <div className="flex items-start gap-3 px-5 pt-5 pb-3 border-b border-white/[0.06]">
        <ProfessorTiny name={professorName} url={professorAvatarUrl} />
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <MessageSquare className="size-3.5 text-gold-400 shrink-0" />
            <p className="text-[11px] uppercase tracking-[0.2em] text-gold-300 font-medium">
              Ask the Professor
            </p>
          </div>
          <p className="text-xs text-text-muted mt-1 leading-relaxed">
            Deeper questions on this lesson — same rigorous voice as Strategy Lab theory.
          </p>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4 min-h-0">
        {historyLoading && (
          <div className="text-xs text-text-muted flex items-center gap-2 px-2">
            <Loader2 className="size-3.5 animate-spin" /> Loading thread…
          </div>
        )}

        {showStarter && (
          <div className="px-2 py-6 text-center">
            <Sparkles className="size-8 text-gold-400/70 mx-auto mb-3" aria-hidden />
            <p className="text-sm text-text-muted leading-relaxed mb-5">
              Stuck or curious? Probe the reasoning, edge cases, or how this ties to execution.
            </p>
            <div className="space-y-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() =>
                    handleInputChange({
                      target: { value: s },
                    } as React.ChangeEvent<HTMLInputElement>)
                  }
                  className="w-full text-left text-[13px] rounded-xl border border-border-subtle hover:border-border-gold bg-white/[0.02] px-3 py-2.5 text-text-secondary hover:text-text-primary transition-colors leading-snug"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m) => (
          <div
            key={m.id}
            className={cn(
              "flex gap-2.5",
              m.role === "user" ? "justify-end" : "justify-start",
            )}
          >
            {m.role === "assistant" && (
              <ProfessorTiny name={professorName} url={professorAvatarUrl} />
            )}
            <div
              className={cn(
                "max-w-[92%] rounded-xl px-3.5 py-2.5 text-[13px] leading-relaxed whitespace-pre-wrap break-words",
                m.role === "user"
                  ? "bg-gradient-gold text-bg-primary font-medium"
                  : "bg-bg-elevated/95 border border-border-subtle text-text-primary",
              )}
            >
              {typeof m.content === "string"
                ? m.content
                : (m as { parts?: { type: string; text?: string }[] }).parts
                    ?.filter((p) => p.type === "text")
                    .map((p) => p.text)
                    .join("")}
            </div>
          </div>
        ))}

        {streaming && messages[messages.length - 1]?.role === "user" && (
          <div className="flex gap-2.5 justify-start">
            <ProfessorTiny name={professorName} url={professorAvatarUrl} />
            <div className="rounded-xl border border-border-subtle bg-bg-elevated/80 px-3.5 py-2 text-xs text-text-muted flex items-center gap-2">
              <Loader2 className="size-3.5 animate-spin text-gold-400" />
              Thinking
            </div>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="border-t border-white/[0.06] p-4 mt-auto shrink-0">
        <div className="flex gap-2 items-end">
          <textarea
            value={input}
            onChange={handleInputChange}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                if (input.trim())
                  handleSubmit(e as unknown as React.FormEvent<HTMLFormElement>);
              }
            }}
            placeholder="Dig deeper… (Enter to send)"
            rows={2}
            className="input-field flex-1 resize-none text-sm min-h-[44px] max-h-[120px]"
          />
          <Button
            type="submit"
            disabled={!input.trim() || streaming}
            size="icon"
            variant="gold"
            className="size-11 shrink-0"
            aria-label="Send"
          >
            <Send className="size-4" />
          </Button>
        </div>
        <p className="mt-2 text-[10px] uppercase tracking-[0.14em] text-text-muted/90">
          Grounded in this lesson • Private to your account
        </p>
      </form>
    </aside>
  );
}
