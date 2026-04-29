/**
 * Parses `strategy_lessons.learning_objective` text that may contain several
 * outcomes pasted as one paragraph (capitalized verbs starting new bullets).
 */

/** Where a pasted list may break before the next imperative / learning verb.
 * "Assess" as a standalone bullet uses a branch that does not match the space inside
 * "learn to assess" (`to` immediately before whitespace + Assess). */
const SPLIT_BEFORE_MULTI_OUTCOME = new RegExp(
  [
    String.raw`\s+(?=(?:Understand|Distinguish|Recognize|Learn(?:\s+that|\s+to\b)|Identify|Develop|Build|Shift|Apply|Demonstrate|Analyze|Explain|Describe|Evaluate|Compare|Define)\s+)`,
    String.raw`|(?<!\bto)\s+(?=Assess\s+)`,
  ].join(""),
  "gi",
);
export function parseLearningOutcomes(
  raw: string | null | undefined,
): string[] {
  if (!raw?.trim()) return [];
  const t = raw.trim();

  const byNewline = t
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (byNewline.length > 1) return byNewline;

  const byBulletChars = t.split(/\s*[•·]+\s*/).map((s) => s.trim()).filter(Boolean);
  if (byBulletChars.length > 1) return byBulletChars;

  const bySemicolon = t
    .split(/;\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (
    bySemicolon.length > 1 &&
    bySemicolon.every((s) => s.length >= 24)
  ) {
    return bySemicolon;
  }

  const split = t
    .split(SPLIT_BEFORE_MULTI_OUTCOME)
    .map((s) => s.trim())
    .filter(Boolean);
  if (split.length > 1) return split;

  return [t];
}
