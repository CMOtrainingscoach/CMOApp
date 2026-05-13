"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Briefcase, Loader2, Trash2 } from "lucide-react";
import { useCallback, useState } from "react";
import { TrackComingSoon } from "@/components/shell/track-coming-soon";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BelgiumJobScanCard, type CareerReadyDoc } from "./belgium-job-scan-card";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export type CareerSavedJobView = {
  id: string;
  listing_url: string;
  title: string;
  source_domain: string | null;
  posted_at: string | null;
  stars: number;
  professor_feedback: string | null;
};

function starsRow(n: number) {
  const capped = Math.min(5, Math.max(1, Math.round(n)));
  return Array.from({ length: 5 }, (_, i) => (i < capped ? "★" : "☆")).join("");
}

export function CareerWorkbench({
  hasTavily,
  hasOpenAi,
  documents,
  savedJobs,
}: {
  hasTavily: boolean;
  hasOpenAi: boolean;
  documents: CareerReadyDoc[];
  savedJobs: CareerSavedJobView[];
}) {
  const router = useRouter();
  const [tab, setTab] = useState("overview");
  const [removingId, setRemovingId] = useState<string | null>(null);

  const onTrackedChange = useCallback(() => {
    router.refresh();
  }, [router]);

  const remove = async (id: string) => {
    setRemovingId(id);
    try {
      const res = await fetch(`/api/career/saved-jobs?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Remove failed");
      onTrackedChange();
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <div className="px-6 lg:px-8 pb-12">
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="w-full grid grid-cols-2 sm:inline-flex mb-6">
          <TabsTrigger value="overview">Overview &amp; scan</TabsTrigger>
          <TabsTrigger value="tracked">
            Tracked roles{" "}
            <span className="text-text-muted normal-case mx-1">({savedJobs.length})</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <TrackComingSoon
            iconKey="briefcase"
            pillar="Pillar 07 / Career"
            title="Career & Personal Brand"
            tagline="The CMO seat goes to the operator who shows up early."
            description="A career-acceleration workspace: positioning your CV, writing in executive voice, building a personal brand that signals CMO altitude, and turning every interview into a strategic conversation."
            outcomes={[
              "Rewrite your CV to land in CMO and VP of Marketing shortlists.",
              "Build a LinkedIn presence that compounds inbound opportunities.",
              "Turn interviews into board-level strategic conversations.",
              "Negotiate compensation, scope, and equity like a professional.",
            ]}
            modules={[
              { title: "Executive Resume", sub: "Outcomes, P&L, leadership scope." },
              { title: "LinkedIn as Engine", sub: "Position, narrative, and cadence." },
              { title: "Interview Mastery", sub: "Strategic case work, not Q&A ping-pong." },
              { title: "Compensation", sub: "Base, bonus, equity — and how to ask." },
            ]}
            feature={
              <BelgiumJobScanCard
                hasTavily={hasTavily}
                hasOpenAi={hasOpenAi}
                documents={documents}
                onTrackedChange={() => {
                  setTab("tracked");
                  onTrackedChange();
                }}
              />
            }
          />
        </TabsContent>

        <TabsContent value="tracked">
          <Card className="border-border-subtle">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Briefcase className="size-4 text-gold-400" strokeWidth={1.5} />{" "}
                Tracked roles
              </CardTitle>
              <p className="text-xs text-text-muted">
                Rows you marked <strong>Interested</strong> on the scan. Open links
                to verify before applying.
              </p>
            </CardHeader>
            <CardBody className="pt-2">
              {savedJobs.length === 0 ? (
                <p className="text-sm text-text-muted py-6">
                  Nothing saved yet. Run a scan and click{" "}
                  <strong className="text-text-secondary">Interested</strong> on a row.
                </p>
              ) : (
                <div className="rounded-xl border border-border-subtle overflow-x-auto">
                  <table className="w-full min-w-[640px] text-sm border-collapse">
                    <thead>
                      <tr className="border-b border-border-subtle text-left bg-bg-deep/35">
                        <th className="p-3 text-[10px] uppercase tracking-wider text-text-muted">Posted</th>
                        <th className="p-3 text-[10px] uppercase tracking-wider text-text-muted">
                          Role
                        </th>
                        <th className="p-3 text-[10px] uppercase tracking-wider text-text-muted">Fit</th>
                        <th className="p-3 text-[10px] uppercase tracking-wider text-text-muted">Note</th>
                        <th className="p-3 w-12" aria-label="Remove" />
                      </tr>
                    </thead>
                    <tbody>
                      {savedJobs.map((r) => (
                        <tr
                          key={r.id}
                          className="border-b border-border-hairline/60 align-top"
                        >
                          <td className="p-3 text-xs text-text-secondary whitespace-nowrap">
                            {r.posted_at
                              ? new Date(r.posted_at).toLocaleDateString(undefined, {
                                  year: "numeric",
                                  month: "short",
                                  day: "numeric",
                                })
                              : "—"}
                          </td>
                          <td className="p-3 text-xs max-w-[280px]">
                            <div className="font-medium text-text-primary">{r.title}</div>
                            <div className="text-text-muted mt-1">{r.source_domain}</div>
                            <Link
                              href={r.listing_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-gold-300 hover:underline inline-block mt-1"
                            >
                              Open listing ↗
                            </Link>
                          </td>
                          <td className="p-3 text-gold-400 whitespace-nowrap text-xs">
                            {starsRow(r.stars)}
                          </td>
                          <td className="p-3 text-xs text-text-secondary max-w-[360px]">
                            {r.professor_feedback ?? "—"}
                          </td>
                          <td className="p-3">
                            <button
                              type="button"
                              aria-label={`Remove ${r.title}`}
                              disabled={removingId === r.id}
                              onClick={() => void remove(r.id)}
                              className="size-9 rounded-lg border border-border-hairline flex items-center justify-center text-text-muted hover:text-danger hover:border-danger/40"
                            >
                              {removingId === r.id ? (
                                <Loader2 className="size-4 animate-spin" />
                              ) : (
                                <Trash2 className="size-4" />
                              )}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardBody>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
