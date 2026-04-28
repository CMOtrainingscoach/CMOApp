import Link from "next/link";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, FileSpreadsheet, FileImage, Upload } from "lucide-react";
import { formatBytes, timeAgo } from "@/lib/utils";

function iconFor(mime: string) {
  if (mime.includes("sheet") || mime.includes("excel")) return FileSpreadsheet;
  if (mime.includes("image")) return FileImage;
  return FileText;
}

function badgeFor(mime: string) {
  if (mime.includes("pdf")) return { label: "PDF", color: "text-danger bg-danger/10 border-danger/30" };
  if (mime.includes("sheet") || mime.includes("excel"))
    return { label: "XLSX", color: "text-success bg-success/10 border-success/30" };
  if (mime.includes("presentation")) return { label: "PPTX", color: "text-info bg-info/10 border-info/30" };
  if (mime.includes("word")) return { label: "DOCX", color: "text-info bg-info/10 border-info/30" };
  return { label: "FILE", color: "text-text-muted bg-white/5 border-white/10" };
}

export function RecentDocuments({
  docs,
}: {
  docs: { id: string; title: string; mime_type: string; size: number; created_at: string }[];
}) {
  const display =
    docs.length > 0
      ? docs.slice(0, 3)
      : [
          {
            id: "p1",
            title: "Growth Strategy Deck.pdf",
            mime_type: "application/pdf",
            size: 2.4 * 1024 * 1024,
            created_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
          },
          {
            id: "p2",
            title: "Q2 Marketing Plan.xlsx",
            mime_type:
              "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            size: 1.1 * 1024 * 1024,
            created_at: new Date(Date.now() - 26 * 3600 * 1000).toISOString(),
          },
          {
            id: "p3",
            title: "Client Brief — Project A.pdf",
            mime_type: "application/pdf",
            size: 1.8 * 1024 * 1024,
            created_at: new Date(Date.now() - 50 * 3600 * 1000).toISOString(),
          },
        ];
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <FileText className="size-3.5" /> Recent Documents
        </CardTitle>
        <Link
          href="/documents"
          className="text-[11px] tracking-[0.16em] uppercase text-text-muted hover:text-gold-300"
        >
          View All
        </Link>
      </CardHeader>
      <CardBody className="space-y-2.5">
        {display.map((d) => {
          const Icon = iconFor(d.mime_type);
          const b = badgeFor(d.mime_type);
          return (
            <div key={d.id} className="flex items-center gap-3">
              <div
                className={`flex size-9 items-center justify-center rounded-lg border ${b.color}`}
              >
                <Icon className="size-4" strokeWidth={1.6} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-text-primary truncate">
                  {d.title}
                </div>
                <div className="text-[11px] text-text-muted">
                  Uploaded {timeAgo(d.created_at)} • {formatBytes(d.size)}
                </div>
              </div>
            </div>
          );
        })}
        <Link
          href="/documents?upload=1"
          className="mt-2 flex items-center gap-3 rounded-xl border border-dashed border-border-gold/60 bg-gold-500/[0.04] px-3 py-3 hover:bg-gold-500/[0.07] transition-colors"
        >
          <div className="flex size-9 items-center justify-center rounded-lg bg-gold-500/10 text-gold-300 border border-border-gold">
            <Upload className="size-4" strokeWidth={1.6} />
          </div>
          <div className="text-sm text-gold-200 font-semibold">
            Upload new document
            <div className="text-[11px] text-text-muted font-normal mt-0.5">
              PDF, DOCX, PPTX, XLSX
            </div>
          </div>
        </Link>
      </CardBody>
    </Card>
  );
}
