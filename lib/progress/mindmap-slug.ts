/** URL-safe slug for professor_mindmap_clusters (unique per user). */
export function slugifyMindmapClusterTitle(title: string): string {
  const s = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80);
  return s.length > 0 ? s : "cluster";
}

export function professorTopicNodeId(topicUuid: string): string {
  return `pt_${topicUuid.replace(/-/g, "")}`;
}
