"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Loader2, Save, CheckCircle2 } from "lucide-react";
import { saveProfile } from "./actions";

export function SettingsForm({
  email,
  profile,
}: {
  email: string;
  profile: {
    display_name: string;
    headline: string;
    role: string;
    persona_summary: string;
  };
}) {
  const [form, setForm] = useState(profile);
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  function update<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm({ ...form, [k]: v });
    setSaved(false);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      await saveProfile(form);
      setSaved(true);
    });
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label>Email</Label>
          <Input value={email} disabled />
        </div>
        <div>
          <Label>Display name</Label>
          <Input
            value={form.display_name}
            onChange={(e) => update("display_name", e.target.value)}
          />
        </div>
        <div>
          <Label>Headline</Label>
          <Input
            value={form.headline}
            onChange={(e) => update("headline", e.target.value)}
            placeholder="CMO IN THE MAKING"
          />
        </div>
        <div>
          <Label>Role / Track</Label>
          <Input
            value={form.role}
            onChange={(e) => update("role", e.target.value)}
            placeholder="CMO Ascension Track"
          />
        </div>
      </div>
      <div>
        <Label>Persona summary (the Professor uses this)</Label>
        <Textarea
          value={form.persona_summary}
          onChange={(e) => update("persona_summary", e.target.value)}
          placeholder="A few sentences: where you are now, what you're optimizing for, where you want to be in 2 years."
        />
      </div>
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Save className="size-4" />
          )}
          Save Profile
        </Button>
        {saved && (
          <span className="inline-flex items-center gap-1.5 text-sm text-success">
            <CheckCircle2 className="size-4" /> Saved
          </span>
        )}
      </div>
    </form>
  );
}
