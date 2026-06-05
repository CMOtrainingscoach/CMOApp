"use client";

import "@xyflow/react/dist/style.css";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Background,
  Controls,
  Handle,
  MarkerType,
  Panel,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  type Edge,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import type {
  BrainmapBundle,
  BrainmapNode as BrainmapDatum,
} from "@/lib/career/identity-assessment/schema";
import {
  BRAINMAP_CLUSTER_IDS,
  type BrainmapClusterId,
} from "@/lib/career/identity-assessment/schema";
import { BRAINMAP_CLUSTER_DISPLAY } from "@/lib/career/identity-assessment/cluster-labels";
import type { AssessmentSession } from "@/lib/career/identity-assessment/schema";
import Link from "next/link";
import { X } from "lucide-react";
import type {
  ProfessorMindmapClusterRow,
  ProfessorMindmapTopicRow,
  ProfessorTopicMeta,
} from "@/lib/progress/build-universal-mindmap-bundle";
import { professorTopicNodeId } from "@/lib/progress/mindmap-slug";

type ThemeData = {
  label: string;
  weight: number;
  datum: BrainmapDatum;
};

const handleClass =
  "!w-2 !h-2 !min-h-0 !min-w-0 !border-0 !bg-gold-400/40 !opacity-0";

function BrainmapInsightNode(props: NodeProps<Node<ThemeData>>) {
  const scale = 0.75 + props.data.weight * 0.9;
  return (
    <div
      className={`relative rounded-xl border px-3 py-2 shadow-sm bg-panel/95 backdrop-blur-sm text-left min-w-[120px] max-w-[220px] ${
        props.selected
          ? "border-gold-500 ring-1 ring-gold-500/40"
          : "border-border hover:border-gold-500/30"
      }`}
      style={{ transform: `scale(${scale})` }}
    >
      {/* React Flow requires handles on custom nodes for edges; keep visually hidden (not display:none). */}
      <Handle type="target" position={Position.Top} className={handleClass} />
      <Handle type="source" position={Position.Bottom} className={handleClass} />
      <p className="text-[11px] uppercase tracking-wide text-text-muted mb-1">
        {props.data.datum.kind.replace(/_/g, " ")}
      </p>
      <p className="text-xs font-medium text-foreground leading-snug">
        {props.data.label}
      </p>
    </div>
  );
}

function ProfessorSubgroupFrame(props: NodeProps<Node<{ title: string }>>) {
  return (
    <div className="relative h-full w-full rounded-lg border border-border-gold/40 bg-black/[0.18] box-border">
      <div className="pointer-events-none absolute left-2 top-1.5 right-2 text-[10px] font-medium uppercase tracking-wide text-gold-400/90 truncate leading-tight">
        {props.data.title}
      </div>
    </div>
  );
}

const nodeTypes = {
  brainmapInsight: BrainmapInsightNode,
  professorSubgroup: ProfessorSubgroupFrame,
};

