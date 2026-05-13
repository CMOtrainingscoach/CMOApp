import { SKILL_KEYS, type SkillKey } from "@/types/database";

/** Merge DB skill_scores with the eight pillar keys; defaults match seeded profile baseline (50). */
export function normalizeSkillRows(
  rows: { skill_key: string; score: number }[] | null | undefined,
): { skill_key: SkillKey; score: number }[] {
  const map = new Map<SkillKey, number>(
    (rows ?? []).map((r) => [r.skill_key as SkillKey, r.score]),
  );
  return SKILL_KEYS.map((key) => ({
    skill_key: key,
    score: map.get(key) ?? 50,
  }));
}

export function overallFromSkillRows(
  rows: { skill_key: string; score: number }[] | null | undefined,
): number {
  const ordered = normalizeSkillRows(rows);
  const sum = ordered.reduce((s, r) => s + r.score, 0);
  return Math.round(sum / SKILL_KEYS.length);
}

/** Map of stored scores only — no synthetic defaults (use for honest per-pillar UI). */
export function skillScoreMapFromRows(
  rows: { skill_key: string; score: number }[] | null | undefined,
): Map<SkillKey, number> {
  const m = new Map<SkillKey, number>();
  for (const r of rows ?? []) {
    m.set(r.skill_key as SkillKey, r.score);
  }
  return m;
}

/**
 * CMO index across the eight canonical pillars.
 * Rows missing from the DB count as 0 so partial profiles reflect gaps.
 */
export function overallCmoIndexFromStoredRows(
  rows: { skill_key: string; score: number }[] | null | undefined,
): number {
  const map = skillScoreMapFromRows(rows);
  const sum = SKILL_KEYS.reduce((acc, k) => acc + (map.get(k) ?? 0), 0);
  return Math.round(sum / SKILL_KEYS.length);
}
