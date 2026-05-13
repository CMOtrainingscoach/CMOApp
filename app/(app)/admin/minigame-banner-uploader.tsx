"use client";

import type { ReactNode } from "react";
import { useCallback, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useDropzone } from "react-dropzone";
import { Loader2, Trash2, Upload, ImageIcon, Puzzle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  clearPlJargonMatchHeader,
  clearStrategyJargonMatchHeader,
  uploadPlJargonMatchHeader,
  uploadStrategyJargonMatchHeader,
} from "./actions";

type Variant = "pl" | "strategy";

type Props = {
  variant: Variant;
  initialUrl: string | null;
  previewAlt: string;
  description: ReactNode;
};

/** Shared wide-banner uploader; server actions are imported here (not passed as props). */
export function MinigameBannerUploader({
  variant,
  initialUrl,
  previewAlt,
  description,
}: Props) {
  const router = useRouter();
  const [url, setUrl] = useState<string | null>(initialUrl);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback(
    async (files: File[]) => {
      if (!files.length) return;
      setError(null);
      setBusy(true);
      try {
        const fd = new FormData();
        fd.append("file", files[0]);
        const res =
          variant === "pl" ?
            await uploadPlJargonMatchHeader(fd)
          : await uploadStrategyJargonMatchHeader(fd);
        setUrl(res.url);
        router.refresh();
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setBusy(false);
      }
    },
    [router, variant],
  );

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    multiple: false,
    accept: {
      "image/jpeg": [".jpg", ".jpeg"],
      "image/png": [".png"],
      "image/webp": [".webp"],
    },
    maxSize: 4 * 1024 * 1024,
  });

  async function handleClear() {
    if (!url) return;
    setBusy(true);
    setError(null);
    try {
      if (variant === "pl") await clearPlJargonMatchHeader();
      else await clearStrategyJargonMatchHeader();
      setUrl(null);
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div
        {...getRootProps()}
        className={cn(
          "relative w-full max-w-2xl aspect-[21/9] min-h-[140px] rounded-2xl overflow-hidden border-2 border-dashed cursor-pointer transition-colors",
          isDragActive
            ? "border-gold-400 bg-gold-500/10"
            : "border-border-gold/40 bg-bg-elevated/40 hover:border-border-gold",
        )}
      >
        <input {...getInputProps()} />
        {url ? (
          <>
            <Image
              src={url}
              alt={previewAlt}
              fill
              sizes="(max-width: 672px) 100vw, 672px"
              className="object-cover object-[center_35%]"
            />
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                backgroundImage:
                  "linear-gradient(180deg, transparent 55%, rgba(10,10,10,0.55) 100%)",
              }}
            />
          </>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-gold-300">
            <Puzzle className="size-8 opacity-70" strokeWidth={1.2} />
            <ImageIcon className="size-6 opacity-70" strokeWidth={1.2} />
            <span className="text-[10px] tracking-[0.18em] uppercase">
              Drop wide banner · 21∶9-ish
            </span>
          </div>
        )}
        {busy && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-[1]">
            <Loader2 className="size-7 text-gold-300 animate-spin" />
          </div>
        )}
      </div>

      <div className="min-w-0 max-w-2xl">
        <div className="flex items-center gap-2 text-[11px] tracking-[0.18em] uppercase text-gold-500 mb-1.5">
          <Puzzle className="size-3.5" /> Header image
        </div>
        <div className="text-sm text-text-secondary leading-relaxed mb-3">
          {description}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              open();
            }}
            disabled={busy}
            size="sm"
          >
            {busy ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Upload className="size-4" />
            )}
            {url ? "Replace banner" : "Upload banner"}
          </Button>
          {url && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => void handleClear()}
              disabled={busy}
            >
              <Trash2 className="size-4" /> Remove
            </Button>
          )}
        </div>
        {error && (
          <div className="mt-3 text-sm text-danger bg-danger/10 border border-danger/30 rounded-lg px-3 py-2">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
