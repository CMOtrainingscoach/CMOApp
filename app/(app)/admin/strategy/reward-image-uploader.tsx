"use client";

import { useRef, useTransition } from "react";
import { Loader2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { uploadModuleRewardImage } from "./actions";

export function RewardImageUploader({
  rewardId,
  imageUrl,
}: {
  rewardId: string;
  imageUrl: string | null;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, start] = useTransition();

  return (
    <div className="space-y-3 sm:col-span-3">
      {imageUrl ? (
        <div className="rounded-lg border border-border-subtle overflow-hidden bg-black/40 max-w-md">
          {/* eslint-disable-next-line @next/next/no-img-element -- public Supabase URL */}
          <img
            src={imageUrl}
            alt="Reward preview"
            className="w-full h-auto max-h-64 object-contain"
          />
        </div>
      ) : (
        <p className="text-xs text-text-muted">
          No image yet. Upload JPEG, PNG, or WebP (max 5&nbsp;MB).
        </p>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (!file) return;
          const fd = new FormData();
          fd.append("reward_id", rewardId);
          fd.append("file", file);
          start(async () => {
            await uploadModuleRewardImage(fd);
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
        {imageUrl ? "Replace image" : "Upload image"}
      </Button>
    </div>
  );
}
