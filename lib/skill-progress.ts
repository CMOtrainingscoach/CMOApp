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
