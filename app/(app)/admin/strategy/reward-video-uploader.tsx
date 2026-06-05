"use client";

import { useRef, useTransition } from "react";
import { Loader2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { uploadModuleRewardVideo } from "./actions";

export function RewardVideoUploader({
  rewardId,
  videoUrl,
}: {
  rewardId: string;
  videoUrl: string | null;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, start] = useTransition();

  return (
    <div className="space-y-3 sm:col-span-3">
      {videoUrl ? (
        <div className="rounded-lg border border-border-subtle overflow-hidden bg-black max-w-2xl">
          <video
            className="w-full max-h-64 object-contain bg-black"
            controls
            playsInline
            preload="metadata"
            src={videoUrl}
          />
        </div>
      ) : (
        <p className="text-xs text-text-muted">
          No video yet. Upload MP4, WebM, or MOV (max 80&nbsp;MB).
        </p>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (!file) return;
          const fd = new FormData();
          fd.append("reward_id", rewardId);
          fd.append("file", file);
          start(async () => {
            await uploadModuleRewardVideo(fd);
          });
        }}
      />
      <Button
        type="button"
        variant="subtle"
        size="sm"
        disabled={pending}
        onClick={() => inputRef.current?.click()}
      >
        {pending ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Upload className="size-4" />
        )}
        {videoUrl ? "Replace video" : "Upload video"}
      </Button>
    </div>
  );
}