function buildElements(
  bundle: BrainmapBundle,
  expanded: Record<BrainmapClusterId, boolean>,
  professorLayout?: {
    clusters: ProfessorMindmapClusterRow[];
    topics: ProfessorMindmapTopicRow[];
  },
): { nodes: Node[]; edges: Edge[] } {
  const datumById = new Map(bundle.nodes.map((n) => [n.id, n]));

  const nodes: Node[] = [];
  const edges: Edge[] = [];
  const CLUSTER_W = 360;
  const COL_GAP = 40;
  const INNER_MARGIN = 8;
  const HEADER_H = 36;
  const ROW = 780;
  const innerGap = 12;
  const childApproxH = 56;
  const SUB_TOP_PAD = 34;
  const SECTION_GAP = 10;

  let col = 0;
  let row = 0;

  function placeInsightNode(opts: {
    datum: BrainmapDatum;
    parentId: string;
    indexInSection: number;
    ySectionStart: number;
    groupInnerWidth: number;
    hidden: boolean;
  }) {
    const { datum, parentId, indexInSection, ySectionStart, groupInnerWidth, hidden } =
      opts;
    const layoutX = datum.x ?? 22;
    const layoutY =
      datum.y ?? ySectionStart + indexInSection * (childApproxH + innerGap);
    nodes.push({
      id: datum.id,
      type: "brainmapInsight",
      parentId,
      extent: "parent",
      draggable: false,
      position: {
        x: layoutX % (groupInnerWidth - 40),
        y: layoutY,
      },
      hidden,
      selectable: true,
      data: {
        label: datum.label,
        weight: datum.weight,
        datum,
      },
    });
  }

  for (const clusterId of BRAINMAP_CLUSTER_IDS) {
    const pillarNodes = bundle.nodes.filter((n) => n.clusterId === clusterId);
    if (pillarNodes.length === 0) continue;

    const bundleIdsHere = new Set(pillarNodes.map((n) => n.id));

    const topicRowsHere =
      professorLayout?.topics.filter(
        (r) =>
          r.cluster_id === clusterId &&
          bundleIdsHere.has(professorTopicNodeId(r.id)),
      ) ?? [];

    const clustersHere =
      professorLayout?.clusters
        .filter((c) => c.anchor_cluster_id === clusterId)
        .sort(
          (a, b) =>
            new Date(b.updated_at).getTime() -
            new Date(a.updated_at).getTime(),
        ) ?? [];

    const rowByPt = new Map(
      topicRowsHere.map((r) => [professorTopicNodeId(r.id), r]),
    );

    const identityItems = pillarNodes.filter((n) => !n.id.startsWith("pt_"));
    const nestProfessorTopics = topicRowsHere.some(
      (t) => t.professor_cluster_id != null,
    );

    const isOpen = expanded[clusterId] ?? true;
    const clusterNodeId = `cluster_${clusterId}`;
    const x = col * (CLUSTER_W + COL_GAP);
    const y = row * ROW;

    const innerW = CLUSTER_W - INNER_MARGIN * 2;

    let groupH = HEADER_H + 24;
    if (isOpen) {
      if (!nestProfessorTopics) {
        const items = pillarNodes;
        groupH =
          HEADER_H +
          (items.length > 0 ? items.length * (childApproxH + innerGap) + 28 : 20);
      } else {
        let cursorY = HEADER_H + 12;

        const identitySectionH =
          identityItems.length > 0
            ? identityItems.length * (childApproxH + innerGap) + SECTION_GAP
            : 0;
        cursorY += identitySectionH;

        const subGroups = clustersHere
          .map((c) => {
            const rows = topicRowsHere
              .filter((tr) => tr.professor_cluster_id === c.id)
              .sort(
                (a, b) =>
                  new Date(b.updated_at).getTime() -
                  new Date(a.updated_at).getTime(),
              );
            const datums = rows
              .map((tr) => datumById.get(professorTopicNodeId(tr.id)))
              .filter((d): d is BrainmapDatum => d !== undefined);
            return { clusterRow: c, datums };
          })
          .filter((g) => g.datums.length > 0);

        for (const g of subGroups) {
          const subH =
            SUB_TOP_PAD + g.datums.length * (childApproxH + innerGap) + 12;
          cursorY += subH + SECTION_GAP;
        }

        const orphanedProfDatums = pillarNodes.filter((n) => {
          if (!n.id.startsWith("pt_")) return false;
          const tr = rowByPt.get(n.id);
          return tr != null && tr.professor_cluster_id == null;
        });

        cursorY +=
          orphanedProfDatums.length * (childApproxH + innerGap);

        groupH = cursorY + 28;
      }
    }

    nodes.push({
      id: clusterNodeId,
      type: "group",
      position: { x, y },
      data: { label: BRAINMAP_CLUSTER_DISPLAY[clusterId] },
      style: {
        width: CLUSTER_W,
        height: Math.max(groupH, HEADER_H + 16),
        padding: 0,
      },
      className:
        "!bg-background/35 !border-border/80 rounded-xl overflow-visible backdrop-blur",
    });

    const hiddenChildren = !isOpen;

    if (isOpen && !nestProfessorTopics) {
      const itemsSorted = [...identityItems];
      pillarNodes.forEach((n) => {
        if (n.id.startsWith("pt_")) itemsSorted.push(n);
      });

      itemsSorted.forEach((datum, idx) => {
        placeInsightNode({
          datum,
          parentId: clusterNodeId,
          indexInSection: idx,
          ySectionStart: HEADER_H + 8,
          groupInnerWidth: innerW,
          hidden: hiddenChildren,
        });
      });
    } else if (isOpen && nestProfessorTopics) {
      let yCursor = HEADER_H + 10;

      identityItems.forEach((datum, idx) => {
        placeInsightNode({
          datum,
          parentId: clusterNodeId,
          indexInSection: idx,
          ySectionStart: yCursor,
          groupInnerWidth: innerW,
          hidden: hiddenChildren,
        });
      });
      if (identityItems.length > 0) {
        yCursor += identityItems.length * (childApproxH + innerGap) + SECTION_GAP;
      }

      const subGroups = clustersHere
        .map((c) => {
          const rows = topicRowsHere
            .filter((tr) => tr.professor_cluster_id === c.id)
            .sort(
              (a, b) =>
                new Date(b.updated_at).getTime() -
                new Date(a.updated_at).getTime(),
            );
          const datums = rows
            .map((tr) => datumById.get(professorTopicNodeId(tr.id)))
            .filter((d): d is BrainmapDatum => d !== undefined);
          return { clusterRow: c, datums };
        })
        .filter((g) => g.datums.length > 0);

      for (const g of subGroups) {
        const subH =
          SUB_TOP_PAD + g.datums.length * (childApproxH + innerGap) + 10;
        const subId = `pcl_${g.clusterRow.id}`;
        nodes.push({
          id: subId,
          type: "professorSubgroup",
          parentId: clusterNodeId,
          extent: "parent",
          draggable: false,
          position: { x: INNER_MARGIN, y: yCursor },
          style: {
            width: CLUSTER_W - INNER_MARGIN * 2,
            height: subH,
          },
          hidden: hiddenChildren,
          selectable: false,
          data: { title: g.clusterRow.title },
        });

        g.datums.forEach((datum, idx) => {
          placeInsightNode({
            datum,
            parentId: subId,
            indexInSection: idx,
            ySectionStart: SUB_TOP_PAD,
            groupInnerWidth: innerW - 8,
            hidden: hiddenChildren,
          });
        });
        yCursor += subH + SECTION_GAP;
      }

      const orphanedProfDatums = pillarNodes.filter((n) => {
        if (!n.id.startsWith("pt_")) return false;
        const tr = rowByPt.get(n.id);
        return tr != null && tr.professor_cluster_id == null;
      });

      orphanedProfDatums.forEach((datum, idx) => {
        placeInsightNode({
          datum,
          parentId: clusterNodeId,
          indexInSection: idx,
          ySectionStart: yCursor,
          groupInnerWidth: innerW,
          hidden: hiddenChildren,
        });
      });
    }

    col += 1;
    if (col >= 2) {
      col = 0;
      row += 1;
    }
  }

  const ids = new Set(nodes.map((n) => n.id));
  for (const e of bundle.edges) {
    if (!ids.has(e.source) || !ids.has(e.target)) continue;
    const sa = bundle.nodes.find((n) => n.id === e.source);
    const ta = bundle.nodes.find((n) => n.id === e.target);
    if (!sa || !ta) continue;
    const visible =
      (expanded[sa.clusterId] ?? true) && (expanded[ta.clusterId] ?? true);
    edges.push({
      id: e.id,
      source: e.source,
      target: e.target,
      label: e.relation,
      hidden: !visible,
      animated: false,
      style: {
        strokeWidth: 1 + (e.strength ?? 0.3) * 2,
      },
      markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16 },
    });
  }

  return { nodes, edges };
}

