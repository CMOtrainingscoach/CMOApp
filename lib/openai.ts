import OpenAI from "openai";
import { createOpenAI } from "@ai-sdk/openai";

/** Non-empty, trimmed server-side key only (never use on the client). */
export function getOpenAiApiKey(): string | undefined {
  const raw = process.env.OPENAI_API_KEY;
  if (raw == null) return undefined;
  const t = String(raw).trim();
  return t.length > 0 ? t : undefined;
}

export function isOpenAiConfigured(): boolean {
  return getOpenAiApiKey() !== undefined;
}

let _openaiClient: OpenAI | null = null;
let _clientKeyFingerprint = "";

export function getOpenAIClient(): OpenAI {
  const key = getOpenAiApiKey() ?? "missing-key";
  if (!_openaiClient || _clientKeyFingerprint !== key) {
    _openaiClient = new OpenAI({ apiKey: key });
    _clientKeyFingerprint = key;
  }
  return _openaiClient;
}

let _openaiProvider: ReturnType<typeof createOpenAI> | null = null;
let _providerKeyFingerprint = "";

export function getOpenAIProvider() {
  const key = getOpenAiApiKey() ?? "missing-key";
  if (!_openaiProvider || _providerKeyFingerprint !== key) {
    _openaiProvider = createOpenAI({ apiKey: key });
    _providerKeyFingerprint = key;
  }
  return _openaiProvider;
}

// Backwards-compatible Proxy-based exports so existing imports keep working
// without instantiating the client at module load time.
export const openaiClient = new Proxy({} as OpenAI, {
  get(_t, prop) {
    return Reflect.get(getOpenAIClient() as object, prop);
  },
});

export const openaiProvider = new Proxy(
  function () {} as unknown as ReturnType<typeof createOpenAI>,
  {
    apply(_t, _thisArg, args) {
      return (getOpenAIProvider() as unknown as (...a: unknown[]) => unknown)(
        ...args,
      );
    },
    get(_t, prop) {
      return Reflect.get(getOpenAIProvider() as object, prop);
    },
  },
);

export const CHAT_MODEL = process.env.OPENAI_CHAT_MODEL ?? "gpt-4o-mini";
export const EMBED_MODEL =
  process.env.OPENAI_EMBED_MODEL ?? "text-embedding-3-small";
export const EMBED_DIMS = 1536;
