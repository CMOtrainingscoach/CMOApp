/**
 * Product chrome for white-label / template forks.
 * Uses NEXT_PUBLIC_* so values are available on both server and client without prop-drilling.
 */
export const siteConfig = {
  /** Short mark next to / above the monogram (e.g. ME, LAB, ∞) */
  mark: (
    process.env.NEXT_PUBLIC_APP_MARK ?? "ME"
  ).trim(),
  /** Full product title (browser tab, metadata) */
  name: (
    process.env.NEXT_PUBLIC_APP_NAME ?? "CMO Ascension Mode"
  ).trim(),
  /** One-line meta description */
  description: (
    process.env.NEXT_PUBLIC_APP_DESCRIPTION ??
    "Your personal professor and executive coach. Discipline today. Freedom tomorrow."
  ).trim(),
  /** Canonical URL for OG / emails (optional) */
  url: (
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
  ).trim(),
};
