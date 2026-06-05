"use client";

import { MinigameBannerUploader } from "./minigame-banner-uploader";

export function PlSheetDrillHeaderUploader({
  initialUrl,
}: {
  initialUrl: string | null;
}) {
  return (
    <MinigameBannerUploader
      variant="plSheetDrill"
      initialUrl={initialUrl}
      previewAlt="P&L sheet drill header banner"
      description={
        <>
          Shown at the top of the{" "}
          <span className="text-gold-300/90">P&amp;L sheet drill</span> screen (
          <code className="text-[11px] text-gold-200/80">/pl-lab/pl-sheet-drill</code>
          ). Use a cinematic wide crop (JPEG, PNG, or WebP, up to 4 MB).
        </>
      }
    />
  );
}
