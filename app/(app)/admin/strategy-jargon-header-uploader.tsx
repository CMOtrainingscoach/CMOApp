"use client";

import { MinigameBannerUploader } from "./minigame-banner-uploader";

export function StrategyJargonMatchHeaderUploader({
  initialUrl,
}: {
  initialUrl: string | null;
}) {
  return (
    <MinigameBannerUploader
      variant="strategy"
      initialUrl={initialUrl}
      previewAlt="Strategy Lab marketing jargon matchup header banner"
      description={
        <>
          Shown at the top of the{" "}
          <span className="text-gold-300/90">Marketing jargon matchup</span> in Strategy Lab
          Practice (
          <code className="text-[11px] text-gold-200/80">
            /strategy-lab/jargon-match
          </code>
          ). Same wide format as the P&amp;L desk (JPEG, PNG, or WebP, up to 4 MB).
        </>
      }
    />
  );
}