function InnerBrainmapFlow({
  bundle,
  conversation,
  answers,
  professorTopicMeta,
  professorClusters = [],
  professorTopics = [],
}: {
  bundle: BrainmapBundle;
  conversation: AssessmentSession["conversation"];
  answers: AssessmentSession["answers"];
  professorTopicMeta?: Record<string, ProfessorTopicMeta>;
  professorClusters?: ProfessorMindmapClusterRow[];
  professorTopics?: ProfessorMindmapTopicRow[];
}) {
  const [expanded, setExpanded] = useState<
    Record<BrainmapClusterId, boolean>
  >(() =>
    Object.fromEntries(
      BRAINMAP_CLUSTER_IDS.map((id) => [id, true]),
    ) as Record<BrainmapClusterId, boolean>,
  );

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  useEffect(() => {
    const layout =
      professorClusters.length || professorTopics.length
        ? {
            clusters: professorClusters,
            topics: professorTopics,
          }
        : undefined;
    const fresh = buildElements(bundle, expanded, layout);
    setNodes(fresh.nodes);
    setEdges(fresh.edges);
  }, [
    bundle,
    expanded,
    professorClusters,
    professorTopics,
    setNodes,
    setEdges,
  ]);

  const [selected, setSelected] = useState<BrainmapDatum | null>(null);

  const onNodeClick = useCallback((_e: React.MouseEvent, n: Node) => {
    if (n.type === "brainmapInsight" && (n.data as ThemeData)?.datum)
      setSelected((n.data as ThemeData).datum);
  }, []);

  const clustersPresent = useMemo(() => {
    const s = new Set(bundle.nodes.map((n) => n.clusterId));
    return BRAINMAP_CLUSTER_IDS.filter((id) => s.has(id));
  }, [bundle.nodes]);

  return (
    <div className="h-[620px] w-full rounded-xl border border-border bg-background/60 relative">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        nodeTypes={nodeTypes}
        fitView
        minZoom={0.4}
        maxZoom={1.35}
      >
        <Background gap={22} />
        <Controls />
        <Panel position="top-left" className="max-w-[min(100%-1rem,360px)]">
          <div className="rounded-lg border border-border bg-panel/95 p-2 text-[11px] text-text-secondary space-y-1">
            <p className="font-medium text-foreground uppercase tracking-wide">
              Clusters
            </p>
            <div className="flex flex-wrap gap-1">
              {clustersPresent.map((cid) => (
                <button
                  key={cid}
                  type="button"
                  className={`rounded px-2 py-1 border ${
                    expanded[cid]
                      ? "border-gold-500/45 bg-gold-500/10"
                      : "border-border hover:border-border-gold"
                  }`}
                  onClick={() =>
                    setExpanded((e) => ({ ...e, [cid]: !e[cid] }))
                  }
                >
                  {expanded[cid] ? "− " : "+ "}
                  {BRAINMAP_CLUSTER_DISPLAY[cid]}
                </button>
              ))}
            </div>
          </div>
        </Panel>
      </ReactFlow>

      {selected && (
        <BrainmapDrawer
          node={selected}
          conversation={conversation}
          answers={answers}
          lookup={bundle.nodes}
          professorTopicMeta={professorTopicMeta}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}

function ProfessorTopicDrawer({
  node,
  meta,
  onClose,
}: {
  node: BrainmapDatum;
  meta: ProfessorTopicMeta | undefined;
  onClose: () => void;
}) {
  return (
    <aside className="absolute inset-y-4 right-4 z-[20] w-[min(100%-2rem,380px)] flex flex-col rounded-xl border border-border bg-panel shadow-2xl">
      <div className="flex items-start gap-3 border-b border-border p-4">
        <div className="flex-1 min-w-0">
          <p className="text-xs uppercase tracking-wide text-text-muted">
            Professor chat ·{" "}
            {node.kind.replace(/_/g, " ")}
          </p>
          <h3 className="font-display text-lg gold-text leading-tight mt-1">
            {node.label}
          </h3>
        </div>
        <button
          type="button"
          className="btn-ghost p-1 rounded-lg shrink-0"
          onClick={onClose}
          aria-label="Close"
        >
          <X className="size-4" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-5 text-sm">
        <section>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-text-muted mb-2">
            Recap
          </h4>
          <p className="text-text-secondary leading-relaxed whitespace-pre-wrap">
            {(node.supportingSnippets[0] ?? "").trim()}
          </p>
        </section>
        {meta?.subclusterTitle ? (
          <section>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-text-muted mb-2">
              Professor subgroup
            </h4>
            <p className="text-text-secondary leading-relaxed">
              {meta.subclusterTitle}
            </p>
            <p className="text-[11px] text-text-muted mt-2 leading-relaxed">
              Subgroups are created from your Professor chats and sit under one of the six pillars.
            </p>
          </section>
        ) : null}
        <section>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-text-muted mb-2">
            Pillar anchor
          </h4>
          <p className="text-text-secondary leading-relaxed">
            {meta?.anchorPillarLabel ?? "Executive identity pillar"}
          </p>
        </section>
        {(meta?.anchorLinkNote?.trim()?.length ?? 0) > 0 ? (
          <section>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-text-muted mb-2">
              How it links
            </h4>
            <p className="text-text-secondary leading-relaxed whitespace-pre-wrap">
              {meta!.anchorLinkNote}
            </p>
          </section>
        ) : null}
        <section>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-text-muted mb-2">
            Map framing
          </h4>
          <p className="text-text-secondary leading-relaxed">
            {node.interpretation}
          </p>
        </section>
        {meta?.updatedAt ? (
          <p className="text-[11px] text-text-muted uppercase tracking-wide">
            Updated {new Date(meta.updatedAt).toLocaleString()}
          </p>
        ) : null}
        <div className="pt-2 border-t border-border">
          <Link
            href="/professor"
            className="text-xs tracking-[0.14em] uppercase text-gold-300 hover:text-gold-200"
          >
            Open Professor →
          </Link>
          <p className="text-[11px] text-text-muted mt-2 leading-relaxed">
            This node is distilled from your Professor threads. The Professor still
            uses your full memory index for coaching — this view is your spatial map
            of themes.
          </p>
        </div>
      </div>
    </aside>
  );
}

function BrainmapDrawer({
  node,
  conversation,
  answers,
  lookup,
  professorTopicMeta,
  onClose,
}: {
  node: BrainmapDatum;
  conversation: AssessmentSession["conversation"];
  answers: AssessmentSession["answers"];
  lookup: BrainmapDatum[];
  professorTopicMeta?: Record<string, ProfessorTopicMeta>;
  onClose: () => void;
}) {
  if (node.id.startsWith("pt_")) {
    return (
      <ProfessorTopicDrawer
        node={node}
        meta={professorTopicMeta?.[node.id]}
        onClose={onClose}
      />
    );
  }

  const related = lookup.filter((n) => node.relatedNodeIds.includes(n.id));
  const qIds = node.supportingQuestionIds ?? [];

  function snippetTurn(idx: number) {
    const t = conversation[idx];
    if (!t) return null;
    const excerpt =
      t.content.length > 480 ? `${t.content.slice(0, 480)}…` : t.content;
    return (
      <li key={`turn-${idx}`} className="text-sm text-text-secondary space-y-1">
        <span className="text-text-muted text-xs uppercase tracking-wide block">
          [{idx}] {t.role === "user" ? "You" : "Professor"}
        </span>
        <span className="whitespace-pre-wrap">{excerpt}</span>
      </li>
    );
  }

  function snippetLegacyAnswer(qId: string) {
    const a = answers.find((x) => x.questionId === qId);
    if (!a) return null;
    let body = "";
    if (typeof a.value === "string") body = a.value;
    else if (Array.isArray(a.value)) body = (a.value as string[]).join("; ");
    else body = JSON.stringify(a.value);
    const short = body.length > 380 ? `${body.slice(0, 380)}…` : body;
    return (
      <li key={qId} className="text-sm text-text-secondary">
        <span className="text-text-muted text-xs uppercase tracking-wide block mb-1">
          Legacy response · {qId}
        </span>
        {short}
      </li>
    );
  }

  const turnIdx = node.supportingTurnIndices ?? [];

  return (
    <aside className="absolute inset-y-4 right-4 z-[20] w-[min(100%-2rem,380px)] flex flex-col rounded-xl border border-border bg-panel shadow-2xl">
      <div className="flex items-start gap-3 border-b border-border p-4">
        <div className="flex-1 min-w-0">
          <p className="text-xs uppercase tracking-wide text-text-muted">
            {node.kind.replace(/_/g, " ")}
          </p>
          <h3 className="font-display text-lg gold-text leading-tight mt-1">
            {node.label}
          </h3>
        </div>
        <button
          type="button"
          className="btn-ghost p-1 rounded-lg shrink-0"
          onClick={onClose}
          aria-label="Close"
        >
          <X className="size-4" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-5 text-sm">
        <section>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-text-muted mb-2">
            Interpretation
          </h4>
          <p className="text-text-secondary leading-relaxed">
            {node.interpretation}
          </p>
        </section>
        <section>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-text-muted mb-2">
            Recommended action
          </h4>
          <p className="text-text-secondary leading-relaxed">
            {node.recommendedAction}
          </p>
        </section>
        {node.supportingSnippets.length > 0 && (
          <section>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-text-muted mb-2">
              Supporting signals
            </h4>
            <ul className="list-disc pl-4 space-y-1 text-text-secondary">
              {node.supportingSnippets.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          </section>
        )}
        {turnIdx.length > 0 && (
          <section>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-text-muted mb-2">
              From your interview
            </h4>
            <ul className="space-y-3">
              {turnIdx.flatMap((i) => {
                const el = snippetTurn(i);
                return el ? [el] : [];
              })}
            </ul>
          </section>
        )}
        {qIds.length > 0 && (
          <section>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-text-muted mb-2">
              Structured responses (legacy)
            </h4>
            <ul className="space-y-3">
              {qIds.flatMap((qId) => {
                const el = snippetLegacyAnswer(qId);
                return el ? [el] : [];
              })}
            </ul>
          </section>
        )}
        {related.length > 0 && (
          <section>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-text-muted mb-2">
              Related nodes
            </h4>
            <ul className="flex flex-wrap gap-2">
              {related.map((n) => (
                <li
                  key={n.id}
                  className="rounded-full border border-border px-3 py-1 text-xs bg-background"
                >
                  {n.label}
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </aside>
  );
}

export function BrainmapFlowView({
  bundle,
  conversation = [],
  answers = [],
  professorTopicMeta,
  professorClusters = [],
  professorTopics = [],
}: {
  bundle: BrainmapBundle;
  conversation?: AssessmentSession["conversation"];
  answers?: AssessmentSession["answers"];
  professorTopicMeta?: Record<string, ProfessorTopicMeta>;
  professorClusters?: ProfessorMindmapClusterRow[];
  professorTopics?: ProfessorMindmapTopicRow[];
}) {
  return (
    <ReactFlowProvider>
      <InnerBrainmapFlow
        bundle={bundle}
        conversation={conversation}
        answers={answers}
        professorTopicMeta={professorTopicMeta}
        professorClusters={professorClusters}
        professorTopics={professorTopics}
      />
    </ReactFlowProvider>
  );
}
