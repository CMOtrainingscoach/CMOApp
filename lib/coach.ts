import { z } from "zod";
import { generateObject, generateText } from "ai";
import { openaiProvider, CHAT_MODEL } from "./openai";
import { COACH_SYSTEM, PROFESSOR_BRIEFING_SYSTEM } from "./prompts";
import { getProfessorConfig } from "./professor-config.server";
import { todayIso } from "./utils";
import { createClient } from "./supabase/server";
import type { SkillKey } from "@/types/database";

const dailyMissionSchema = z.object({
  study_item: z.string().min(20).max(280),
  task_item: z.string().min(20).max(320),
  reflection_prompt: z.string().min(20).max(280),
  lifestyle_item: z.string().min(20).max(280),
});

export type DailyMissionPayload = z.infer<typeof dailyMissionSchema>;

const FALLBACK_MISSION: DailyMissionPayload = {
  study_item:
    "Study: P&L basics — Gross Margin vs Contribution Margin. Define each in one line and write the formula.",
  task_item:
    "Task: Rewrite one current marketing strategy in financial language (revenue, GM, payback). Limit yourself to 250 words.",
  reflection_prompt:
    "Reflection: Which business lever did you actually move today, and how did you measure the move?",
  lifestyle_item:
    "Lifestyle: Train 30 minutes, one block of 90-minute deep work, no scattered execution.",
};

export async function generateDailyMission(opts: {
  displayName: string;
  weakestSkills: { skill_key: SkillKey; score: number }[];
  recentReflections: string[];
  currentTrackTitle: string | null;
  recentDocsTitles: string[];
}): Promise<DailyMissionPayload> {
  if (!process.env.OPENAI_API_KEY) return FALLBACK_MISSION;
  try {
    const context = [
      `User: ${opts.displayName}`,
      opts.weakestSkills.length
        ? `Weakest skills: ${opts.weakestSkills
            .map((s) => `${s.skill_key} (${s.score})`)
            .join(", ")}`
        : null,
      opts.currentTrackTitle ? `Current track: ${opts.currentTrackTitle}` : null,
      opts.recentDocsTitles.length
        ? `Recent docs: ${opts.recentDocsTitles.slice(0, 3).join(" | ")}`
        : null,
      opts.recentReflections.length
        ? `Recent reflections: ${opts.recentReflections.slice(0, 3).join(" || ")}`
        : null,
    ]
      .filter(Boolean)
      .join("\n");

    const { object } = await generateObject({
      model: openaiProvider(CHAT_MODEL),
      schema: dailyMissionSchema,
      system: COACH_SYSTEM,
      prompt: `Generate today's CMO mission for this user. Tailor to their weakest skills and current track.\n\n${context}`,
      temperature: 0.7,
    });
    return object;
  } catch (e) {
    console.error("generateDailyMission failed", e);
    return FALLBACK_MISSION;
  }
}

export async function ensureTodayMission(userId: string) {
  const supabase = await createClient();
  const today = todayIso();

  const { data: existing } = await supabase
    .from("daily_missions")
    .select("*")
    .eq("user_id", userId)
    .eq("mission_date", today)
    .maybeSingle();
  if (existing) return existing;

  const [{ data: profile }, { data: skills }, { data: refls }, { data: docs }, { data: trackProg }] =
    await Promise.all([
      supabase.from("profiles").select("display_name").eq("id", userId).maybeSingle(),
      supabase
        .from("skill_scores")
        .select("skill_key, score")
        .eq("user_id", userId)
        .order("score", { ascending: true })
        .limit(2),
      supabase
        .from("reflections")
        .select("response")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(3),
      supabase
        .from("documents")
        .select("title")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(3),
      supabase
        .from("track_progress")
        .select("track_id, learning_tracks(title)")
        .eq("user_id", userId)
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

  const mission = await generateDailyMission({
    displayName: profile?.display_name ?? "Operator",
    weakestSkills: (skills as { skill_key: SkillKey; score: number }[]) ?? [],
    recentReflections: (refls ?? []).map((r) => r.response),
    currentTrackTitle:
      (trackProg as { learning_tracks: { title: string } | null } | null)
        ?.learning_tracks?.title ?? null,
    recentDocsTitles: (docs ?? []).map((d) => d.title),
  });

  const { data: inserted } = await supabase
    .from("daily_missions")
    .insert({
      user_id: userId,
      mission_date: today,
      ...mission,
    })
    .select("*")
    .single();

  return inserted;
}

export async function generateProfessorBriefing(opts: {
  displayName: string;
  recentMemories: string[];
  weakestSkills: { skill_key: SkillKey; score: number }[];
}): Promise<string> {
  const cfg = await getProfessorConfig();
  const professorName = cfg.professor_name || "AI CMO Professor";
  const firstName = opts.displayName.split(/\s+/)[0];
  const fallback = `Good morning, ${firstName}. ${professorName} here — I've reviewed your progress and prepared today's plan to sharpen your edge. Focus today: translate strategy into financial impact.`;

  if (!process.env.OPENAI_API_KEY) return fallback;
  try {
    const ctx = [
      `User first name: ${firstName}`,
      `You are addressed as: ${professorName}`,
      opts.weakestSkills.length
        ? `Weakest skills: ${opts.weakestSkills.map((s) => s.skill_key).join(", ")}`
        : null,
      opts.recentMemories.length
        ? `Recent memories: ${opts.recentMemories.slice(0, 5).join(" | ")}`
        : null,
    ]
      .filter(Boolean)
      .join("\n");
    const { text } = await generateText({
      model: openaiProvider(CHAT_MODEL),
      system: PROFESSOR_BRIEFING_SYSTEM,
      prompt: ctx,
      temperature: 0.6,
      maxTokens: 220,
    });
    if (text) return text.trim();
  } catch (e) {
    console.error("generateProfessorBriefing failed", e);
  }
  return fallback;
}
