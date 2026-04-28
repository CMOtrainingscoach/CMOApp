import { PROFESSOR_SYSTEM } from "./prompts";

export type ProfessorConfig = {
  professor_name: string;
  professor_avatar_url: string | null;
  professor_persona: string;
  professor_traits: string[];
  professor_response_length: string;
  professor_language: string;
  professor_extra_notes: string | null;
  professor_system_prompt_override: string | null;
  updated_at: string;
  updated_by: string | null;
};

export const PROFESSOR_CONFIG_FALLBACK: ProfessorConfig = {
  professor_name: "AI CMO Professor",
  professor_avatar_url: null,
  professor_persona:
    "A senior partner at a top consulting firm coaching her best protégé.",
  professor_traits: ["direct", "strategic", "challenging", "premium"],
  professor_response_length: "medium",
  professor_language: "en",
  professor_extra_notes: null,
  professor_system_prompt_override: null,
  updated_at: new Date(0).toISOString(),
  updated_by: null,
};

const LENGTH_GUIDE: Record<string, string> = {
  short:
    "Keep responses very tight: 60-120 words, scannable, no preamble. Headlines and bullets only.",
  medium:
    "Keep responses scannable: 150-300 words. Short paragraphs. Bolded labels. End with one Sharp question.",
  long: "When teaching is required, allow extended explanations: 350-600 words. Use clear sections. Always anchor to a P&L line and a named framework.",
};

const LANGUAGE_GUIDE: Record<string, string> = {
  en: "Respond in English (US business register).",
  "en-uk": "Respond in English (UK business register).",
  fr: "Réponds en français professionnel.",
  nl: "Antwoord in zakelijk Nederlands.",
  de: "Antworte auf professionellem Deutsch.",
  es: "Responde en español profesional.",
};

export function buildProfessorSystemPrompt(
  cfg: ProfessorConfig,
  base: string = PROFESSOR_SYSTEM,
): string {
  const override = (cfg.professor_system_prompt_override ?? "").trim();
  if (override.length > 0) return override;

  const traits = (cfg.professor_traits ?? [])
    .map((t) => `- ${t}`)
    .join("\n");

  const lengthGuide =
    LENGTH_GUIDE[cfg.professor_response_length] ?? LENGTH_GUIDE.medium;
  const languageGuide =
    LANGUAGE_GUIDE[cfg.professor_language] ?? LANGUAGE_GUIDE.en;

  const sections = [
    base,
    "",
    `# Name`,
    `You are addressed as "${cfg.professor_name}". Sign messages with that name only when natural.`,
    "",
    `# Persona`,
    cfg.professor_persona,
    "",
    `# Voice traits`,
    traits || "- direct\n- strategic\n- challenging\n- premium",
    "",
    `# Response length`,
    lengthGuide,
    "",
    `# Language`,
    languageGuide,
  ];

  const extra = (cfg.professor_extra_notes ?? "").trim();
  if (extra.length > 0) {
    sections.push("", `# Extra style notes`, extra);
  }

  return sections.join("\n");
}

export const TRAIT_PRESETS = [
  "direct",
  "strategic",
  "challenging",
  "ruthless",
  "warm",
  "witty",
  "premium",
  "patient",
  "playful",
  "rigorous",
  "executive",
  "concise",
] as const;

export const RESPONSE_LENGTH_OPTIONS = [
  { value: "short", label: "Short — 60-120 words" },
  { value: "medium", label: "Medium — 150-300 words" },
  { value: "long", label: "Long — 350-600 words" },
] as const;

export const LANGUAGE_OPTIONS = [
  { value: "en", label: "English (US)" },
  { value: "en-uk", label: "English (UK)" },
  { value: "fr", label: "Français" },
  { value: "nl", label: "Nederlands" },
  { value: "de", label: "Deutsch" },
  { value: "es", label: "Español" },
] as const;
