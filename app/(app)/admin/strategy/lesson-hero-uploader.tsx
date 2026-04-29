"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useDropzone } from "react-dropzone";
import { Loader2, Upload, Trash2, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { clearLessonHeroImage, uploadLessonHeroImage } from "./actions";

export function LessonHeroUploader({
  lessonId,
  lessonTitle,
  initialUrl,
}: {
  lessonId: string;
  lessonTitle: string;
  initialUrl: string | null;
}) {
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
        fd.append("lesson_id", lessonId);
        fd.append("file", files[0]);
        const res = await uploadLessonHeroImage(fd);
        setUrl(res.url);
        router.refresh();
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setBusy(false);
      }
    },
    [lessonId, router],
  );

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    multiple: false,
    accept: {
      "image/jpeg": [".jpg", ".jpeg"],
      "image/png": [".png"],
      "image/webp": [".webp"],
    },
    maxSize: 3 * 1024 * 1024,
  });

  async function handleClear() {
    if (!url) return;
    setBusy(true);
    setError(null);
    try {
      await clearLessonHeroImage(lessonId);
      setUrl(null);
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="sm:col-span-3 rounded-xl border border-border-subtle bg-white/[0.02] p-4">
      <div className="flex flex-col sm:flex-row items-start gap-4">
        <div
          {...getRootProps()}
          className={cn(
            "relative w-full max-w-[200px] aspect-[3/4] rounded-xl overflow-hidden border-2 border-dashed shrink-0 cursor-pointer transition-colors",
            isDragActive
              ? "border-gold-400 bg-gold-500/10"
              : "border-border-gold/40 bg-bg-elevated/40 hover:border-border-gold",
          )}
        >
          <input {...getInputProps()} />
          {url ? (
            <Image
              src={url}
              alt={`Professor — ${lessonTitle}`}
              fill
              sizes="200px"
              className="object-cover object-top"
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-gold-300 px-3 text-center">
              <ImageIcon className="size-7 mb-1" strokeWidth={1.4} />
              <span className="text-[10px] tracking-[0.16em] uppercase">
                Lesson portrait
              </span>
            </div>
          )}
          {busy && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <Loader2 className="size-6 text-gold-300 animate-spin" />
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0 space-y-2">
          <div className="text-[11px] tracking-[0.18em] uppercase text-gold-500">
            Professor visual (this lesson only)
          </div>
          <p className="text-sm text-text-secondary leading-relaxed">
            Upload a portrait shown on the Strategy Lab lesson screen (theory &
            challenge). Different from the global Professor avatar — use it to
            match the narrative of this lesson. JPEG, PNG, or WebP, up to 3 MB.
            Portrait (3:4) works best.
          </p>
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
              {url ? "Replace" : "Upload"}
            </Button>
            {url && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleClear}
                disabled={busy}
              >
                <Trash2 className="size-4" /> Remove
              </Button>
            )}
          </div>
          {error && (
            <p className="text-sm text-red-400 border border-red-500/25 bg-red-500/10 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
