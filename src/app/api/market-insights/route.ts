import { NextResponse } from "next/server";
import { jsonError, parseJsonObject } from "@/lib/api/http";
import { getAuthenticatedSupabase } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 50;

const DEFAULT_MODEL = "gemini-3.8-flash";
const REQUEST_TIMEOUT_MS = 40_000;
const MAX_ANSWER_LENGTH = 14_000;

type CitationSource = {
  title: string;
  url: string;
};

function safeSourceUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;

  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function formatAnswer(
  outputBlocks: Record<string, unknown>[],
): { answer: string; sources: CitationSource[] } {
  const sourceByUrl = new Map<string, CitationSource>();
  const paragraphs: string[] = [];

  for (const block of outputBlocks) {
    if (block.type !== "text" || typeof block.text !== "string") continue;

    let text = block.text;
    const annotations = Array.isArray(block.annotations)
      ? block.annotations
          .map(parseJsonObject)
          .filter((item): item is Record<string, unknown> => item !== null)
      : [];

    const insertions: Array<{ index: number; links: string[] }> = [];

    for (const annotation of annotations) {
      if (annotation.type !== "url_citation") continue;

      const url = safeSourceUrl(annotation.url ?? annotation.uri);
      if (!url) continue;

      const title =
        typeof annotation.title === "string" && annotation.title.trim()
          ? annotation.title.trim()
          : new URL(url).hostname;

      if (!sourceByUrl.has(url)) {
        if (sourceByUrl.size >= 12) continue;
        sourceByUrl.set(url, { title, url });
      }

      const endIndex = annotation.end_index ?? annotation.endIndex;
      if (
        typeof endIndex === "number" &&
        Number.isInteger(endIndex) &&
        endIndex >= 0 &&
        endIndex <= text.length
      ) {
        insertions.push({ index: endIndex, links: [url] });
      }
    }

    // Insert source links from right to left so earlier offsets stay valid.
    const grouped = new Map<number, Set<string>>();
    for (const insertion of insertions) {
      const urls = grouped.get(insertion.index) ?? new Set<string>();
      insertion.links.forEach((url) => urls.add(url));
      grouped.set(insertion.index, urls);
    }

    const orderedInsertions = [...grouped.entries()].sort(
      (left, right) => right[0] - left[0],
    );

    for (const [index, urls] of orderedInsertions) {
      const links = [...urls]
        .map((url) => {
          const sourceIndex =
            [...sourceByUrl.keys()].indexOf(url) + 1;
          return sourceIndex > 0 ? ` [${sourceIndex}](${url})` : "";
        })
        .join("");

      text = text.slice(0, index) + links + text.slice(index);
    }

    if (text.trim()) paragraphs.push(text.trim());
  }

  return {
    answer: paragraphs.join("\n\n").slice(0, MAX_ANSWER_LENGTH),
    sources: [...sourceByUrl.values()].slice(0, 12),
  };
}

