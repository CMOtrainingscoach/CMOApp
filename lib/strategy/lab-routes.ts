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

/** Maps DB `strategy_tracks.lab_slug` → learner-facing base path used in `app/(app)`. */
export function labContentBasePath(slug: ContentLabSlug): string {
  switch (slug) {
    case "strategy":
      return "/strategy-lab";
    case "pl":
      return "/pl-lab";
    case "lifestyle":
      return "/lifestyle";
    case "career":
      return "/career";
  }
}

/** Curriculum author UI uses query param `lab=` on `/admin/strategy`. */
export const LIFESTYLE_LAB: LabRouteBundle = {
  contentLabSlug: "lifestyle",
  basePath: "/lifestyle",
  badgeLabel: "Lifestyle Lab",
  homeSubtitle:
    "Executive performance is habits: sleep, training, presence, cadence—and compounding reps.",
  homeHeadline: "Your lifestyle tracks",
  homeLead:
    "Publish tracks from Admin → Lifestyle. Same progress, assignments, Coach hooks, and XP as Strategy Lab.",
  /** Suggestion for “starter” CTAs until you create your own first track slug in CMS */
  starterTrackSlug: "lifestyle-intro",
};

export const CAREER_LAB: LabRouteBundle = {
  contentLabSlug: "career",
  basePath: "/career",
  badgeLabel: "Career Lab",
  homeSubtitle:
    "Operator-grade CV language, interviewing fluency, and role clarity — built as tracks you can replay.",
  homeHeadline: "Career tracks",
  homeLead:
    "Publish tracks from Admin → Career Lab. Resume and job-scan tools live under Opportunities.",
  starterTrackSlug: "career-intro",
};
