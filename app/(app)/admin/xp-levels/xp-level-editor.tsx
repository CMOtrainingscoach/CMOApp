"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { XpLevelRow } from "@/lib/xp-level-catalog";
import { saveXpLevelConfig } from "./actions";

export function XpLevelEditor({ initialRows }: { initialRows: XpLevelRow[] }) {
  const router = useRouter();
  const [rows, setRows] = useState<XpLevelRow[]>(() =>
    [...initialRows].sort((a, b) => a.level - b.level),
  );
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(
    null,
  );
  const [pending, startTransition] = useTransition();

  const updateRow = (level: number, patch: Partial<XpLevelRow>) => {
    setRows((prev) =>
      prev.map((r) => (r.level === level ? { ...r, ...patch } : r)),
    );
  };

  const onSubmit = () => {
    setMsg(null);
    startTransition(async () => {
      const res = await saveXpLevelConfig(rows);
      if (res.error) {
        setMsg({ kind: "err", text: res.error });
        return;
      }
      setMsg({ kind: "ok", text: "Saved. Rank snapshots refreshed for all users." });
      router.refresh();
    });
  };

  return (
    <div className="space-y-4">
      {msg && (
        <div
          className={
            msg.kind === "ok" ?
              "rounded-lg border border-gold-500/40 bg-gold-500/10 px-4 py-3 text-sm text-gold-200"
            : "rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200"
          }
          role={msg.kind === "err" ? "alert" : "status"}
        >
          {msg.text}
        </div>
      )}

      <div className="max-h-[70vh] overflow-auto rounded-xl border border-border-subtle shadow-inner">
        <table className="w-full min-w-[560px] text-sm caption-bottom border-collapse">
          <thead className="sticky top-0 z-[1] border-b border-border-subtle bg-bg-elevated/95 backdrop-blur-sm">
            <tr className="text-left text-[10px] uppercase tracking-[0.18em] text-text-muted">
              <th className="py-3 pl-4 pr-2 font-medium">Lv</th>
              <th className="py-3 px-2 font-medium">Rank title</th>
              <th className="py-3 pl-2 pr-4 font-medium text-right whitespace-nowrap">
                Min total XP
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-hairline">
            {rows.map((r) => (
              <tr
                key={r.level}
                className={
                  r.level === 0 || r.level === 100 || r.level % 10 === 0 ?
                    "bg-gold-500/[0.04]"
                  : "bg-bg-card/40"
                }
              >
                <td className="py-2 pl-4 pr-2 font-mono text-text-secondary tabular-nums">
                  {r.level}
                </td>
                <td className="py-2 px-2">
                  <input
                    className="w-full rounded-md border border-white/10 bg-bg-card px-2 py-1.5 text-text-primary outline-none focus:border-gold-500/50 focus:ring-1 focus:ring-gold-500/30"
                    value={r.rank_title}
                    onChange={(e) =>
                      updateRow(r.level, { rank_title: e.target.value })
                    }
                    aria-label={`Rank title for level ${r.level}`}
                  />
                </td>
                <td className="py-2 pl-2 pr-4 text-right whitespace-nowrap">
                  <input
                    type="number"
                    min={0}
                    step={1}
                    className="w-36 inline-block rounded-md border border-white/10 bg-bg-card px-2 py-1.5 text-right font-mono text-text-primary tabular-nums outline-none focus:border-gold-500/50 focus:ring-1 focus:ring-gold-500/30"
                    value={Number.isFinite(r.min_total_xp) ? r.min_total_xp : 0}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      updateRow(r.level, {
                        min_total_xp: Number.isFinite(v) ? Math.max(0, Math.floor(v)) : 0,
                      });
                    }}
                    aria-label={`Minimum XP for level ${r.level}`}
                    disabled={r.level === 0}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-text-muted leading-relaxed">
        Thresholds mark when a learner <em>reaches</em> that numeric level (
        inclusive <code className="px-1 rounded bg-white/5">min_total_xp</code>
        ). Each level&apos;s XP must be unique and non‑decreasing. Level 100 is{" "}
        <strong className="text-text-secondary">Visionary CMO</strong> once the
        database row is set that way (
        edit the rank title column for row 100). After save, snapshots refresh
        for all users automatically.
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => void onSubmit()}
          disabled={pending}
          className="btn-gold px-5 py-2 text-sm disabled:opacity-60"
        >
          {pending ? "Saving…" : "Save & refresh snapshots"}
        </button>
      </div>
    </div>
  );
}
