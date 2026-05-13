"use client";

import { MinigameBannerUploader } from "./minigame-banner-uploader";

export function PlJargonMatchHeaderUploader({
  initialUrl,
}: {
  initialUrl: string | null;
}) {
  return (
    <MinigameBannerUploader
      variant="pl"
      initialUrl={initialUrl}
      previewAlt="P&L jargon matchup header banner"
      description={
        <>
          Shown at the top of the standalone{" "}
          <span className="text-gold-300/90">P&L jargon matchup</span> screen (
          <code className="text-[11px] text-gold-200/80">/pl-lab/jargon-match</code>
          ). Use a cinematic wide crop (JPEG, PNG, or WebP, up to 4 MB).
        </>
      }
    />
  );
}
