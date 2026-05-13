"use client";

import Link from "next/link";
import { Loader2, Search } from "lucide-react";
import { useCallback, useState } from "react";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TheoryBody } from "@/components/strategy/theory-body";

export type CareerReadyDoc = { id: string; title: string };

export type CareerJobScanResultRow = {
  url: string;
  title: string;
  posted_date: string | null;
  posted_at: string | null;
  resume_quote: string;
  stars: number;
  feedback: string;
  source_domain: string | null;
  listing_snippet: string | null;
};

function Stars({ n }: { n: number }) {
  const capped = Math.min(5, Math.max(1, Math.round(n)));
  return (
    <span className="text-gold-400 whitespace-nowrap" aria-label={`${capped} of 5`}>
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i}>{i < capped ? "★" : "☆"}</span>
      ))}
    </span>
  );
}

export function BelgiumJobScanCard({
  hasTavily,
  hasOpenAi,
  documents,
  onTrackedChange,
}: {
  hasTavily: boolean;
  hasOpenAi: boolean;
  documents: CareerReadyDoc[];
  onTrackedChange?: () => void;
}) {
  const scanEnabled = hasTavily && hasOpenAi;
  const [docId, setDocId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [overview, setOverview] = useState<string>("");
  const [disclaimer, setDisclaimer] = useState("");
  const [jobs, setJobs] = useState<CareerJobScanResultRow[]>([]);
  const [interestBusyUrl, setInterestBusyUrl] = useState<string | null>(null);

  const runScan = useCallback(async () => {
    setErr(null);
    setLoading(true);
    setOverview("");
    setJobs([]);
    setDisclaimer("");
    try {
      const res = await fetch("/api/career/job-scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeDocumentId: docId }),
      });
      const raw = (await res.json().catch(() => ({}))) as {
        error?: string;
        message?: string;
        overview?: string;
        jobs?: CareerJobScanResultRow[];
        disclaimer?: string;
      };
      if (!res.ok)
        throw new Error(raw.message ?? raw.error ?? "Scan failed");

      setOverview(raw.overview ?? "");
      setJobs(Array.isArray(raw.jobs) ? raw.jobs : []);
      setDisclaimer(raw.disclaimer ?? "");
    } catch (e) {
      setErr((e as Error).message ?? "Scan failed");
    } finally {
      setLoading(false);
    }
  }, [docId]);

  const interested = async (job: CareerJobScanResultRow) => {
    setInterestBusyUrl(job.url);
    setErr(null);
    try {
      const res = await fetch("/api/career/saved-jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listing_url: job.url,
          title: job.title,
          source_domain: job.source_domain,
          posted_at: job.posted_at ?? job.posted_date,
          listing_snippet: job.listing_snippet,
          resume_quote: job.resume_quote,
          stars: job.stars,
          professor_feedback: job.feedback,
        }),
      });
      const raw = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok)
        throw new Error(raw.error ?? "Could not save");
      onTrackedChange?.();
    } catch (e) {
      setErr((e as Error).message ?? "Save failed");
    } finally {
      setInterestBusyUrl(null);
    }
  };

  const postedDisplay = (j: CareerJobScanResultRow) => {
    if (j.posted_at) {
      try {
        return new Date(j.posted_at).toLocaleDateString(undefined, {
          year: "numeric",
          month: "short",
          day: "numeric",
        });
      } catch {
        /* fall through */
      }
    }
    if (j.posted_date) return j.posted_date.slice(0, 24);
    return "—";
  };

  return (
    <Card className="border-border-gold/25 bg-bg-elevated/20 overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex flex-wrap items-center gap-2 gap-y-1">
          <Search className="size-4 text-gold-400 shrink-0" strokeWidth={1.6} />
          Belgium marketing leadership — live scan
        </CardTitle>
        <p className="text-xs text-text-muted leading-relaxed mt-1">
          The Professor searches the web and compares hits to{" "}
          <strong>a CV you select</strong> from your Documents (Ready only). Posted
          dates come from search metadata when present; otherwise they may show as
          unknown. Verify listings on source sites — some links are login-gated.
        </p>
      </CardHeader>
      <CardBody className="space-y-4 pt-2">
        {!scanEnabled ? (
          <div className="text-sm text-text-muted border border-border-subtle rounded-xl px-3 py-2.5 bg-bg-deep/50 space-y-2">
            <p>
              The server needs{" "}
              <code className="text-gold-200/90">TAVILY_API_KEY</code> and{" "}
              <code className="text-gold-200/90">OPENAI_API_KEY</code>{" "}
              configured.
            </p>
            <p className="text-xs text-text-muted pt-1">
              After saving <code className="text-gold-200/85">.env.local</code>,
              restart <code className="text-gold-200/85">npm run dev</code>.
            </p>
            <p className="text-xs text-gold-200/80">
              Status: {hasTavily ? "Tavily ok" : "Tavily missing"} ·{" "}
              {hasOpenAi ? "OpenAI ok" : "OpenAI missing"}
            </p>
          </div>
        ) : documents.length === 0 ? (
          <p className="text-sm text-text-muted">
            No <strong>Ready</strong> documents yet. Upload a CV/PDF/DOC under{" "}
            <Link href="/documents" className="text-gold-300 underline">
              Documents
            </Link>
            , wait for Ready, then reload this page.
          </p>
        ) : (
          <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-end gap-3">
            <label className="flex flex-col gap-1 min-w-[200px] flex-1">
              <span className="text-[10px] tracking-[0.18em] uppercase text-text-muted">
                Resume / CV
              </span>
              <select
                value={docId}
                onChange={(e) => setDocId(e.target.value)}
                className="rounded-xl border border-border-subtle bg-bg-deep/70 px-3 py-2.5 text-sm text-text-primary"
              >
                <option value="">Select document…</option>
                {documents.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.title}
                  </option>
                ))}
              </select>
            </label>
            <Button
              type="button"
              variant="gold"
              disabled={loading || !docId}
              onClick={() => void runScan()}
            >
              {loading ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Scanning…
                </>
              ) : (
                <>
                  <Search className="size-4" /> Run job scan
                </>
              )}
            </Button>
            <Button type="button" variant="ghost" size="sm" asChild className="self-start sm:self-auto">
              <Link href="/professor">Open the Professor →</Link>
            </Button>
          </div>
        )}

        {err && (
          <div className="text-sm text-danger bg-danger/10 border border-danger/25 rounded-xl px-3 py-2">
            {err}
          </div>
        )}

        {overview && (
          <div className="space-y-2">
            {disclaimer ? (
              <p className="text-[11px] text-text-muted leading-relaxed italic">
                {disclaimer}
              </p>
            ) : null}
            <TheoryBody markdown={overview} />
          </div>
        )}

        {jobs.length > 0 && (
          <div className="rounded-xl border border-border-subtle overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm border-collapse">
              <thead>
                <tr className="border-b border-border-subtle text-left bg-bg-deep/35">
                  <th className="p-3 text-[10px] uppercase tracking-wider text-text-muted font-semibold w-24">
                    Posted
                  </th>
                  <th className="p-3 text-[10px] uppercase tracking-wider text-text-muted font-semibold min-w-[160px]">
                    Role / source
                  </th>
                  <th className="p-3 text-[10px] uppercase tracking-wider text-text-muted font-semibold w-36">
                    Link
                  </th>
                  <th className="p-3 text-[10px] uppercase tracking-wider text-text-muted font-semibold min-w-[180px]">
                    CV excerpt
                  </th>
                  <th className="p-3 text-[10px] uppercase tracking-wider text-text-muted font-semibold w-24">
                    Fit
                  </th>
                  <th className="p-3 text-[10px] uppercase tracking-wider text-text-muted font-semibold min-w-[200px]">
                    Professor feedback
                  </th>
                  <th className="p-3 text-[10px] uppercase tracking-wider text-text-muted font-semibold w-28">
                    Save
                  </th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((j) => (
                  <tr key={careerStableRowKey(j)} className="border-b border-border-hairline/60 align-top">
                    <td className="p-3 text-xs text-text-secondary whitespace-nowrap">
                      {postedDisplay(j)}
                    </td>
                    <td className="p-3 text-xs">
                      <div className="font-medium text-text-primary">{j.title}</div>
                      {j.source_domain && (
                        <div className="text-text-muted mt-0.5">{j.source_domain}</div>
                      )}
                    </td>
                    <td className="p-3 text-xs">
                      <a
                        href={j.url}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="text-gold-300 hover:underline break-all"
                      >
                        Open ↗
                      </a>
                    </td>
                    <td className="p-3 text-xs text-text-secondary leading-snug italic">
                      {j.resume_quote === "—" ? (
                        <span className="text-text-muted not-italic">—</span>
                      ) : (
                        <blockquote className="border-l border-gold-500/35 pl-2 my-0">
                          {j.resume_quote}
                        </blockquote>
                      )}
                    </td>
                    <td className="p-3">
                      <Stars n={j.stars} />
                    </td>
                    <td className="p-3 text-xs text-text-secondary leading-relaxed max-w-[360px]">
                      {j.feedback}
                    </td>
                    <td className="p-3">
                      <Button
                        type="button"
                        variant="subtle"
                        size="sm"
                        className="whitespace-nowrap"
                        disabled={
                          interestBusyUrl === j.url || !scanEnabled
                        }
                        onClick={() => void interested(j)}
                      >
                        {interestBusyUrl === j.url ? (
                          <Loader2 className="size-3 animate-spin" />
                        ) : (
                          "Interested"
                        )}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardBody>
    </Card>
  );
}

function careerStableRowKey(j: CareerJobScanResultRow) {
  try {
    return new URL(j.url).hostname + j.url.slice(0, 120);
  } catch {
    return j.title + j.url;
  }
}
