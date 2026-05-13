import { generateObject } from "ai";
import { NextResponse } from "next/server";
import { z } from "zod";
import { openaiProvider, CHAT_MODEL } from "@/lib/openai";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { buildProfessorSystemPrompt } from "@/lib/professor-config";
import { getProfessorConfig } from "@/lib/professor-config.server";
import { CAREER_JOB_SCAN_MATCH_SYSTEM, PROFESSOR_SYSTEM } from "@/lib/prompts";
import {
  careerListingUrlKey,
  runBelgiumMarketingJobScan,
} from "@/lib/career/belgium-job-scan";
import {
  loadResumeTextForCareer,
  resumeQuoteIsVerbatim,
} from "@/lib/career/resume-text";
import {
  jobScanMatchResponseSchema,
  type JobScanMatchJob,
} from "@/lib/career/job-scan-match";

type ScanJobPayload = Omit<JobScanMatchJob, "posted_date"> & {
  posted_date: string | null;
  posted_at: string | null;
  feedback: string;
  source_domain: string | null;
  listing_snippet: string | null;
};
export const maxDuration = 120;

const bodySchema = z.object({
  resumeDocumentId: z.string().uuid(),
});

const MAX_TAVILY_ROWS = 18;
const DISCLAIMER =
  "Listings come from web search, not live ATS feeds. Dates and snippets may be missing, wrong, or require login — verify before applying.";

function parsePostedDisplay(s: string | null): string | null {
  if (!s || s.trim().length === 0 || s.trim().toLowerCase() === "unknown")
    return null;
  return s.trim().slice(0, 48);
}

function coercePostedAtIso(display: string | null): string | null {
  if (!display) return null;
  const t = Date.parse(display);
  if (!Number.isFinite(t)) return null;
  return new Date(t).toISOString();
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsedBody = bodySchema.safeParse(payload);
  if (!parsedBody.success) {
    return NextResponse.json(
      { error: "invalid_body", detail: parsedBody.error.flatten() },
      { status: 400 },
    );
  }

  const { resumeDocumentId } = parsedBody.data;

  const tavilyKey = process.env.TAVILY_API_KEY?.trim();
  if (!tavilyKey) {
    return NextResponse.json(
      {
        error: "career_job_scan_disabled",
        message:
          "Web search is not configured (set TAVILY_API_KEY on the server).",
      },
      { status: 503 },
    );
  }

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      {
        error: "openai_not_configured",
        message: "OpenAI is not configured on this deployment.",
      },
      { status: 503 },
    );
  }

  let admin;
  try {
    admin = createServiceRoleClient();
  } catch (e) {
    console.error("career job scan: admin client", e);
    return NextResponse.json(
      { error: "server_misconfigured" },
      { status: 500 },
    );
  }

  const resume = await loadResumeTextForCareer(
    admin,
    user.id,
    resumeDocumentId,
  );
  if (!resume) {
    return NextResponse.json(
      {
        error: "resume_not_ready",
        message: "Pick a document with status Ready and text or summary.",
      },
      { status: 400 },
    );
  }

  let items;
  try {
    items = await runBelgiumMarketingJobScan(tavilyKey);
  } catch (e) {
    console.error("Belgium job scan Tavily failed", e);
    return NextResponse.json(
      {
        error: "tavily_failed",
        message: (e as Error).message ?? "Search failed",
      },
      { status: 502 },
    );
  }

  const capped = items.slice(0, MAX_TAVILY_ROWS);
  const allowedKeys = new Set(
    capped.map((h) => careerListingUrlKey(h.url)),
  );

  const professorCfg = await getProfessorConfig();
  const system = `${buildProfessorSystemPrompt(
    professorCfg,
    PROFESSOR_SYSTEM,
  )}

${CAREER_JOB_SCAN_MATCH_SYSTEM}`;

  const userPrompt = `# CV / resume (${resume.title})

## Resume text (truncated for model)
${resume.text}

# Search hits (JSON)
${JSON.stringify(
  capped.map((h) => ({
    query_id: h.query_id,
    title: h.title,
    url: h.url,
    snippet: h.snippet,
    source_domain: h.source_domain,
    published_date: h.published_date,
  })),
)}`;

  try {
    const { object } = await generateObject({
      model: openaiProvider(CHAT_MODEL),
      schema: jobScanMatchResponseSchema,
      system,
      prompt: userPrompt,
      temperature: 0.28,
    });

    const sanitized: ScanJobPayload[] = object.jobs
      .filter((j) => allowedKeys.has(careerListingUrlKey(j.url)))
      .map((j) => {
        const hit = capped.find(
          (x) => careerListingUrlKey(x.url) === careerListingUrlKey(j.url),
        );
        const mergedPosted =
          parsePostedDisplay(j.posted_date) ??
          parsePostedDisplay(hit?.published_date ?? null);

        let quote = j.resume_quote.trim();
        if (!resumeQuoteIsVerbatim(resume.text, quote)) {
          quote = "—";
        }

        return {
          url: j.url,
          title: j.title,
          posted_date: mergedPosted ?? null,
          posted_at: coercePostedAtIso(mergedPosted ?? null),
          resume_quote: quote || "—",
          stars: j.stars,
          feedback: j.feedback,
          source_domain:
            hit?.source_domain ??
            (() => {
              try {
                return new URL(j.url).hostname.replace(/^www\./, "");
              } catch {
                return null;
              }
            })(),
          listing_snippet: hit?.snippet ?? null,
        };
      });

    return NextResponse.json({
      overview: object.overview,
      jobs: sanitized,
      disclaimer: DISCLAIMER,
    });
  } catch (e) {
    console.error("career job scan generateObject failed", e);
    return NextResponse.json(
      { error: "match_generation_failed", message: (e as Error).message },
      { status: 502 },
    );
  }
}
