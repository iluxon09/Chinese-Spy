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

    const { data: consent, error: consentError } = await supabase
      .from("user_consents")
      .select("core_data_acknowledged,ai_processing_consent")
      .eq("user_id", user.id)
      .eq("consent_version", "2026-11-21-v1")
      .maybeSingle();

    if (consentError) {
      return jsonError("AI consent storage is unavailable. Apply the latest TILT consent migration.", 503);
    }
    if (consent?.core_data_acknowledged !== true || consent.ai_processing_consent !== true) {
      return jsonError("Enable Google Gemini processing in Privacy & consent before requesting the market briefing.", 403);
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

    const focusedWatchlist = [
      "RELIANCE — Reliance Industries",
      "TCS — Tata Consultancy Services",
      "INFY — Infosys",
      "HDFCBANK — HDFC Bank",
      "ICICIBANK — ICICI Bank",
      "SBIN — State Bank of India",
      "ITC — ITC",
      "LT — Larsen & Toubro",
      "BHARTIARTL — Bharti Airtel",
      "AXISBANK — Axis Bank",
    ];

    const prompt = [
      "Prepare a concise but complete, source-grounded Indian equity-market briefing for TILT's financial-literacy simulator.",
      `Research request time: ${asOf} (Asia/Kolkata). This is the research timestamp, NOT automatically the timestamp of the market prices.`,
      "Use Google Search to retrieve the latest verifiable NSE/BSE market data, official exchange information and company/market news available at the research request time.",
      "Start by stating the exact market-data cutoff date and time. State whether the Indian cash market is currently open or closed. On weekends or exchange holidays, use the most recent completed trading session and label it explicitly as the previous session close. During market hours, label prices as intraday/last reported and include the quote timestamp when a source provides it. Never call a previous close live.",
      "INDEX PULSE: report Nifty 50, Sensex, Nifty Bank and India VIX latest available value and percentage move. State the data date/session. Add advances versus declines and the strongest and weakest major NSE sectors when reliable values are available.",
      "NIFTY 50 LEADERS AND LAGGARDS: list up to five biggest Nifty 50 gainers and five biggest Nifty 50 losers for the relevant session. For every row give symbol, company, close/last reported price in INR and percentage move from the previous close. Do not mix Nifty 50 constituents with all-NSE or Nifty 500 movers. Label the universe correctly.",
      "TILT REAL-STOCK WATCHLIST: the following ten symbols came from the attached market-pulse prototype. Explicitly report each one, even if data is unavailable: " + focusedWatchlist.join("; ") + ". For each, give latest verified price, previous close, one-day percentage change and the exact date/session. If no credible quote is found, write 'Not verified' instead of guessing. These ten stocks are a curated watchlist, not a claim to represent the whole market.",
      "COMPANY NEWS: identify the important verified headlines for the strongest and weakest movers, especially companies in the ten-stock watchlist. Explain the specific catalyst only when a credible report, company filing or exchange disclosure supports it. Distinguish a confirmed announcement from a brokerage view, market commentary or correlation. If there is no verified company-specific catalyst, say so.",
      "MARKET INSIGHTS: give two or three short observations about breadth, sector leadership, volatility, flows or the gap between large caps and broader markets. Explain what the evidence suggests, what remains uncertain, and avoid forecasting returns.",
      "Prioritise NSE/BSE filings and official index data, then reputable sources such as Reuters, Business Standard, Economic Times, Mint, Moneycontrol and established broker research. Cross-check material price moves and catalysts with more than one credible source where possible.",
      "Attach Google Search grounding citations to factual claims. Include source publication dates and market-data timestamps. Do not invent prices, percentage changes, trading volumes, earnings, company announcements, flows or reasons. When credible sources disagree, state that values differ and prefer exchange closing data.",
      "FORMAT: use these Markdown headings in this order: 'Market session', 'Index and sector pulse', 'Nifty 50 gainers', 'Nifty 50 laggards', 'TILT ten-stock watchlist', 'Verified company news', 'What the session suggests'. Use concise flat bullet lists, not tables or nested lists. Format every percentage with an explicit + or − sign and two decimals. No raw HTML.",
      "This is REAL-WORLD information. Do not use TILT's fictional stock prices or invent any mapping between real companies and fictional symbols. Real-market information must never influence TILT's fictional simulation prices. No buy/sell/hold recommendations or personal investment advice.",
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
