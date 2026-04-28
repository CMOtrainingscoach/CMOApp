"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { useRouter } from "next/navigation";
import {
  FileText,
  FileSpreadsheet,
  Upload,
  Loader2,
  Trash2,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Clock,
} from "lucide-react";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn, formatBytes, timeAgo } from "@/lib/utils";
import { deleteDocument } from "./actions";

type Doc = {
  id: string;
  title: string;
  file_path: string;
  mime_type: string;
  size: number;
  status: string;
  summary: string | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  key_insights: any;
  created_at: string;
};

const STATUS_META: Record<
  string,
  { label: string; color: string; icon: React.ComponentType<{ className?: string }> }
> = {
  uploaded: { label: "Queued", color: "text-text-muted", icon: Clock },
  processing: { label: "Processing", color: "text-gold-300", icon: Loader2 },
  ready: { label: "Ready", color: "text-success", icon: CheckCircle2 },
  failed: { label: "Failed", color: "text-danger", icon: AlertCircle },
};

function iconFor(mime: string, ext: string) {
  if (mime.includes("sheet") || mime.includes("excel") || ext === "xlsx" || ext === "csv")
    return FileSpreadsheet;
  return FileText;
}

export function DocumentsWorkspace({ docs }: { docs: Doc[] }) {
  const router = useRouter();
  const [uploading, setUploading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback(
    async (files: File[]) => {
      setError(null);
      for (const file of files) {
        setUploading(file.name);
        try {
          const form = new FormData();
          form.append("file", file);
          const res = await fetch("/api/documents/upload", {
            method: "POST",
            body: form,
          });
          if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error ?? "upload failed");
          }
        } catch (e) {
          setError((e as Error).message);
        }
      }
      setUploading(null);
      router.refresh();
      // Poll for status updates a few times
      let attempts = 0;
      const tick = () => {
        attempts += 1;
        router.refresh();
        if (attempts < 8) setTimeout(tick, 3000);
      };
      setTimeout(tick, 4000);
    },
    [router],
  );

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    multiple: true,
    accept: {
      "application/pdf": [".pdf"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
        [".docx"],
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
        [".xlsx"],
      "application/vnd.openxmlformats-officedocument.presentationml.presentation":
        [".pptx"],
      "text/csv": [".csv"],
      "text/plain": [".txt", ".md"],
    },
  });

  return (
    <div className="space-y-5">
      <Card>
        <div
          {...getRootProps()}
          className={cn(
            "p-8 lg:p-10 rounded-2xl border-2 border-dashed transition-colors cursor-pointer",
            isDragActive
              ? "border-gold-400 bg-gold-500/[0.06]"
              : "border-border-gold/40 bg-bg-elevated/30 hover:border-border-gold",
          )}
        >
          <input {...getInputProps()} />
          <div className="flex flex-col items-center text-center">
            <div className="size-14 rounded-2xl bg-gradient-gold-soft border border-border-gold flex items-center justify-center mb-4">
              {uploading ? (
                <Loader2 className="size-6 text-gold-300 animate-spin" />
              ) : (
                <Upload className="size-6 text-gold-300" strokeWidth={1.6} />
              )}
            </div>
            <h3 className="font-display text-2xl mb-1.5">
              {uploading
                ? `Uploading ${uploading}…`
                : "Drop a document for the Professor to review"}
            </h3>
            <p className="text-sm text-text-muted mb-4 max-w-md">
              PDF, DOCX, XLSX, PPTX, CSV, TXT • Up to 25 MB. Strategies,
              client briefs, campaign reports, business cases.
            </p>
            <Button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                open();
              }}
              disabled={!!uploading}
            >
              {uploading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Upload className="size-4" />
              )}
              Choose file
            </Button>
            {error && (
              <div className="mt-4 text-sm text-danger bg-danger/10 border border-danger/30 rounded-lg px-3 py-2">
                {error}
              </div>
            )}
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            <FileText className="size-3.5" /> Your Documents
          </CardTitle>
          <span className="text-[11px] tracking-[0.16em] uppercase text-text-muted">
            {docs.length} total
          </span>
        </CardHeader>
        <CardBody className="space-y-2.5">
          {docs.length === 0 && (
            <div className="text-sm text-text-muted py-6 text-center">
              No documents yet. Upload your first strategy to begin.
            </div>
          )}
          {docs.map((d) => {
            const ext = d.title.split(".").pop()?.toLowerCase() ?? "";
            const Icon = iconFor(d.mime_type, ext);
            const meta =
              STATUS_META[d.status] ?? STATUS_META.uploaded;
            const StatusIcon = meta.icon;
            return (
              <div
                key={d.id}
                className="rounded-xl border border-border-subtle bg-bg-elevated/40 p-4"
              >
                <div className="flex items-start gap-3">
                  <div className="flex size-10 items-center justify-center rounded-lg bg-gold-500/8 border border-border-subtle text-gold-300 shrink-0">
                    <Icon className="size-5" strokeWidth={1.6} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm font-semibold text-text-primary truncate">
                        {d.title}
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span
                          className={`inline-flex items-center gap-1.5 text-[11px] tracking-[0.16em] uppercase ${meta.color}`}
                        >
                          <StatusIcon
                            className={cn(
                              "size-3.5",
                              d.status === "processing" && "animate-spin",
                            )}
                          />
                          {meta.label}
                        </span>
                        <button
                          onClick={() => {
                            void deleteDocument(d.id).then(() =>
                              router.refresh(),
                            );
                          }}
                          className="size-7 rounded-md border border-border-hairline hover:border-danger/50 flex items-center justify-center text-text-muted hover:text-danger"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    </div>
                    <div className="text-[11px] text-text-muted mt-0.5">
                      {timeAgo(d.created_at)} • {formatBytes(d.size)} •{" "}
                      {ext.toUpperCase()}
                    </div>
                    {d.summary && (
                      <p className="mt-3 text-sm text-text-secondary leading-relaxed">
                        {d.summary}
                      </p>
                    )}
                    {Array.isArray(d.key_insights) && d.key_insights.length > 0 && (
                      <div className="mt-3">
                        <div className="text-[10px] tracking-[0.18em] uppercase text-gold-500 mb-1.5 flex items-center gap-1.5">
                          <Sparkles className="size-3" /> Key insights
                        </div>
                        <ul className="space-y-1">
                          {(d.key_insights as string[]).map((s, i) => (
                            <li
                              key={i}
                              className="flex gap-2 text-sm text-text-secondary"
                            >
                              <span className="text-gold-400 shrink-0">›</span>
                              <span>{s}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </CardBody>
      </Card>
    </div>
  );
}
