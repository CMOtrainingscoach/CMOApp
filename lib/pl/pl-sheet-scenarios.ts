import "server-only";

import type {
  PlSheetLine,
  PublicPlSheetDrillPayload,
  PlSheetDrillDifficulty,
} from "@/lib/pl/pl-sheet-drill-types";

export type { PlSheetLine, PublicPlSheetDrillPayload, PlSheetDrillDifficulty };

export type PlSheetDrillScenario = {
  id: string;
  difficulty: PlSheetDrillDifficulty;
  title: string;
  unitNote: string;
  lines: PlSheetLine[];
  /** Shown to the learner */
  questionMd: string;
  /** Server-only — not sent to client */
  referenceAnswer: string;
  gradingNotes: string;
  keywordsMustHit?: string[];
};

function byDifficulty(d: PlSheetDrillDifficulty): PlSheetDrillScenario[] {
  return PL_SHEET_SCENARIOS.filter((s) => s.difficulty === d);
}

export function pickRandomScenario(
  difficulty: PlSheetDrillDifficulty,
): PlSheetDrillScenario {
  const pool = byDifficulty(difficulty);
  const s = pool[Math.floor(Math.random() * pool.length)];
  if (!s) throw new Error(`No P&L sheet scenarios for ${difficulty}`);
  return s;
}

export function getScenarioById(id: string): PlSheetDrillScenario | undefined {
  return PL_SHEET_SCENARIOS.find((s) => s.id === id);
}

/** Safe payload for the client (no answers). */
export function toPublicPayload(s: PlSheetDrillScenario): PublicPlSheetDrillPayload {
  return {
    title: s.title,
    unitNote: s.unitNote,
    lines: s.lines.map(({ label, amount, pctOfRevenue, isSubtotal, isTotal }) => ({
      label,
      amount,
      pctOfRevenue: pctOfRevenue ?? null,
      isSubtotal,
      isTotal,
    })),
  };
}

export const PL_SHEET_DRILL_XP: Record<PlSheetDrillDifficulty, number> = {
  easy: 10,
  medium: 20,
  hard: 50,
};

