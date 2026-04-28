import OpenAI from "openai";
import { createOpenAI } from "@ai-sdk/openai";

let _openaiClient: OpenAI | null = null;

export function getOpenAIClient(): OpenAI {
  if (!_openaiClient) {
    _openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY ?? "missing-key",
    });
  }
  return _openaiClient;
}

let _openaiProvider: ReturnType<typeof createOpenAI> | null = null;

export function getOpenAIProvider() {
  if (!_openaiProvider) {
    _openaiProvider = createOpenAI({
      apiKey: process.env.OPENAI_API_KEY ?? "missing-key",
    });
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
