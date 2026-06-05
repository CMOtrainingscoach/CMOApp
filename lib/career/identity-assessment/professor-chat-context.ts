import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/types/database";
import type { ExecutiveIdentityProfile, FinalReport } from "./schema";
import { safeParseFinalReport, safeParseProfile } from "./session-map";

function clip(text: string, max: number): string {
  const t = text.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, Math.max(0, max - 1))}…`;
}

function formatBullets(label: string, items: string[], maxItems = 14): string {
  if (!items.length) return "";
  const slice = items.slice(0, maxItems);
  return `${label}:\n${slice.map((s) => `  • ${s}`).join("\n")}`;
}

function formatProfile(p: ExecutiveIdentityProfile): string {
  const lines: string[] = [];
  lines.push(`Headline: ${p.headline}`);
  lines.push(formatBullets("Professional ambitions", p.professionalAmbitions));
  lines.push(formatBullets("Core capabilities", p.coreCapabilities));
  lines.push(
    formatBullets(
      "Marketing / business / creative interests",
      p.marketingBusinessCreativeInterests,
    ),
  );
  lines.push(formatBullets("Lifestyle priorities", p.lifestylePriorities));
  lines.push(formatBullets("Hobbies / fascinations", p.hobbiesAndFascinations));
  lines.push(
    formatBullets(
      "Industries / audiences",
      p.preferredIndustriesAndAudiences,
    ),
  );
  lines.push(formatBullets("Values / taste / worldview", p.valuesTasteWorldview));
  lines.push(`Reputation goals: ${clip(p.executiveReputationGoals, 500)}`);
  lines.push(
    `Communication style: ${clip(p.communicationStyleNotes, 500)}`,
  );
  lines.push(
    formatBullets("Authority-building angles", p.authorityBuildingAngles),
  );
  lines.push(formatBullets("Weaknesses / blind spots (stated)", p.weaknessesBlindSpots));
  return lines.filter(Boolean).join("\n");
}

function formatReport(r: FinalReport): string {
  const lines: string[] = [];
  lines.push(`Summary:\n${clip(r.executiveIdentitySummary, 1200)}`);
  lines.push(`Brand thesis:\n${clip(r.personalBrandThesis, 800)}`);
  lines.push(`Positioning:\n${clip(r.recommendedPositioning, 800)}`);
  lines.push(formatBullets("Strengths", r.strengths));
  lines.push(formatBullets("Blind spots (dossier)", r.blindSpots));
  lines.push(
    formatBullets("Ideal industries / categories", r.idealIndustriesCategories),
  );
  lines.push(
    formatBullets("Signature topics to own", r.signatureTopicsToOwn),
  );
  lines.push(
    `Content & authority strategy:\n${clip(r.contentAuthorityStrategy, 1000)}`,
  );
  lines.push(
    `Lifestyle–career alignment:\n${clip(r.lifestyleCareerAlignmentNotes, 600)}`,
  );
  lines.push("12-month roadmap:");
  for (const q of r.twelveMonthRoadmap) {
    lines.push(
      `  ${q.quarter}: ${clip(q.focus, 200)} — ${q.milestones.slice(0, 4).join("; ")}`,
    );
  }
  if (r.professorRecommendations.length) {
    lines.push("Professor recommendations:");
    for (const rec of r.professorRecommendations.slice(0, 8)) {
      lines.push(
        `  • ${rec.title}: ${clip(rec.body, 240)}`,
      );
    }
  }
  return lines.filter(Boolean).join("\n");
}

/**
 * Compact text block for the main Professor chat system prompt — completed assessments only.
 */
export async function getExecutiveIdentityDossiersPromptBlock(
  userId: string,
  maxTotalChars = 10_000,
): Promise<string> {
  const supabase = await createClient();
  const { data: rows, error } = await supabase
    .from("executive_identity_sessions")
    .select("id, updated_at, executive_identity_profile, final_report, status")
    .eq("user_id", userId)
    .eq("status", "completed")
    .order("updated_at", { ascending: false })
    .limit(3);

  if (error) {
    console.error("executive_identity_sessions fetch for professor chat", error);
    return "";
  }

  if (!rows?.length) {
    return "";
  }

  const parts: string[] = [];
  let used = 0;

  for (const row of rows) {
    const profile = safeParseProfile(
      row.executive_identity_profile as Json | null,
    );
    const report = safeParseFinalReport(row.final_report as Json | null);
    if (!profile && !report) continue;

    const dateLabel = row.updated_at
      ? new Date(row.updated_at as string).toISOString().slice(0, 10)
      : "unknown date";
    const header = `### Dossier (${dateLabel}, session ${String(row.id).slice(0, 8)}…)`;
    const bodyChunks: string[] = [];

    if (profile) bodyChunks.push(`STRUCTURED PROFILE\n${formatProfile(profile)}`);
    if (report) bodyChunks.push(`WRITTEN REPORT\n${formatReport(report)}`);

    const section = `${header}\n${bodyChunks.join("\n\n")}`;
    const remaining = maxTotalChars - used;
    if (remaining <= 200) break;

    if (section.length > remaining) {
      parts.push(
        `${header}\n${clip(bodyChunks.join("\n\n"), remaining - header.length - 20)}\n[…section truncated for token budget]`,
      );
      break;
    }

    parts.push(section);
    used += section.length + 2;
  }

  if (!parts.length) return "";

  return [
    "Use this material as primary factual background on the learner's executive identity, brand thesis, risks, and roadmap. Prefer it over vague inference. If the live conversation contradicts a fact here, ask one crisp clarifying question before overriding.",
    "",
    parts.join("\n\n---\n\n"),
  ].join("\n");
}
