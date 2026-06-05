"use server";

import { z } from "zod";
import { generateObject } from "ai";
import { PL_SHEET_DRILL_GRADER_SYSTEM, PL_SHEET_DRILL_HINT_SYSTEM } from "@/lib/prompts";
import { openaiProvider, CHAT_MODEL, isOpenAiConfigured } from "@/lib/openai";
import { createClient } from "@/lib/supabase/server";
import { awardXp, bumpStreak } from "@/lib/strategy/xp";
import {
  getScenarioById,
  pickRandomScenario,
  toPublicPayload,
  PL_SHEET_DRILL_XP,
  type PlSheetDrillDifficulty,
} from "@/lib/pl/pl-sheet-scenarios";
import type { PublicPlSheetDrillPayload } from "@/lib/pl/pl-sheet-drill-types";

const SESSION_TTL_MS = 45 * 60 * 1000;
const MAX_ATTEMPTS = 3;

const gradeSchema = z.object({
  correct: z.boolean(),
  feedback_md: z.string().min(40).max(2000),
});

const hintSchema = z.object({
  hint_md: z.string().min(20).max(1200),
});

export type StartPlSheetDrillResult =
  | {
      sessionId: string;
      sheet: PublicPlSheetDrillPayload;
      questionMd: string;
      difficulty: PlSheetDrillDifficulty;
    }
  | { error: string };

export type SubmitPlSheetDrillResult =
  | {
      ok: true;
      correct: boolean;
      feedbackMd: string;
      attemptsUsed: number;
      attemptsLeft: number;
      status: "in_progress" | "completed" | "failed";
      xpAwarded?: number;
    }
  | { ok: false; error: string };

function sheetMarkdown(payload: PublicPlSheetDrillPayload): string {
  const body = payload.lines
    .map((l) => {
      const amt =
        l.amount == null ? "—" : `${l.amount.toLocaleString("en-US")}`;
      const flags = [l.isSubtotal ? "(subtotal)" : "", l.isTotal ? "(total)" : ""]
        .filter(Boolean)
        .join(" ");
      return `- **${l.label}**${flags ? " " + flags : ""}: ${amt}`;
    })
    .join("\n");
  return `### ${payload.title}\n_${payload.unitNote}_\n\n${body}`;
}

