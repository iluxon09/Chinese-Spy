import { NextResponse } from "next/server";
import { jsonError, parseJsonObject } from "@/lib/api/http";
import { getAuthenticatedSupabase } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 50;

const DEFAULT_MODEL = "gemini-3.8-flash";
const REQUEST_TIMEOUT_MS = 40_000;
const MAX_ANSWER_LENGTH = 8_000;

type CitationSource = { title: string; url: string };

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

    let content = block.text;
    const annotations = Array.isArray(block.annotations)
      ? block.annotations
          .map(parseJsonObject)
          .filter((item): item is Record<string, unknown> => item !== null)
      : [];
    const positions = new Map<number, Set<string>>();

    for (const annotation of annotations) {
      if (annotation.type !== "url_citation") continue;
      const url = safeSourceUrl(annotation.url ?? annotation.uri);
      if (!url) continue;

      if (!sourceByUrl.has(url) && sourceByUrl.size < 12) {
        const title =
          typeof annotation.title === "string" && annotation.title.trim()
            ? annotation.title.trim()
            : new URL(url).hostname;
        sourceByUrl.set(url, { title, url });
      }

      const endIndex = annotation.end_index ?? annotation.endIndex;
      if (
        typeof endIndex === "number" &&
        Number.isInteger(endIndex) &&
        endIndex >= 0 &&
        endIndex <= content.length
      ) {
        const urls = positions.get(endIndex) ?? new Set<string>();
        urls.add(url);
        positions.set(endIndex, urls);
      }
    }

    for (const [index, urls] of [...positions.entries()].sort((a, b) => b[0] - a[0])) {
      const citations = [...urls]
        .map((url) => {
          const sourceIndex = [...sourceByUrl.keys()].indexOf(url) + 1;
          return sourceIndex > 0 ? ` [${sourceIndex}](${url})` : "";
        })
        .join("");
      content = content.slice(0, index) + citations + content.slice(index);
    }

    if (content.trim()) paragraphs.push(content.trim());
  }

  return {
    answer: paragraphs.join("\n\n").slice(0, MAX_ANSWER_LENGTH),
    sources: [...sourceByUrl.values()],
  };
}