export async function GET() {
  try {
    const { supabase, user } = await getAuthenticatedSupabase();

    if (!user) {
      return jsonError("Sign in to view real-market intelligence.", 401);
    }

    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (!apiKey) {
      return jsonError(
        "Live market research is not configured. Add GEMINI_API_KEY to the server environment.",
        503,
      );
    }

    const model =
      process.env.MARKET_INSIGHTS_MODEL?.trim() ||
      process.env.GEMINI_MODEL?.trim() ||
      DEFAULT_MODEL;

    if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,79}$/.test(model)) {
      return jsonError("Invalid MARKET_INSIGHTS_MODEL identifier.", 500);
    }

    // Quota counters are atomic in PostgreSQL and shared across server instances.
    const { data: withinQuota, error: quotaError } = await supabase.rpc(
      "consume_market_insights_quota",
    );

    if (quotaError) {
      console.error(
        "Market-insights quota check failed",
        quotaError.code ?? "unknown",
      );

      return jsonError(
        "Live market research is not configured. Apply migration 20261121000600_dynamic_market_events_and_insights.sql.",
        503,
      );
    }

    if (withinQuota !== true) {
      return jsonError(
        "Market research refresh limit reached: one refresh every 5 minutes and 20 per day. Please try again later.",
        429,
      );
    }

    const now = new Date();
    const asOf = new Intl.DateTimeFormat("en-IN", {
      dateStyle: "full",
      timeStyle: "short",
      timeZone: "Asia/Kolkata",
    }).format(now);

    const prompt = [
      "Prepare a concise, source-grounded Indian equity-market briefing for a financial-literacy simulator.",
      `Current reference time: ${asOf} (Asia/Kolkata).`,
      "Use Google Search to research the latest available NSE/BSE trading information and market news as of this reference time.",
      "If the Indian cash market is closed because it is a weekend or exchange holiday, clearly state that it is closed and use the most recent completed trading session. Never label a previous close as live or today's intraday data.",
      "Summarise the Nifty 50 and Sensex move, the strongest and weakest major sectors, and up to five notable Nifty 50 gainers and five laggards with their percentage changes where verifiable.",
      "For notable movers, explain the reported catalyst only when a credible source supports it. Distinguish confirmed company/exchange news from market commentary and from your own interpretation. Say when no reliable specific catalyst is available.",
      "Give 2–3 concise market insights about breadth, sector concentration, volatility or risk. Explain what the evidence suggests without predicting returns.",
      "Prioritise NSE/BSE disclosures and reputable financial reporting such as Reuters, Business Standard, Economic Times, Mint and established broker research. Cross-check material price moves with more than one credible source where possible.",
      "Cite factual claims inline using the web citations provided by Google Search grounding. Include dates and price timestamps. Do not invent prices, percentages, earnings, announcements or reasons.",
      "Use clean Markdown with short paragraphs and compact bullet lists. No Markdown tables, no raw HTML, no buy/sell/hold recommendations and no personal investment advice.",
      "This is REAL-WORLD market information and must remain completely separate from TILT's fictional companies and simulated prices.",
    ].join("\n\n");

    const upstream = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/interactions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          model,
          input: prompt,
          tools: [{ type: "google_search" }],
          store: false,
        }),
        cache: "no-store",
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      },
    );

    if (!upstream.ok) {
      const payload = await upstream.json().catch(() => ({}));
      const upstreamStatus =
        typeof payload === "object" &&
        payload !== null &&
        "error" in payload &&
        typeof payload.error === "object" &&
        payload.error !== null &&
        "status" in payload.error
          ? String(payload.error.status)
          : "unknown";

      if (upstream.status === 429) {
        return jsonError(
          "Google Search grounding quota reached. Check Gemini API usage and billing.",
          429,
        );
      }

      if (upstream.status === 401 || upstream.status === 403) {
        return jsonError(
          "Gemini rejected the key or Google Search grounding is unavailable for this API project. Check AI Studio access and billing.",
          503,
        );
      }

      console.error(
        "Grounded market research request failed",
        upstream.status,
        upstreamStatus,
      );

      return jsonError(
        "Live market research could not be completed. Try again shortly.",
        502,
      );
    }

    const interaction = parseJsonObject(await upstream.json());
    if (!interaction || interaction.status !== "completed" || !Array.isArray(interaction.steps)) {
      return jsonError("Google Search did not return a completed market briefing.", 502);
    }

    const outputBlocks = interaction.steps
      .map(parseJsonObject)
      .filter((step): step is Record<string, unknown> => step !== null)
      .filter((step) => step.type === "model_output")
      .flatMap((step) =>
        Array.isArray(step.content)
          ? step.content
              .map(parseJsonObject)
              .filter((block): block is Record<string, unknown> => block !== null)
          : [],
      );

    const { answer, sources } = formatAnswer(outputBlocks);

    if (!answer || sources.length === 0) {
      return jsonError(
        "The latest search did not provide verifiable source citations. Refresh the briefing in a moment.",
        502,
      );
    }

    return NextResponse.json(
      {
        asOf,
        market: "India · NSE / BSE",
        answer,
        sources,
      },
      {
        headers: {
          "Cache-Control": "private, max-age=900, stale-while-revalidate=900",
          Vary: "Cookie",
        },
      },
    );
  } catch (error) {
    if (error instanceof Error && error.name === "TimeoutError") {
      return jsonError("Live market research timed out. Please retry.", 504);
    }

    console.error(
      "TILT market research error",
      error instanceof Error ? error.message : "unknown",
    );

    return jsonError("Live market research is temporarily unavailable.", 503);
  }
}
