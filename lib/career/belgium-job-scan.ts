const TAVILY_SEARCH_URL = "https://api.tavily.com/search";

export type JobScanResultItem = {
  query_id: string;
  title: string;
  url: string;
  snippet: string;
  source_domain: string;
  /** From Tavily when present; often null for general web search. */
  published_date: string | null;
};

type TavilyResult = {
  title?: string;
  url?: string;
  content?: string;
  published_date?: string;
};

type TavilyResponse = {
  results?: TavilyResult[];
  error?: string;
};

/** Fixed queries: Belgium + senior marketing leadership (EN / FR / NL). */
export const BELGIUM_MARKETING_LEADERSHIP_QUERIES: { id: string; query: string }[] = [
  {
    id: "cmo_be_en",
    query:
      'CMO OR "Chief Marketing Officer" job opening Belgium OR Brussels',
  },
  {
    id: "head_marketing_en",
    query:
      '"Head of Marketing" OR "Marketing Director" strategy leadership job Belgium',
  },
  {
    id: "marketing_manager_strategic",
    query:
      '"Marketing Manager" strategic B2B OR brand job Belgium remote OR hybrid',
  },
  {
    id: "fr_be",
    query:
      "directeur marketing OR responsable marketing stratégique offre d emploi Belgique Bruxelles",
  },
  {
    id: "nl_be",
    query:
      "marketingdirecteur OR hoofd marketing strategisch vacature België Brussel Vlaanderen",
  },
  {
    id: "boards_agencies",
    query:
      "Michael Page OR Robert Half OR Hays marketing director OR CMO vacancy Belgium",
  },
];

export function careerListingUrlKey(url: string): string {
  try {
    const u = new URL(url);
    return `${u.hostname.toLowerCase()}${u.pathname.replace(/\/$/, "")}`;
  } catch {
    return url.toLowerCase().trim();
  }
}

function domainFromUrl(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

async function tavilySearch(
  apiKey: string,
  query: string,
  maxResults = 8,
): Promise<TavilyResult[]> {
  const res = await fetch(TAVILY_SEARCH_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: apiKey,
      query,
      search_depth: "basic",
      max_results: maxResults,
      include_answer: false,
    }),
  });
  const body = (await res.json()) as TavilyResponse;
  if (!res.ok) {
    throw new Error(body.error ?? `Tavily HTTP ${res.status}`);
  }
  return body.results ?? [];
}

/**
 * Runs parallel Tavily searches, merges and deduplicates by normalized URL.
 */
export async function runBelgiumMarketingJobScan(
  apiKey: string,
): Promise<JobScanResultItem[]> {
  const settled = await Promise.allSettled(
    BELGIUM_MARKETING_LEADERSHIP_QUERIES.map(async ({ id, query }) => {
      const rows = await tavilySearch(apiKey, query);
      return { id, rows };
    }),
  );

  const byUrl = new Map<string, JobScanResultItem>();

  for (let i = 0; i < settled.length; i++) {
    const q = BELGIUM_MARKETING_LEADERSHIP_QUERIES[i]!;
    const outcome = settled[i]!;
    if (outcome.status === "rejected") {
      console.warn("Tavily query failed", q.id, outcome.reason);
      continue;
    }
    for (const r of outcome.value.rows) {
      const url = (r.url ?? "").trim();
      if (!url || !url.startsWith("http")) continue;
      const key = careerListingUrlKey(url);
      const published =
        typeof r.published_date === "string" && r.published_date.trim()
          ? r.published_date.trim()
          : null;
      const title = (r.title ?? "").trim() || "Untitled result";
      const snippet = (r.content ?? "").trim().slice(0, 1200);
      if (byUrl.has(key)) {
        const cur = byUrl.get(key)!;
        if (!cur.published_date && published) cur.published_date = published;
        continue;
      }
      byUrl.set(key, {
        query_id: q.id,
        title,
        url,
        snippet,
        source_domain: domainFromUrl(url),
        published_date: published,
      });
    }
  }

  return [...byUrl.values()];
}