export async function startPlSheetDrillSession(
  difficulty: PlSheetDrillDifficulty,
): Promise<StartPlSheetDrillResult> {
  if (difficulty !== "easy" && difficulty !== "medium" && difficulty !== "hard") {
    return { error: "Invalid difficulty." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  await supabase
    .from("pl_sheet_drill_sessions")
    .delete()
    .eq("user_id", user.id);

  const scenario = pickRandomScenario(difficulty);
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();

  const { data: row, error } = await supabase
    .from("pl_sheet_drill_sessions")
    .insert({
      user_id: user.id,
      difficulty,
      scenario_id: scenario.id,
      status: "in_progress",
      attempts_used: 0,
      xp_awarded: false,
      expires_at: expiresAt,
    })
    .select("id")
    .single();

  if (error || !row?.id)
    return { error: error?.message ?? "Could not start session." };

  return {
    sessionId: row.id as string,
    sheet: toPublicPayload(scenario),
    questionMd: scenario.questionMd,
    difficulty,
  };
}

async function gradeWithProfessor(opts: {
  sheet: PublicPlSheetDrillPayload;
  questionMd: string;
  referenceAnswer: string;
  gradingNotes: string;
  keywordsMustHit?: string[];
  userAnswer: string;
}): Promise<z.infer<typeof gradeSchema>> {
  const sheetText = sheetMarkdown(opts.sheet);
  const keywords =
    opts.keywordsMustHit?.length ?
      `\nKeywords that strongly indicate a correct numeric/qualitative anchor (not exhaustive): ${opts.keywordsMustHit.join(", ")}`
    : "";

  const { object } = await generateObject({
    model: openaiProvider(CHAT_MODEL),
    schema: gradeSchema,
    system: PL_SHEET_DRILL_GRADER_SYSTEM,
    prompt: `P&L SHEET (sole source of numbers):\n${sheetText}\n\nQUESTION FOR THE LEARNER:\n${opts.questionMd}\n\nREFERENCE ANSWER (for grading — do not quote verbatim to learner):\n${opts.referenceAnswer}\n\nGRADING NOTES:\n${opts.gradingNotes}${keywords}\n\nLEARNER ANSWER:\n${opts.userAnswer.trim().slice(0, 8000)}`,
    temperature: 0.15,
  });
  return object;
}

async function hintWithProfessor(opts: {
  sheet: PublicPlSheetDrillPayload;
  questionMd: string;
  referenceAnswer: string;
  gradingNotes: string;
}): Promise<z.infer<typeof hintSchema>> {
  const sheetText = sheetMarkdown(opts.sheet);
  const { object } = await generateObject({
    model: openaiProvider(CHAT_MODEL),
    schema: hintSchema,
    system: PL_SHEET_DRILL_HINT_SYSTEM,
    prompt: `P&L SHEET (sole source of numbers):\n${sheetText}\n\nQUESTION FOR THE LEARNER:\n${opts.questionMd}\n\nREFERENCE ANSWER (internal — do NOT reveal or paraphrase as the learner's final result):\n${opts.referenceAnswer}\n\nGRADING NOTES (internal):\n${opts.gradingNotes}\n\nWrite hint_md for the learner now.`,
    temperature: 0.35,
  });
  return object;
}

export type RequestPlSheetDrillHintResult =
  | { ok: true; hintMd: string }
  | { ok: false; error: string };

export async function requestPlSheetDrillHint(opts: {
  sessionId: string;
}): Promise<RequestPlSheetDrillHintResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const { data: row, error: loadErr } = await supabase
    .from("pl_sheet_drill_sessions")
    .select(
      "id, scenario_id, status, expires_at, hint_md",
    )
    .eq("id", opts.sessionId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (loadErr) return { ok: false, error: loadErr.message };
  if (!row) return { ok: false, error: "Session not found." };

  if (new Date(row.expires_at as string).getTime() < Date.now()) {
    await supabase.from("pl_sheet_drill_sessions").delete().eq("id", row.id);
    return { ok: false, error: "Session expired. Start a new drill." };
  }

  if ((row.status as string) !== "in_progress") {
    return {
      ok: false,
      error: "Hints are only available while the round is in progress.",
    };
  }

  const existingHint = row.hint_md as string | null;
  if (existingHint?.trim()) {
    return { ok: true, hintMd: existingHint };
  }

  if (!isOpenAiConfigured()) {
    return {
      ok: false,
      error:
        "AI is not configured on the server (OPENAI_API_KEY). Cannot generate a hint.",
    };
  }

  const scenario = getScenarioById(row.scenario_id as string);
  if (!scenario) return { ok: false, error: "Unknown scenario." };

  const sheet = toPublicPayload(scenario);
  let hinted: z.infer<typeof hintSchema>;
  try {
    hinted = await hintWithProfessor({
      sheet,
      questionMd: scenario.questionMd,
      referenceAnswer: scenario.referenceAnswer,
      gradingNotes: scenario.gradingNotes,
    });
  } catch (e) {
    console.error("pl sheet drill hint failed", e);
    return {
      ok: false,
      error: "Could not generate a hint right now. Try again in a moment.",
    };
  }

  const { data: updated, error: saveErr } = await supabase
    .from("pl_sheet_drill_sessions")
    .update({ hint_md: hinted.hint_md })
    .eq("id", row.id)
    .is("hint_md", null)
    .select("hint_md")
    .maybeSingle();

  if (saveErr)
    return { ok: false, error: "Could not save hint: " + saveErr.message };

  if (updated?.hint_md) {
    return { ok: true, hintMd: updated.hint_md as string };
  }

  const { data: again } = await supabase
    .from("pl_sheet_drill_sessions")
    .select("hint_md")
    .eq("id", row.id)
    .maybeSingle();

  const hintAgain = again?.hint_md as string | null;
  if (hintAgain?.trim()) return { ok: true, hintMd: hintAgain };

  return { ok: false, error: "Could not save hint. Try again." };
}

export async function submitPlSheetDrillAnswer(opts: {
  sessionId: string;
  answer: string;
}): Promise<SubmitPlSheetDrillResult> {
  const answer = opts.answer.trim();
  if (answer.length < 2) {
    return { ok: false, error: "Answer is too short." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const { data: row, error: loadErr } = await supabase
    .from("pl_sheet_drill_sessions")
    .select(
      "id, difficulty, scenario_id, status, attempts_used, xp_awarded, expires_at",
    )
    .eq("id", opts.sessionId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (loadErr) return { ok: false, error: loadErr.message };
  if (!row) return { ok: false, error: "Session not found." };

  if (
    new Date(row.expires_at as string).getTime() < Date.now()
  ) {
    await supabase.from("pl_sheet_drill_sessions").delete().eq("id", row.id);
    return { ok: false, error: "Session expired. Start a new drill." };
  }

  if ((row.status as string) !== "in_progress") {
    return { ok: false, error: "This round is already finished." };
  }

  if ((row.attempts_used as number) >= MAX_ATTEMPTS) {
    return { ok: false, error: "No attempts left for this round." };
  }

  if (!isOpenAiConfigured()) {
    return {
      ok: false,
      error:
        "AI grading is not configured on the server (OPENAI_API_KEY). Your attempt was not counted.",
    };
  }

  const scenario = getScenarioById(row.scenario_id as string);
  if (!scenario) {
    return { ok: false, error: "Unknown scenario." };
  }

  const sheet = toPublicPayload(scenario);
  let graded: z.infer<typeof gradeSchema>;
  try {
    graded = await gradeWithProfessor({
      sheet,
      questionMd: scenario.questionMd,
      referenceAnswer: scenario.referenceAnswer,
      gradingNotes: scenario.gradingNotes,
      keywordsMustHit: scenario.keywordsMustHit,
      userAnswer: answer,
    });
  } catch (e) {
    console.error("pl sheet drill grade failed", e);
    return {
      ok: false,
      error:
        "Could not grade this answer right now. Try again — your attempt was not counted.",
    };
  }

  const prevAttempts = row.attempts_used as number;
  const nextAttempts = prevAttempts + 1;
  const difficulty = row.difficulty as PlSheetDrillDifficulty;
  const xpAmount = PL_SHEET_DRILL_XP[difficulty] ?? 10;

  if (graded.correct) {
    await supabase
      .from("pl_sheet_drill_sessions")
      .update({
        attempts_used: nextAttempts,
        status: "completed",
        xp_awarded: true,
      })
      .eq("id", row.id);

    await awardXp({
      userId: user.id,
      source: "pl_sheet_drill",
      amount: xpAmount,
      refId: row.id as string,
      labSlug: "pl",
    });
    await bumpStreak(user.id);

    return {
      ok: true,
      correct: true,
      feedbackMd: graded.feedback_md,
      attemptsUsed: nextAttempts,
      attemptsLeft: Math.max(0, MAX_ATTEMPTS - nextAttempts),
      status: "completed",
      xpAwarded: xpAmount,
    };
  }

  if (nextAttempts >= MAX_ATTEMPTS) {
    await supabase
      .from("pl_sheet_drill_sessions")
      .update({
        attempts_used: nextAttempts,
        status: "failed",
      })
      .eq("id", row.id);

    return {
      ok: true,
      correct: false,
      feedbackMd: graded.feedback_md,
      attemptsUsed: nextAttempts,
      attemptsLeft: 0,
      status: "failed",
    };
  }

  await supabase
    .from("pl_sheet_drill_sessions")
    .update({ attempts_used: nextAttempts })
    .eq("id", row.id);

  return {
    ok: true,
    correct: false,
    feedbackMd: graded.feedback_md,
    attemptsUsed: nextAttempts,
    attemptsLeft: MAX_ATTEMPTS - nextAttempts,
    status: "in_progress",
  };
}
