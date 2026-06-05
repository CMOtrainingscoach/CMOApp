import type { Database } from "@/types/database";
import type {
  BrainmapBundle,
  BrainmapNode,
  BrainmapClusterId,
} from "@/lib/career/identity-assessment/schema";
import { brainmapBundleSchema } from "@/lib/career/identity-assessment/schema";
import { BRAINMAP_CLUSTER_DISPLAY } from "@/lib/career/identity-assessment/cluster-labels";

export type ProfessorMindmapTopicRow =
  Database["public"]["Tables"]["professor_mindmap_topics"]["Row"];

export type ProfessorMindmapClusterRow =
  Database["public"]["Tables"]["professor_mindmap_clusters"]["Row"];

const BUNDLE_MAX_NODES = 48;

function recencyWeight(isoUpdatedAt: string): number {
  const days = Math.max(
    0,
    (Date.now() - new Date(isoUpdatedAt).getTime()) / (86400 * 1000),
  );
  return Math.max(0.25, Math.min(1, 1 - days / 120));
}

function clusterTitleLookup(
  clusters: ProfessorMindmapClusterRow[],
): Map<string, string> {
  return new Map(clusters.map((c) => [c.id, c.title]));
}

export function enrichProfessorInterpretationCopy(
  row: ProfessorMindmapTopicRow,
  clusters: ProfessorMindmapClusterRow[],
): string {
  const clusterId = row.cluster_id as BrainmapClusterId;
  const pillarLabel = BRAINMAP_CLUSTER_DISPLAY[clusterId];
  const titles = clusterTitleLookup(clusters);
  const sub = row.professor_cluster_id
    ? titles.get(row.professor_cluster_id)
    : undefined;
  const note = row.anchor_link_note?.trim();
  const parts = [
    sub
      ? `Professor subgroup “${sub}” under pillar “${pillarLabel}”.`
      : `Professor topic under pillar “${pillarLabel}”.`,
    note ?? `Condensed theme the Professor tracks across sessions.`,
  ];
  return parts.filter(Boolean).join(" ");
}

function professorTopicToNode(
  row: ProfessorMindmapTopicRow,
  clusters: ProfessorMindmapClusterRow[],
): BrainmapNode {
  const nid = `pt_${row.id.replace(/-/g, "")}`;
  const clusterId = row.cluster_id as BrainmapClusterId;

  return {
    id: nid,
    label: row.title,
    kind: "signal",
    clusterId,
    weight: recencyWeight(row.updated_at),
    interpretation: enrichProfessorInterpretationCopy(row, clusters),
    recommendedAction:
      "Continue the thread in Professor chat if you want this theme sharpened further.",
    supportingQuestionIds: [],
    supportingTurnIndices: [],
    supportingSnippets: [row.recap],
    relatedNodeIds: [],
  };
}

/**
 * Merges Executive Identity brainmap nodes with Professor topic rows into one bundle.
 */
export function buildUniversalMindmapBundle(
  identityBundle: BrainmapBundle | null,
  professorTopics: ProfessorMindmapTopicRow[],
  professorClusters: ProfessorMindmapClusterRow[] = [],
): BrainmapBundle {
  const identityNodes = identityBundle?.nodes ?? [];
  const identityEdges = identityBundle?.edges ?? [];

  const profSorted = [...professorTopics].sort(
    (a, b) =>
      new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
  );

  const profNodes = profSorted.map((r) =>
    professorTopicToNode(r, professorClusters),
  );

  const capProf = Math.max(0, BUNDLE_MAX_NODES - identityNodes.length);
  const trimmedProf = profNodes.slice(0, capProf);

  const merged: BrainmapBundle = {
    nodes: [...identityNodes, ...trimmedProf],
    edges: [...identityEdges],
  };

  const parsed = brainmapBundleSchema.safeParse(merged);
  if (parsed.success) return parsed.data;
  return {
    nodes: merged.nodes.slice(0, BUNDLE_MAX_NODES),
    edges: merged.edges.slice(0, 96),
  };
}

export type ProfessorTopicMeta = {
  conversationId: string | null;
  updatedAt: string;
  anchorPillarLabel: string;
  anchorLinkNote: string | null;
  subclusterTitle: string | null;
};

export function buildProfessorTopicMetaMap(
  professorTopics: ProfessorMindmapTopicRow[],
  clusters: ProfessorMindmapClusterRow[] = [],
): Record<string, ProfessorTopicMeta> {
  const titles = clusterTitleLookup(clusters);
  const m: Record<string, ProfessorTopicMeta> = {};
  for (const row of professorTopics) {
    const nid = `pt_${row.id.replace(/-/g, "")}`;
    const clusterId = row.cluster_id as BrainmapClusterId;
    m[nid] = {
      conversationId: row.conversation_id,
      updatedAt: row.updated_at,
      anchorPillarLabel: BRAINMAP_CLUSTER_DISPLAY[clusterId],
      anchorLinkNote: row.anchor_link_note ?? null,
      subclusterTitle: row.professor_cluster_id
        ? titles.get(row.professor_cluster_id) ?? null
        : null,
    };
  }
  return m;
}
