/** Curated canonical pairs for Strategy Lab marketing-jargon practice (IDs stable for analytics). */

import { JARGON_ROUND_SIZE } from "@/lib/pl/jargon-match-bank";

export type MarketingJargonPair = {
  id: string;
  term: string;
  definition: string;
};

export { JARGON_ROUND_SIZE };

/** 24 entries — sample 10 per round without replacement (same round size as P&L jargon). */
export const STRATEGY_MARKETING_JARGON_BANK: readonly MarketingJargonPair[] = [
  {
    id: "stp",
    term: "STP",
    definition:
      "Segmentation, targeting, positioning — choosing who to serve, whom to prioritize, and the angle you own in their mind.",
  },
  {
    id: "swot",
    term: "SWOT",
    definition:
      "Strengths, weaknesses, opportunities, threats — a situational scan; not a strategy by itself until priorities are chosen.",
  },
  {
    id: "pos",
    term: "POS",
    definition:
      "Point of sale — where the transaction happens; also used for in-store merchandising and conversion at checkout.",
  },
  {
    id: "cagr",
    term: "CAGR",
    definition:
      "Compound annual growth rate — smoothed year-over-year growth over multiple periods.",
  },
  {
    id: "yoy",
    term: "YoY",
    definition: "Year over year — comparing the same period to the prior year.",
  },
  {
    id: "mom",
    term: "MoM",
    definition:
      "Month over month — short-horizon trend useful for tactics; watch for noise vs signal.",
  },
  {
    id: "gtm",
    term: "GTM",
    definition:
      "Go-to-market — how you launch or scale a product: audience, channels, pricing/packaging, and sales motion.",
  },
  {
    id: "icp",
    term: "ICP",
    definition:
      "Ideal customer profile — firmographic/fit criteria for whom you deliberately win; narrows focus vs total addressable buyers.",
  },
  {
    id: "pm",
    term: "PM",
    definition:
      "Product marketing — bridges product, positioning, and launch; owns narrative, packaging, and enablement to revenue teams.",
  },
  {
    id: "abm",
    term: "ABM",
    definition:
      "Account-based marketing — coordinated campaigns and plays targeted at specific accounts or clusters, not spray-and-pray demand gen.",
  },
  {
    id: "nps",
    term: "NPS",
    definition:
      "Net promoter score — loyalty intent survey metric; useful as a directional signal, dangerous as a sole KPI.",
  },
  {
    id: "clv-cac",
    term: "LTV:CAC",
    definition:
      "Lifetime value to customer acquisition cost ratio — a guardrail for sustainable growth; context and cohorts matter.",
  },
  {
    id: "romi",
    term: "ROMI",
    definition:
      "Return on marketing investment — marketing-attributed return vs spend; definition of “return” must be explicit.",
  },
  {
    id: "sov-sos",
    term: "SoV vs SoS",
    definition:
      "Share of voice (often measured spend or mentions) vs share of shelf — presence in retail facings; both address competitiveness.",
  },
  {
    id: "tofu-mofu-bofu",
    term: "ToFu / MoFu / BoFu",
    definition:
      "Top/middle/bottom of funnel — awareness, consideration, conversion; useful for messaging and measurement design.",
  },
  {
    id: "usp",
    term: "USP",
    definition:
      "Unique selling proposition — the crisp reason a defined buyer should pick you over substitutes.",
  },
  {
    id: "cta",
    term: "CTA",
    definition:
      "Call to action — the explicit next step you want the user to take in creative or on-site.",
  },
  {
    id: "kpi",
    term: "KPI",
    definition:
      "Key performance indicator — a named metric tied to a decision; fewer, sharper KPIs beat dashboards of vanity.",
  },
  {
    id: "okr",
    term: "OKR",
    definition:
      "Objectives and key results — outcome-oriented goals with measurable results; not the same as a task list.",
  },
  {
    id: "pql",
    term: "PQL",
    definition:
      "Product-qualified lead — a lead scored by in-product behavior as ready for sales or expansion.",
  },
  {
    id: "mql-sql",
    term: "MQL / SQL",
    definition:
      "Marketing-qualified vs sales-qualified lead — handoff stages between demand gen and selling; definitions must be aligned.",
  },
  {
    id: "cpl-cpa",
    term: "CPL vs CPA",
    definition:
      "Cost per lead vs cost per acquisition — lead cost is earlier funnel; CPA usually implies a conversion outcome.",
  },
  {
    id: "branding-dr",
    term: "Distinctive assets",
    definition:
      "Consistent cues (colors, characters, sonic, pack shapes) that make the brand recognizable without the logo alone.",
  },
  {
    id: "always-on",
    term: "Always-on",
    definition:
      "Baseline always-running media or programs vs bursts; balances efficiency learning with sustained presence.",
  },
];
