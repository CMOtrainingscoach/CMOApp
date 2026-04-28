"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useDropzone } from "react-dropzone";
import { Loader2, Upload, Trash2, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { clearProfessorAvatar, uploadProfessorAvatar } from "./actions";

export function AvatarUploader({
  initialUrl,
  professorName,
}: {
  initialUrl: string | null;
  professorName: string;
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
        fd.append("file", files[0]);
        const res = await uploadProfessorAvatar(fd);
        setUrl(res.url);
        router.refresh();
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setBusy(false);
      }
    },
    [router],
  );

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    multiple: false,
    accept: {
      "image/jpeg": [".jpg", ".jpeg"],
      "image/png": [".png"],
      "image/webp": [".webp"],
    },
    maxSize: 2 * 1024 * 1024,
  });

  async function handleClear() {
    if (!url) return;
    setBusy(true);
    setError(null);
    try {
      await clearProfessorAvatar();
      setUrl(null);
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col sm:flex-row items-start gap-5">
      <div
        {...getRootProps()}
        className={cn(
          "relative size-36 rounded-2xl overflow-hidden border-2 border-dashed shrink-0 cursor-pointer transition-colors",
          isDragActive
            ? "border-gold-400 bg-gold-500/10"
            : "border-border-gold/40 bg-bg-elevated/40 hover:border-border-gold",
        )}
      >
        <input {...getInputProps()} />
        {url ? (
          <Image
            src={url}
            alt={professorName}
            fill
            sizes="144px"
            className="object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-gold-300">
            <ImageIcon className="size-7 mb-1" strokeWidth={1.4} />
            <span className="text-[10px] tracking-[0.18em] uppercase">
              Drop image
            </span>
          </div>
        )}
        {busy && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <Loader2 className="size-6 text-gold-300 animate-spin" />
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="text-[11px] tracking-[0.18em] uppercase text-gold-500 mb-1.5">
          Avatar
        </div>
        <p className="text-sm text-text-secondary leading-relaxed mb-3">
          The image used everywhere the Professor appears: dashboard portrait,
          chat header, message avatar. JPEG, PNG, or WebP. Up to 2 MB. A
          square or 4:5 portrait works best.
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
            {url ? "Replace image" : "Upload image"}
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
          <div className="mt-3 text-sm text-danger bg-danger/10 border border-danger/30 rounded-lg px-3 py-2">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
