"use client";

import { useChat } from "@ai-sdk/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  GraduationCap,
  Plus,
  Send,
  Sparkles,
  Loader2,
  MessageSquare,
  Trash2,
} from "lucide-react";
import { cn, timeAgo } from "@/lib/utils";

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
        <Image src={url} alt={name} fill className="object-cover" sizes={`${size}px`} />
      </div>
    );
  }
  return (
    <div
      className="shrink-0 rounded-lg bg-gradient-gold-soft border border-border-gold flex items-center justify-center text-gold-300"
      style={{ width: size, height: size }}
    >
      <GraduationCap
        className=""
        style={{ width: size * 0.5, height: size * 0.5 }}
        strokeWidth={1.6}
      />
    </div>
  );
}

type Conversation = {
  id: string;
  title: string | null;
  updated_at: string;
  kind: string | null;
};

type StoredMessage = {
  id: string;
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  created_at: string;
};

const SUGGESTIONS = [
  "Explain contribution margin like I'm presenting it to the CFO.",
  "Critique my ICP for a Series B SaaS targeting ops leaders.",
  "Give me a 90-day plan to rebuild our demand engine.",
  "What financial metric should anchor my Q3 marketing plan?",
];

export function ProfessorChat({
  displayName,
  conversations,
  professorName = "AI CMO Professor",
  professorAvatarUrl = null,
}: {
  displayName: string;
  conversations: Conversation[];
  professorName?: string;
  professorAvatarUrl?: string | null;
}) {
  const router = useRouter();
  const [convList, setConvList] = useState(conversations);
  const [activeId, setActiveId] = useState<string | null>(
    conversations[0]?.id ?? null,
  );
  const [history, setHistory] = useState<StoredMessage[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    setConvList(conversations);
  }, [conversations]);

  useEffect(() => {
    if (activeId !== null && !convList.some((c) => c.id === activeId)) {
      setActiveId(convList[0]?.id ?? null);
    }
  }, [convList, activeId]);

  const initialMessages = useMemo(
    () =>
      history.map((h) => ({
        id: h.id,
        role: h.role as "user" | "assistant",
        content: h.content,
      })),
    [history],
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
    body: { conversationId: activeId },
    initialMessages,
  });

  // Load conversation history when active id changes
  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!activeId) {
        setHistory([]);
        setMessages([]);
        return;
      }
      setLoadingHistory(true);
      const supabase = createClient();
      const { data } = await supabase
        .from("chat_messages")
        .select("id, role, content, created_at")
        .eq("conversation_id", activeId)
        .order("created_at", { ascending: true });
      if (cancelled) return;
      const rows = (data ?? []) as StoredMessage[];
      setHistory(rows);
      setMessages(
        rows.map((r) => ({
          id: r.id,
          role: r.role as "user" | "assistant",
          content: r.content,
        })),
      );
      setLoadingHistory(false);
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [activeId, setMessages]);

  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  function newConversation() {
    setActiveId(null);
    setHistory([]);
    setMessages([]);
  }

  async function deleteConversation(id: string, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (
      !window.confirm(
        "Delete this conversation and all its messages? This cannot be undone.",
      )
    ) {
      return;
    }
    setDeletingId(id);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("chat_conversations")
        .delete()
        .eq("id", id);
      if (error) {
        window.alert(error.message ?? "Could not delete conversation.");
        return;
      }
      setConvList((prev) => prev.filter((c) => c.id !== id));
      if (activeId === id) {
        setActiveId(null);
        setHistory([]);
        setMessages([]);
      }
      router.refresh();
    } finally {
      setDeletingId(null);
    }
  }

  const canDelete = (c: Conversation) =>
    (c.kind ?? "general") !== "onboarding";

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-5 h-[calc(100vh-160px)]">
      {/* Conversations rail */}
      <Card className="flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-border-hairline">
          <div className="text-[11px] tracking-[0.18em] uppercase text-gold-400 flex items-center gap-2">
            <MessageSquare className="size-3.5" /> Conversations
          </div>
          <button
            onClick={newConversation}
            className="size-7 rounded-md border border-border-hairline hover:border-border-gold flex items-center justify-center text-text-muted hover:text-gold-300"
            aria-label="New conversation"
          >
            <Plus className="size-3.5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          <button
            onClick={newConversation}
            className={cn(
              "w-full text-left px-3 py-2 rounded-lg mb-1 transition-colors",
              activeId === null
                ? "bg-gradient-gold-soft border border-border-gold"
                : "hover:bg-white/[0.03]",
            )}
          >
            <div className="text-xs font-semibold text-gold-200 flex items-center gap-2">
              <Sparkles className="size-3.5" /> New conversation
            </div>
          </button>
          {convList.map((c) => (
            <div
              key={c.id}
              className={cn(
                "group mb-1 flex rounded-lg border transition-colors",
                activeId === c.id
                  ? "border-border-gold bg-gradient-gold-soft"
                  : "border-transparent hover:bg-white/[0.03]",
              )}
            >
              <button
                type="button"
                onClick={() => setActiveId(c.id)}
                className="min-w-0 flex-1 px-3 py-2 text-left"
              >
                <div className="truncate text-sm text-text-primary">
                  {c.title || "Untitled session"}
                </div>
                <div className="mt-0.5 text-[10px] text-text-muted">
                  {timeAgo(c.updated_at)}
                </div>
              </button>
              {canDelete(c) && (
                <button
                  type="button"
                  disabled={deletingId === c.id}
                  onClick={(e) => deleteConversation(c.id, e)}
                  className={cn(
                    "shrink-0 rounded-md px-2 text-text-muted transition-colors hover:bg-black/25 hover:text-danger",
                    "opacity-0 group-hover:opacity-100 lg:opacity-80 lg:group-hover:opacity-100 focus:opacity-100",
                  )}
                  aria-label={`Delete conversation: ${c.title || "Untitled"}`}
                >
                  {deletingId === c.id ? (
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                  ) : (
                    <Trash2 className="size-4" aria-hidden strokeWidth={1.6} />
                  )}
                </button>
              )}
            </div>
          ))}
        </div>
      </Card>

      {/* Chat panel */}
      <Card className="flex flex-col overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-border-hairline">
          <ProfessorAvatar size={40} name={professorName} url={professorAvatarUrl} />
          <div>
            <div className="font-display text-lg leading-none">
              {professorName}
            </div>
            <div className="text-[11px] tracking-[0.16em] uppercase text-text-muted mt-1">
              Direct • Strategic • MBA-level
            </div>
          </div>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-6 space-y-5">
          {loadingHistory && (
            <div className="text-sm text-text-muted flex items-center gap-2">
              <Loader2 className="size-4 animate-spin" /> Loading conversation
            </div>
          )}

          {!loadingHistory && messages.length === 0 && (
            <div className="max-w-2xl mx-auto text-center py-8">
              <div className="mx-auto mb-5">
                <ProfessorAvatar
                  size={56}
                  name={professorName}
                  url={professorAvatarUrl}
                />
              </div>
              <h3 className="font-display text-2xl mb-2">
                Welcome, {displayName.split(/\s+/)[0]}.
              </h3>
              <p className="text-text-muted mb-6 max-w-md mx-auto">
                Ask {professorName} anything about marketing strategy, P&amp;L,
                positioning, or career growth. She&apos;ll teach, evaluate, and
                remember.
              </p>
              <div className="grid sm:grid-cols-2 gap-2 max-w-xl mx-auto">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() =>
                      handleInputChange({
                        target: { value: s },
                      } as React.ChangeEvent<HTMLInputElement>)
                    }
                    className="text-left text-sm rounded-xl border border-border-subtle hover:border-border-gold bg-bg-elevated/40 px-4 py-3 text-text-secondary hover:text-text-primary transition-colors"
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
                  : (m as { parts?: { type: string; text?: string }[] }).parts
                      ?.filter((p) => p.type === "text")
                      .map((p) => p.text)
                      .join("")}
              </div>
            </div>
          ))}

          {status === "streaming" &&
            messages[messages.length - 1]?.role === "user" && (
              <div className="flex gap-3 justify-start">
                <ProfessorAvatar
                  size={32}
                  name={professorName}
                  url={professorAvatarUrl}
                />
                <div className="bg-bg-elevated border border-border-subtle rounded-2xl px-4 py-3 text-sm text-text-muted flex items-center gap-2">
                  <Loader2 className="size-4 animate-spin text-gold-400" />{" "}
                  Thinking
                </div>
              </div>
            )}
        </div>

        <form
          onSubmit={(e) => {
            handleSubmit(e);
            if (!activeId) {
              setTimeout(() => router.refresh(), 1500);
            }
          }}
          className="border-t border-border-hairline p-4"
        >
          <div className="flex gap-2 items-end">
            <textarea
              value={input}
              onChange={handleInputChange}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  if (input.trim()) {
                    handleSubmit(e as unknown as React.FormEvent);
                    if (!activeId) {
                      setTimeout(() => router.refresh(), 1500);
                    }
                  }
                }
              }}
              placeholder="Ask the Professor… (Enter to send, Shift+Enter for newline)"
              rows={1}
              className="input-field flex-1 resize-none"
              style={{ minHeight: 44, maxHeight: 160 }}
            />
            <Button
              type="submit"
              disabled={!input.trim() || status === "streaming"}
              size="icon"
              className="size-11"
            >
              <Send className="size-4" />
            </Button>
          </div>
          <div className="mt-2 text-[10px] tracking-[0.16em] uppercase text-text-muted">
            {professorName} • Your conversations and memories are private to your
            account.
          </div>
        </form>
      </Card>
    </div>
  );
}