export async function GET() {
  try {
    const { supabase, user } = await getAuthenticatedSupabase();
    if (!user) return jsonError("Sign in to view market explanations.", 401);

    const { data: consent, error: consentError } = await supabase
      .from("user_consents")
      .select("core_data_acknowledged,ai_processing_consent")
      .eq("user_id", user.id)
      .eq("consent_version", "2026-11-21-v1")
      .maybeSingle();

    if (consentError) {
      return jsonError("AI consent storage is unavailable. Verify the TILT consent migration.", 503);
    }
    if (consent?.core_data_acknowledged !== true || consent.ai_processing_consent !== true) {
      return jsonError("Enable Google Gemini processing in Privacy & consent before requesting an explanation.", 403);
    }

    const { data: marketState, error: marketError } = await supabase
      .from("market_pulse_state")
      .select("snapshot,last_success_at")
      .eq("universe_key", "NIFTY_500")
      .maybeSingle();

    if (marketError) {
      console.error("Market explanation snapshot read failed", marketError.code ?? "unknown");
      return jsonError("The Nifty 500 snapshot is unavailable. Verify the market-pulse migration.", 503);
    }

    const snapshot = parseJsonObject(marketState?.snapshot);
    if (!snapshot) {
      return jsonError("No successful Nifty 500 snapshot exists yet. The explanation is unavailable until the first refresh.", 503);
    }

    const gainers = Array.isArray(snapshot.gainers) ? snapshot.gainers.slice(0, 5) : [];
    const losers = Array.isArray(snapshot.losers) ? snapshot.losers.slice(0, 5) : [];
    const moverSummary = [...gainers, ...losers]
      .map((item) => {
        const stock = parseJsonObject(item);
        if (!stock) return null;
        return {
          symbol: stock.symbol,
          company: stock.company,
          market_date: stock.market_date,
        };
      })
      .filter((item) => item !== null);

    if (moverSummary.length === 0) {
      return jsonError("The stored snapshot contains no verified movers to explain.", 503);
    }

    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (!apiKey) return jsonError("Market explanations are not configured. Add GEMINI_API_KEY.", 503);

    const model =
      process.env.MARKET_INSIGHTS_MODEL?.trim() ||
      process.env.GEMINI_MODEL?.trim() ||
      DEFAULT_MODEL;
    if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,79}$/.test(model)) {
      return jsonError("Invalid MARKET_INSIGHTS_MODEL identifier.", 500);
    }

    const { data: withinQuota, error: quotaError } = await supabase.rpc(
      "consume_market_insights_quota",
    );
    if (quotaError) {
      console.error("Market-explanation quota check failed", quotaError.code ?? "unknown");
      return jsonError("Market explanation limits are not configured. Verify migration 20261121000600_dynamic_market_events_and_insights.sql.", 503);
    }
    if (withinQuota !== true) {
      return jsonError("Market explanation limit reached: one request every 5 minutes and 20 per day. Try later.", 429);
    }

    const lastUpdatedAt =
      typeof marketState?.last_success_at === "string" ? marketState.last_success_at : null;
    const snapshotAgeMs = lastUpdatedAt ? Date.now() - Date.parse(lastUpdatedAt) : Number.POSITIVE_INFINITY;
    const stale = snapshotAgeMs > 45 * 60 * 1000;
    const dataType = typeof snapshot.data_type === "string"
      ? snapshot.data_type
      : "daily_historical_or_delayed";
    const latestMarketDate =
      typeof snapshot.latest_market_date === "string" ? snapshot.latest_market_date : "unknown";
    const latestMarketDateMs =
      latestMarketDate !== "unknown"
        ? Date.parse(`${latestMarketDate}T00:00:00Z`)
        : Number.NaN;
    const marketDataAgeCalendarDays = Number.isFinite(latestMarketDateMs)
      ? Math.max(0, Math.floor((Date.now() - latestMarketDateMs) / 86_400_000))
      : null;
    const marketDataStale =
      marketDataAgeCalendarDays === null || marketDataAgeCalendarDays > 7;

    const prompt = [
      "You are writing a brief, evidence-led market note for TILT, an educational financial-literacy product.",
      "The following Nifty 500 movers have already been calculated by deterministic backend code using the same two completed daily market sessions for every included stock. Treat this list as immutable input, not a question.",
      "Do not calculate, select, add, remove, reorder, rank, or substitute any stock. Do not produce gainers/losers tables or restate numerical prices, returns, or rankings. The application renders those separately from its stored snapshot.",
      "Your task is limited to explaining whether credible, dated news or company/exchange disclosures help explain any of these moves. Do not infer causation from price movement alone. If you cannot verify a catalyst, say that no specific catalyst was verified.",
      "Use Google Search grounding. Prefer NSE/BSE/company filings and reputable news. Include publication dates, and distinguish confirmed announcements from commentary, broker opinion, and unverified speculation.",
      "If a catalyst is not from the same market session, say so. If a news event merely coincides with a move, describe it as context rather than a cause.",
      "Output no more than: 'Verified developments' (up to five concise bullets) and 'Limitations' (one concise paragraph). No investment recommendations, price forecasts, or buy/sell/hold language.",
      `Market-data universe: Nifty 500. Latest market date in snapshot: ${latestMarketDate}. Data type: ${dataType}. Snapshot last updated: ${lastUpdatedAt ?? "unknown"}.`,
      stale
        ? "WARNING: The worker snapshot is older than 45 minutes. State that the snapshot may be stale."
        : "The worker snapshot is within the expected refresh window. This does not make the underlying daily bars real-time.",
      marketDataStale
        ? `WARNING: The latest available market session is ${marketDataAgeCalendarDays ?? "unknown"} calendar days old. Explicitly state that the underlying market data is stale, even if the worker fetched it recently.`
        : "The latest market session is within seven calendar days of today. Do not imply the feed is live or intraday.",
      `Authoritative precomputed mover symbols and companies: ${JSON.stringify(moverSummary)}`,
      "Reminder: these are the only movers to discuss. Do not re-rank them or generate an alternate list.",
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
      const payload = parseJsonObject(await upstream.json().catch(() => null));
      const upstreamStatus = parseJsonObject(payload?.error)?.status;
      if (upstream.status === 429) {
        return jsonError("Google Search grounding quota reached. Check Gemini API usage and billing.", 429);
      }
      if (upstream.status === 401 || upstream.status === 403) {
        return jsonError("Gemini rejected the key or Search grounding is unavailable for this API project.", 503);
      }
      console.error("Grounded mover explanation failed", upstream.status, upstreamStatus ?? "unknown");
      return jsonError("Market explanation could not be completed. Try again shortly.", 502);
    }

    const interaction = parseJsonObject(await upstream.json());
    if (!interaction || interaction.status !== "completed" || !Array.isArray(interaction.steps)) {
      return jsonError("Google Search did not return a completed market explanation.", 502);
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
      return jsonError("The search did not return a cited explanation. Try again shortly.", 502);
    }

    return NextResponse.json(
      {
        asOf: new Date().toISOString(),
        market: "Nifty 500 · NSE",
        snapshotUpdatedAt: lastUpdatedAt,
        stale,
        marketDataStale,
        marketDataAgeCalendarDays,
        answer,
        sources,
      },
      {
        headers: {
          "Cache-Control": "private, max-age=300, stale-while-revalidate=300",
          Vary: "Cookie",
        },
      },
    );
  } catch (error) {
    if (error instanceof Error && error.name === "TimeoutError") {
      return jsonError("Market explanation timed out. Please retry.", 504);
    }
    console.error(
      "TILT market explanation error",
      error instanceof Error ? error.message : "unknown",
    );
    return jsonError("Market explanation is temporarily unavailable.", 503);
  }
}
