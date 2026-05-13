"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { createServiceRoleClient } from "@/lib/supabase/server";
import {
  refreshXpLevelSnapshots,
  type XpLevelRow,
} from "@/lib/xp-level-catalog";

function validateXpLevelConfig(sorted: XpLevelRow[]): string | null {
  if (sorted.length !== 101) return "Exactly 101 levels (0–100) are required.";

  for (let i = 0; i <= 100; i++) {
    const r = sorted[i]!;
    if (r.level !== i) return `Missing or duplicate level numbers (expected contiguous 0–100).`;
    const title = r.rank_title.trim();
    if (!title) return `Level ${i}: rank title cannot be empty.`;
    const xp = Math.floor(Number(r.min_total_xp));
    if (!Number.isFinite(xp) || xp < 0)
      return `Level ${i}: min_total_xp must be a non‑negative integer.`;
  }

  if (sorted[0]!.min_total_xp !== 0)
    return "Level 0 must have min_total_xp = 0 (everyone starts there).";

  for (let i = 1; i <= 100; i++) {
    const prev = sorted[i - 1]!.min_total_xp;
    const cur = sorted[i]!.min_total_xp;
    if (cur < prev) {
      return `Level ${i}: min XP must be ≥ level ${i - 1} threshold (${prev.toLocaleString()}).`;
    }
  }

  const xpVals = sorted.map((r) => r.min_total_xp);
  if (new Set(xpVals).size !== xpVals.length) {
    return "Each level must use a distinct min_total_xp (required by the catalog).";
  }

  return null;
}

/** Upsert XP thresholds/rank titles, then rebuild everyone’s stored rank/level. */
export async function saveXpLevelConfig(
  rows: XpLevelRow[],
): Promise<{ ok?: true; error?: string }> {
  await requireAdmin();

  const sorted = [...rows]
    .map((r) => ({
      level: Math.floor(Number(r.level)),
      rank_title: String(r.rank_title),
      min_total_xp: Math.floor(Number(r.min_total_xp)),
    }))
    .sort((a, b) => a.level - b.level);

  const validationError = validateXpLevelConfig(sorted);
  if (validationError) return { error: validationError };

  const admin = createServiceRoleClient();
  const iso = new Date().toISOString();
  const payload = sorted.map((r) => ({
    level: r.level,
    rank_title: r.rank_title.trim(),
    min_total_xp: r.min_total_xp,
    updated_at: iso,
  }));

  const { error } = await admin.from("xp_level_config").upsert(payload, {
    onConflict: "level",
  });
  if (error) return { error: error.message };

  const snap = await refreshXpLevelSnapshots();
  if (snap.error) return { error: snap.error };

  const paths = [
    "/progress",
    "/admin/xp-levels",
    "/strategy-lab/progress",
    "/pl-lab/progress",
    "/lifestyle/progress",
  ];
  for (const p of paths) {
    revalidatePath(p);
  }

  return { ok: true };
}
