import { openaiClient, EMBED_MODEL } from "./openai";

export async function embed(input: string): Promise<number[]> {
  const cleaned = input.replace(/\s+/g, " ").trim().slice(0, 8000);
  const res = await openaiClient.embeddings.create({
    model: EMBED_MODEL,
    input: cleaned,
  });
  return res.data[0].embedding;
}

export async function embedMany(inputs: string[]): Promise<number[][]> {
  if (inputs.length === 0) return [];
  const cleaned = inputs.map((s) =>
    s.replace(/\s+/g, " ").trim().slice(0, 8000),
  );
  const out: number[][] = [];
  const batchSize = 64;
  for (let i = 0; i < cleaned.length; i += batchSize) {
    const batch = cleaned.slice(i, i + batchSize);
    const res = await openaiClient.embeddings.create({
      model: EMBED_MODEL,
      input: batch,
    });
    for (const d of res.data) out.push(d.embedding);
  }
  return out;
}

const TOKENS_PER_CHAR = 0.25;

export function chunkText(
  text: string,
  targetTokens = 800,
  overlapTokens = 100,
): string[] {
  const targetChars = Math.floor(targetTokens / TOKENS_PER_CHAR);
  const overlapChars = Math.floor(overlapTokens / TOKENS_PER_CHAR);
  const cleaned = text.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  if (cleaned.length <= targetChars) return cleaned.length ? [cleaned] : [];

  const paragraphs = cleaned.split(/\n{2,}/);
  const chunks: string[] = [];
  let buf = "";

  const flush = () => {
    if (!buf.trim()) return;
    chunks.push(buf.trim());
    buf = buf.slice(Math.max(0, buf.length - overlapChars));
  };

  for (const p of paragraphs) {
    if ((buf + "\n\n" + p).length > targetChars) {
      flush();
      if (p.length > targetChars) {
        for (let i = 0; i < p.length; i += targetChars - overlapChars) {
          chunks.push(p.slice(i, i + targetChars));
        }
        buf = "";
      } else {
        buf = p;
      }
    } else {
      buf = buf ? buf + "\n\n" + p : p;
    }
  }
  flush();
  return chunks.filter((c) => c.length > 30);
}

export function approxTokens(text: string): number {
  return Math.ceil(text.length * TOKENS_PER_CHAR);
}
