/** Shared types for P&L sheet drill (client + server safe). */

export type PlSheetDrillDifficulty = "easy" | "medium" | "hard";

export type PlSheetLine = {
  label: string;
  amount: number | null;
  pctOfRevenue?: number | null;
  isSubtotal?: boolean;
  isTotal?: boolean;
};

export type PublicPlSheetDrillPayload = {
  title: string;
  unitNote: string;
  lines: PlSheetLine[];
};
