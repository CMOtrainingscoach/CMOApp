"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Save,
  Loader2,
  CheckCircle2,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import {
  Card,
  CardBody,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  buildProfessorSystemPrompt,
  type ProfessorConfig,
  TRAIT_PRESETS,
  RESPONSE_LENGTH_OPTIONS,
  LANGUAGE_OPTIONS,
} from "@/lib/professor-config";
import { PROFESSOR_SYSTEM } from "@/lib/prompts";
import { cn } from "@/lib/utils";
import { saveProfessorSettings } from "./actions";

type FormState = {
  professor_name: string;
  professor_persona: string;
  professor_traits: string[];
  professor_response_length: string;
  professor_language: string;
  professor_extra_notes: string;
  professor_system_prompt_override: string;
};

export function AdminForm({ initial }: { initial: ProfessorConfig }) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>({
    professor_name: initial.professor_name,
    professor_persona: initial.professor_persona,
    professor_traits: initial.professor_traits ?? [],
    professor_response_length: initial.professor_response_length,
    professor_language: initial.professor_language,
    professor_extra_notes: initial.professor_extra_notes ?? "",
    professor_system_prompt_override:
      initial.professor_system_prompt_override ?? "",
  });
  const [showAdvanced, setShowAdvanced] = useState(
    Boolean(initial.professor_system_prompt_override),
  );
  const [showPreview, setShowPreview] = useState(false);
  const [pending, start] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof FormState>(key: K, val: FormState[K]) {
    setForm((f) => ({ ...f, [key]: val }));
    setSaved(false);
  }

  function toggleTrait(trait: string) {
    setForm((f) => {
      const has = f.professor_traits.includes(trait);
      return {
        ...f,
        professor_traits: has
          ? f.professor_traits.filter((t) => t !== trait)
          : [...f.professor_traits, trait],
      };
    });
    setSaved(false);
  }

  const compiledPrompt = useMemo(
    () =>
      buildProfessorSystemPrompt(
        {
          ...initial,
          professor_name: form.professor_name,
          professor_persona: form.professor_persona,
          professor_traits: form.professor_traits,
          professor_response_length: form.professor_response_length,
          professor_language: form.professor_language,
          professor_extra_notes: form.professor_extra_notes || null,
          professor_system_prompt_override:
            form.professor_system_prompt_override || null,
        },
        PROFESSOR_SYSTEM,
      ),
    [form, initial],
  );

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    start(async () => {
      try {
        await saveProfessorSettings({
          professor_name: form.professor_name,
          professor_persona: form.professor_persona,
          professor_traits: form.professor_traits,
          professor_response_length: form.professor_response_length,
          professor_language: form.professor_language,
          professor_extra_notes: form.professor_extra_notes || null,
          professor_system_prompt_override:
            form.professor_system_prompt_override || null,
        });
        setSaved(true);
        router.refresh();
      } catch (err) {
        setError((err as Error).message);
      }
    });
  }

  const overrideActive = form.professor_system_prompt_override.trim().length > 0;

  return (
    <form onSubmit={submit} className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle>Identity</CardTitle>
          {saved && (
            <span className="inline-flex items-center gap-1.5 text-xs text-success">
              <CheckCircle2 className="size-3.5" /> Saved
            </span>
          )}
        </CardHeader>
        <CardBody className="space-y-4">
          <div>
            <Label>Professor name</Label>
            <Input
              value={form.professor_name}
              onChange={(e) => update("professor_name", e.target.value)}
              maxLength={80}
              placeholder="e.g. Vivienne, Professor Hale, AI CMO Professor"
            />
            <p className="mt-1 text-[11px] text-text-muted">
              Shown on the dashboard portrait, chat header, and used in message
              signatures when natural.
            </p>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tone of Voice</CardTitle>
          <button
            type="button"
            onClick={() => setShowPreview((v) => !v)}
            className="text-[11px] tracking-[0.16em] uppercase text-text-muted hover:text-gold-300 inline-flex items-center gap-1.5"
          >
            {showPreview ? (
              <>
                <EyeOff className="size-3.5" /> Hide preview
              </>
            ) : (
              <>
                <Eye className="size-3.5" /> Preview compiled prompt
              </>
            )}
          </button>
        </CardHeader>
        <CardBody className="space-y-5">
          <div>
            <Label>Persona</Label>
            <Textarea
              value={form.professor_persona}
              onChange={(e) => update("professor_persona", e.target.value)}
              maxLength={2000}
              placeholder="A senior partner at a top consulting firm, ex-CMO of a Series B SaaS, coaching her best protégé."
            />
            <p className="mt-1 text-[11px] text-text-muted">
              One paragraph: who she is, what she has done, what she expects of
              the user.
            </p>
          </div>

          <div>
            <Label>Voice traits</Label>
            <div className="flex flex-wrap gap-2">
              {TRAIT_PRESETS.map((t) => {
                const selected = form.professor_traits.includes(t);
                return (
                  <button
                    type="button"
                    key={t}
                    onClick={() => toggleTrait(t)}
                    className={cn(
                      "px-3 py-1.5 rounded-full text-xs font-medium tracking-wide capitalize transition-colors border",
                      selected
                        ? "bg-gradient-gold-soft border-border-gold text-gold-100"
                        : "bg-bg-elevated/50 border-border-hairline text-text-muted hover:text-text-primary hover:border-border-gold",
                    )}
                  >
                    {t}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Response length</Label>
              <select
                className="input-field"
                value={form.professor_response_length}
                onChange={(e) =>
                  update("professor_response_length", e.target.value)
                }
              >
                {RESPONSE_LENGTH_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label>Language</Label>
              <select
                className="input-field"
                value={form.professor_language}
                onChange={(e) => update("professor_language", e.target.value)}
              >
                {LANGUAGE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <Label>Extra style notes (optional)</Label>
            <Textarea
              value={form.professor_extra_notes}
              onChange={(e) => update("professor_extra_notes", e.target.value)}
              maxLength={2000}
              placeholder="E.g. lean into Dutch business culture, prefer Porter and JTBD over BCG, avoid overusing the word 'leverage'."
            />
          </div>

          <div className="border-t border-border-hairline pt-4">
            <button
              type="button"
              onClick={() => setShowAdvanced((v) => !v)}
              className="inline-flex items-center gap-1.5 text-[11px] tracking-[0.18em] uppercase text-gold-400 hover:text-gold-300"
            >
              {showAdvanced ? (
                <ChevronDown className="size-3.5" />
              ) : (
                <ChevronRight className="size-3.5" />
              )}
              Advanced — Raw system prompt override
            </button>
            {showAdvanced && (
              <div className="mt-3 space-y-2">
                <p className="text-xs text-text-muted">
                  If non-empty, this value <strong>fully replaces</strong> the
                  default system prompt and the structured controls above. Use
                  this only if you know what you&apos;re doing.
                </p>
                <Textarea
                  value={form.professor_system_prompt_override}
                  onChange={(e) =>
                    update("professor_system_prompt_override", e.target.value)
                  }
                  maxLength={8000}
                  rows={8}
                  className="font-mono text-xs"
                  placeholder="Leave empty to use the structured controls above."
                />
                {overrideActive && (
                  <div className="text-[11px] text-gold-300 inline-flex items-center gap-1.5">
                    <CheckCircle2 className="size-3.5" /> Override is active —
                    it will be used as the entire system prompt.
                  </div>
                )}
              </div>
            )}
          </div>

          {showPreview && (
            <div className="border-t border-border-hairline pt-4">
              <div className="text-[10px] tracking-[0.18em] uppercase text-gold-500 mb-2">
                Compiled system prompt (live preview)
              </div>
              <pre className="text-xs leading-relaxed text-text-secondary whitespace-pre-wrap bg-bg-inset border border-border-hairline rounded-xl p-4 max-h-[420px] overflow-auto font-mono">
                {compiledPrompt}
              </pre>
            </div>
          )}
        </CardBody>
      </Card>

      <div className="flex items-center gap-3 sticky bottom-0 z-10 bg-bg-primary/80 backdrop-blur py-3">
        <Button type="submit" disabled={pending}>
          {pending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Save className="size-4" />
          )}
          Save Professor Settings
        </Button>
        {saved && (
          <span className="inline-flex items-center gap-1.5 text-sm text-success">
            <CheckCircle2 className="size-4" /> Saved
          </span>
        )}
        {error && (
          <span className="text-sm text-danger">{error}</span>
        )}
      </div>
    </form>
  );
}
