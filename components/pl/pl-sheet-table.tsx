import { cn } from "@/lib/utils";
import type { PublicPlSheetDrillPayload } from "@/lib/pl/pl-sheet-drill-types";

export function PlSheetTable({ sheet }: { sheet: PublicPlSheetDrillPayload }) {
  return (
    <div className="rounded-xl border border-border-subtle bg-black/20 overflow-hidden">
      <div className="px-4 py-3 border-b border-white/10 bg-white/[0.03]">
        <h2 className="font-display text-lg text-text-primary tracking-tight">
          {sheet.title}
        </h2>
        <p className="text-[11px] text-text-muted mt-1 uppercase tracking-[0.16em]">
          {sheet.unitNote}
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[10px] uppercase tracking-[0.18em] text-text-muted border-b border-white/10">
              <th className="px-4 py-2 font-medium">Line</th>
              <th className="px-4 py-2 font-medium text-right tabular-nums">
                $000s
              </th>
            </tr>
          </thead>
          <tbody>
            {sheet.lines.map((line, i) => (
              <tr
                key={i}
                className={cn(
                  "border-b border-white/[0.06]",
                  line.isTotal && "bg-gold-500/[0.07]",
                  line.isSubtotal && !line.isTotal && "bg-white/[0.02]",
                )}
              >
                <td
                  className={cn(
                    "px-4 py-2.5 text-text-secondary",
                    (line.isSubtotal || line.isTotal) && "font-medium text-text-primary",
                  )}
                >
                  {line.label}
                  {line.pctOfRevenue != null ? (
                    <span className="ml-2 text-[10px] text-text-muted tabular-nums">
                      ({line.pctOfRevenue.toFixed(1)}% rev.)
                    </span>
                  ) : null}
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums text-text-primary">
                  {line.amount == null
                    ? "—"
                    : line.amount.toLocaleString("en-US")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
