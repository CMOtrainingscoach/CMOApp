"use client";

import { useCallback } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { Map } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardBody } from "@/components/ui/card";
import { BrainmapFlowView } from "@/components/career/identity-assessment/brainmap-flow";
import type { BrainmapBundle } from "@/lib/career/identity-assessment/schema";
import type { AssessmentSession } from "@/lib/career/identity-assessment/schema";
import type {
  ProfessorMindmapClusterRow,
  ProfessorMindmapTopicRow,
  ProfessorTopicMeta,
} from "@/lib/progress/build-universal-mindmap-bundle";

export function ProgressShell({
  mastery,
  mindmapBundle,
  identityDrawer,
  professorTopicMeta,
  professorMindmapClusters,
  professorMindmapTopics,
  cmoLife,
}: {
  mastery: React.ReactNode;
  mindmapBundle: BrainmapBundle;
  identityDrawer: Pick<AssessmentSession, "conversation" | "answers"> | null;
  professorTopicMeta: Record<string, ProfessorTopicMeta>;
  professorMindmapClusters: ProfessorMindmapClusterRow[];
  professorMindmapTopics: ProfessorMindmapTopicRow[];
  cmoLife: React.ReactNode;
}) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const tabRaw = searchParams.get("tab");
  const tab =
    tabRaw === "mindmap"
      ? "mindmap"
      : tabRaw === "cmo-life"
        ? "cmo-life"
        : "mastery";

  const setTab = useCallback(
    (v: string) => {
      if (v === "mindmap") {
        router.replace(`${pathname}?tab=mindmap`, { scroll: false });
      } else if (v === "cmo-life") {
        router.replace(`${pathname}?tab=cmo-life`, { scroll: false });
      } else {
        router.replace(pathname, { scroll: false });
      }
    },
    [pathname, router],
  );

  const empty = mindmapBundle.nodes.length === 0;

  return (
    <div className="px-6 lg:px-8 pb-12 space-y-5">
      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <TabsList className="w-full max-w-2xl flex flex-wrap h-auto gap-1 py-1">
          <TabsTrigger value="mastery">Mastery</TabsTrigger>
          <TabsTrigger value="mindmap">Memory map</TabsTrigger>
          <TabsTrigger value="cmo-life">CMO life</TabsTrigger>
        </TabsList>
        <TabsContent value="mastery" className="space-y-5 mt-5">
          {mastery}
        </TabsContent>
        <TabsContent value="mindmap" className="space-y-4 mt-5">
          <p className="text-sm text-text-muted max-w-2xl leading-relaxed">
            Career Lab identity brainmap plus Professor themes anchored to one of six pillars —
            sometimes grouped into professor-created subclusters when a chat warrants it. Each
            node stores how it links to its pillar. The durable memory index still powers live
            coaching — this map is your spatial orientation.
          </p>
          {empty ? (
            <Card>
              <CardBody className="py-10 text-center space-y-4">
                <Map className="size-10 mx-auto text-gold-400/80" />
                <p className="text-text-secondary text-sm max-w-md mx-auto leading-relaxed">
                  Nothing on the map yet. Chat with the Professor so themes can be added, or
                  complete the Executive Identity assessment in Career Lab for a structured
                  brainmap.
                </p>
                <div className="flex flex-wrap justify-center gap-3">
                  <Link
                    href="/professor"
                    className="btn-ghost px-4 py-2 text-xs uppercase tracking-wide"
                  >
                    Open Professor
                  </Link>
                  <Link
                    href="/career/identity-assessment"
                    className="btn-ghost px-4 py-2 text-xs uppercase tracking-wide text-gold-300"
                  >
                    Career Lab · Identity
                  </Link>
                </div>
              </CardBody>
            </Card>
          ) : (
            <BrainmapFlowView
              bundle={mindmapBundle}
              conversation={identityDrawer?.conversation ?? []}
              answers={identityDrawer?.answers ?? []}
              professorTopicMeta={professorTopicMeta}
              professorClusters={professorMindmapClusters}
              professorTopics={professorMindmapTopics}
            />
          )}
        </TabsContent>
        <TabsContent value="cmo-life" className="space-y-4 mt-5">
          {cmoLife}
        </TabsContent>
      </Tabs>
    </div>
  );
}