const PL_SHEET_SCENARIOS: PlSheetDrillScenario[] = [
  // --- Easy ---
  {
    id: "easy_aplus_grocery",
    difficulty: "easy",
    title: "Aplus Grocery — Q3 simplified P&L",
    unitNote: "All figures in $000s",
    lines: [
      { label: "Net revenue", amount: 2400 },
      { label: "Cost of goods sold", amount: 1500 },
      { label: "Gross profit", amount: 900, isSubtotal: true, pctOfRevenue: 37.5 },
      { label: "Store operating expenses", amount: 520 },
      { label: "Operating income", amount: 380, isTotal: true },
    ],
    questionMd:
      "Using only the figures on this P&L, **what is gross profit margin** (gross profit ÷ net revenue), expressed as a **percentage rounded to one decimal**?",
    referenceAnswer:
      "Gross profit margin = 900 ÷ 2,400 = 0.375 = **37.5%**.",
    gradingNotes:
      "Accept 37.5% or equivalent (0.375 as fraction). Minor rounding to 38% only if user explains rounding; prefer 37.5.",
    keywordsMustHit: ["37.5"],
  },
  {
    id: "easy_saas_seat",
    difficulty: "easy",
    title: "Northline SaaS — monthly flash P&L",
    unitNote: "All figures in $000s",
    lines: [
      { label: "Subscription revenue", amount: 820 },
      { label: "Cost of revenue (hosting & support)", amount: 205 },
      { label: "Gross profit", amount: 615, isSubtotal: true },
      { label: "Sales & marketing", amount: 246 },
      { label: "Operating income", amount: 369, isTotal: true },
    ],
    questionMd:
      "**Sales & marketing is what percentage of subscription revenue?** Give your answer as a **percent rounded to a whole number**.",
    referenceAnswer:
      "S&M % of revenue = 246 ÷ 820 ≈ 0.30 → **30%** (exactly 30% with these numbers).",
    gradingNotes: "Accept 30% or 30.0%.",
    keywordsMustHit: ["30"],
  },
  {
    id: "easy_coffee_chain",
    difficulty: "easy",
    title: "BeanStreet Retail — four-week P&L",
    unitNote: "All figures in $000s",
    lines: [
      { label: "Revenue", amount: 1100 },
      { label: "Product cost", amount: 440 },
      { label: "Gross profit", amount: 660, isSubtotal: true },
      { label: "Labour", amount: 330 },
      { label: "EBITDA", amount: 330, isTotal: true },
    ],
    questionMd:
      "**Contribution before labour** (revenue minus product cost) is how many **$000s** on this sheet?",
    referenceAnswer:
      "Revenue − product cost = 1,100 − 440 = **660** ($000s), which is gross profit here.",
    gradingNotes:
      "Accept answer **660** or '$660k' / '660 thousand'. Must not use EBITDA (330).",
      keywordsMustHit: ["660"],
  },
  {
    id: "easy_media_buy",
    difficulty: "easy",
    title: "Pulse Digital — campaign P&L",
    unitNote: "All figures in $000s",
    lines: [
      { label: "Client billings (revenue)", amount: 400 },
      { label: "Media pass-through cost", amount: 280 },
      { label: "Agency gross profit", amount: 120, isSubtotal: true },
      { label: "People & tools", amount: 70 },
      { label: "Operating income", amount: 50, isTotal: true },
    ],
    questionMd:
      "What is **pass-through cost as a percentage of billings**? Answer as **whole percent**.",
    referenceAnswer: "280 ÷ 400 = 0.70 → **70%**.",
    gradingNotes: "Accept 70%.",
    keywordsMustHit: ["70"],
  },
  // --- Medium ---
  {
    id: "medium_industrial_co",
    difficulty: "medium",
    title: "VoltWorks Industrial — YTD P&L",
    unitNote: "All figures in $000s",
    lines: [
      { label: "Revenue", amount: 12_400 },
      { label: "Cost of sales", amount: 7_440 },
      { label: "Gross profit", amount: 4_960, isSubtotal: true },
      { label: "R&D", amount: 620 },
      { label: "Sales & marketing", amount: 1_240 },
      { label: "G&A", amount: 868 },
      { label: "Total operating expenses", amount: 2_728, isSubtotal: true },
      { label: "Operating income", amount: 2_232, isTotal: true },
    ],
    questionMd:
      "What is **operating margin** (operating income ÷ revenue) as a **percentage with one decimal**?",
    referenceAnswer:
      "2,232 ÷ 12,400 = 0.18 → **18.0%**.",
    gradingNotes: "Accept 18% or 18.0%.",
    keywordsMustHit: ["18"],
  },
  {
    id: "medium_consumer_brand",
    difficulty: "medium",
    title: "Luma Consumer — quarterly P&L",
    unitNote: "All figures in $000s",
    lines: [
      { label: "Net sales", amount: 8_200 },
      { label: "COGS", amount: 4_920 },
      { label: "Gross profit", amount: 3_280, isSubtotal: true },
      { label: "Trade & shopper marketing", amount: 820 },
      { label: "Brand media", amount: 410 },
      { label: "Other opex", amount: 1_312 },
      { label: "Operating income", amount: 738, isTotal: true },
    ],
    questionMd:
      "**Total consumer marketing spend** (trade & shopper + brand media) is what **percentage of net sales**? One decimal percent.",
    referenceAnswer:
      "(820 + 410) ÷ 8,200 = 1,230 ÷ 8,200 ≈ 0.15 → **15.0%**.",
    gradingNotes: "Accept 15% or 15.0%.",
    keywordsMustHit: ["15"],
  },
  {
    id: "medium_logistics",
    difficulty: "medium",
    title: "RouteOne Logistics — segment P&L",
    unitNote: "All figures in $000s",
    lines: [
      { label: "Revenue", amount: 5_600 },
      { label: "Variable network cost", amount: 3_360 },
      { label: "Contribution margin", amount: 2_240, isSubtotal: true },
      { label: "Fixed hub costs", amount: 980 },
      { label: "Depreciation & amortisation", amount: 280 },
      { label: "Operating income", amount: 980, isTotal: true },
    ],
    questionMd:
      "After **contribution margin**, how many **$000s** remain as operating income **after** deducting **both** fixed hub costs and D&A?",
    referenceAnswer:
      "Contribution 2,240 − 980 (fixed hub) − 280 (D&A) = **980** ($000s operating income — cross-check matches line).",
    gradingNotes:
      "User should compute 2240-980-280=980 or reason from sheet total. Accept **980**.",
    keywordsMustHit: ["980"],
  },
  {
    id: "medium_marketplace",
    difficulty: "medium",
    title: "GridBuy Marketplace — P&L excerpt",
    unitNote: "All figures in $000s",
    lines: [
      { label: "GMV (not revenue)", amount: 20_000 },
      { label: "Net revenue (take rate applied)", amount: 2_000 },
      { label: "Cost of revenue", amount: 600 },
      { label: "Gross profit", amount: 1_400, isSubtotal: true },
      { label: "Technology & G&A", amount: 900 },
      { label: "Operating income", amount: 500, isTotal: true },
    ],
    questionMd:
      "**Take-rate implied** by net revenue vs GMV: express **net revenue as a percentage of GMV** (one decimal).",
    referenceAnswer: "2,000 ÷ 20,000 = **10.0%**.",
    gradingNotes: "Must use 2000/20000 not gross profit. Accept 10% or 10.0%.",
    keywordsMustHit: ["10"],
  },
  // --- Hard ---
  {
    id: "hard_turnaround_co",
    difficulty: "hard",
    title: "Sterling Foods — restructuring P&L",
    unitNote: "All figures in $000s",
    lines: [
      { label: "Revenue", amount: 15_000 },
      { label: "Standard COGS", amount: 9_000 },
      { label: "Inventory write-down (one-time)", amount: 600 },
      { label: "Reported gross profit", amount: 5_400, isSubtotal: true },
      { label: "Operating expenses (excl. one-time)", amount: 3_600 },
      { label: "Restructuring charge (one-time)", amount: 900 },
      { label: "Operating income (reported)", amount: 900, isTotal: true },
    ],
    questionMd:
      "For **operating performance excluding both one-time items** (inventory write-down and restructuring), what is **adjusted operating income** in **$000s**? Show reasoning in one short sentence.",
    referenceAnswer:
      "Start from reported operating income 900, add back one-time COGS hit 600 and restructuring 900 → **2,400** $000s (or equivalent bridge from contribution subtotals).",
    gradingNotes:
      "Correct numeric anchor: 900 + 600 + 900 = **2,400**. Accept small alternative bridges if they reconcile. Wrong if they ignore both one-times.",
    keywordsMustHit: ["2400", "2,400"],
  },
  {
    id: "hard_capital_intensive",
    difficulty: "hard",
    title: "NordicCell — P&L with financing layer",
    unitNote: "All figures in $000s",
    lines: [
      { label: "Revenue", amount: 22_000 },
      { label: "COGS", amount: 13_200 },
      { label: "Gross profit", amount: 8_800, isSubtotal: true },
      { label: "OpEx", amount: 5_500 },
      { label: "EBITDA", amount: 3_300, isSubtotal: true },
      { label: "D&A", amount: 1_100 },
      { label: "EBIT", amount: 2_200, isSubtotal: true },
      { label: "Net interest expense", amount: 440 },
      { label: "Pre-tax income", amount: 1_760, isTotal: true },
    ],
    questionMd:
      "What is **EBIT margin** (EBIT ÷ revenue) as a **percentage, one decimal**?",
    referenceAnswer: "2,200 ÷ 22,000 = **10.0%**.",
    gradingNotes:
      "Must use EBIT (2200) not EBITDA or pre-tax. Accept 10% / 10.0%.",
    keywordsMustHit: ["10"],
  },
  {
    id: "hard_margin_bridge",
    difficulty: "hard",
    title: "Alto Software — gross to net bridge",
    unitNote: "All figures in $000s",
    lines: [
      { label: "ARR-style revenue", amount: 6_000 },
      { label: "Professional services revenue", amount: 400 },
      { label: "Total revenue", amount: 6_400, isSubtotal: true },
      { label: "COGS (software)", amount: 960 },
      { label: "COGS (services)", amount: 280 },
      { label: "Gross profit", amount: 5_160, isSubtotal: true },
      { label: "R&D", amount: 1_920 },
      { label: "S&M", amount: 1_280 },
      { label: "G&A", amount: 640 },
      { label: "Operating income", amount: 1_320, isTotal: true },
    ],
    questionMd:
      "**Combined COGS** is what percentage of **total revenue**? Answer **one decimal** percent.",
    referenceAnswer:
      "(960 + 280) ÷ 6,400 = 1,240 ÷ 6,400 = **19.4%** (0.19375 → 19.4 one decimal).",
    gradingNotes: "Accept 19.4%. Not 19.375 unless rounded to one decimal as 19.4.",
    keywordsMustHit: ["19.4"],
  },
  {
    id: "hard_retail_fourwall",
    difficulty: "hard",
    title: "UrbanFit Stores — four-wall view",
    unitNote: "All figures in $000s — one representative store",
    lines: [
      { label: "Net sales", amount: 3_400 },
      { label: "Product cost", amount: 1_870 },
      { label: "Gross profit", amount: 1_530, isSubtotal: true },
      { label: "Occupancy", amount: 510 },
      { label: "Store labour", amount: 680 },
      { label: "Store contribution", amount: 340, isSubtotal: true },
      { label: "Allocated corporate", amount: 170 },
      { label: "Store operating income", amount: 170, isTotal: true },
    ],
    questionMd:
      "**Store contribution** (before allocated corporate) is what **percentage of net sales**? One decimal.",
    referenceAnswer: "340 ÷ 3,400 = **10.0%**.",
    gradingNotes:
      "Must use store contribution 340, not store operating income 170. Accept 10% / 10.0%.",
    keywordsMustHit: ["10"],
  },
];
