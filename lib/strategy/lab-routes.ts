import type { ContentLabSlug } from "./lab-slug";

export type LabRouteBundle = {
  contentLabSlug: ContentLabSlug;
  basePath: string;
  badgeLabel: string;
  homeSubtitle: string;
  homeHeadline: string;
  homeLead: string;
  /** First track to suggest when a track is inactive */
  starterTrackSlug: string;
};

export const STRATEGY_LAB: LabRouteBundle = {
  contentLabSlug: "strategy",
  basePath: "/strategy-lab",
  badgeLabel: "Strategy Lab",
  homeSubtitle:
    "Tracks become muscle memory through reps. Pick where to fight.",
  homeHeadline: "The Twelve Tracks",
  homeLead:
    "Start with the active track. The others light up as the system grows.",
  starterTrackSlug: "positioning-strategy",
};

export const PL_LAB: LabRouteBundle = {
  contentLabSlug: "pl",
  basePath: "/pl-lab",
  badgeLabel: "P&L Lab",
  homeSubtitle:
    "Turn marketing decisions into CFO-defensible numbers. Rep the ratios until they are reflex.",
  homeHeadline: "Finance Tracks",
  homeLead:
    "Each track builds fluency in gross margin, contribution, and payback — the language of the owners' table.",
  starterTrackSlug: "pl-business-finance",
};
