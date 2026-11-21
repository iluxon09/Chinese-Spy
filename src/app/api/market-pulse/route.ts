import { NextResponse } from "next/server";
import { getAuthenticatedSupabase } from "@/lib/supabase/server";
import { jsonError } from "@/lib/api/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STALE_AFTER_MS = 45 * 60 * 1000;

type JsonObject = Record<string, unknown>;

function isObject(value: unknown): value is JsonObject {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export async function GET() {
  try {
    const { supabase, user } = await getAuthenticatedSupabase();
    if (!user) return jsonError("Sign in to view Nifty 500 market data.", 401);

    const { data: row, error } = await supabase
      .from("market_pulse_state")
      .select("snapshot,last_success_at,last_attempt_at,last_status")
      .eq("universe_key", "NIFTY_500")
      .maybeSingle();

    if (error) {
      console.error("Nifty 500 snapshot read failed", error.code ?? "unknown");
      return jsonError(
        "Nifty 500 market data is not configured. Apply migration 20261121000800_nifty500_market_pulse.sql.",
        503,
      );
    }

    if (!row || !isObject(row.snapshot)) {
      return jsonError(
        "The first Nifty 500 snapshot has not been generated yet. Configure the scheduled worker and try again after its first run.",
        503,
      );
    }

    const snapshot = row.snapshot;
    const universeSource = isObject(snapshot.universe) ? snapshot.universe : {};
    const universe = { ...universeSource };
    delete universe.members;
    const lastUpdatedAt = typeof row.last_success_at === "string" ? row.last_success_at : null;
    const lastAttemptAt = typeof row.last_attempt_at === "string" ? row.last_attempt_at : null;
    const lastRefreshStatus = typeof row.last_status === "string" ? row.last_status : "unknown";
    const updatedMs = lastUpdatedAt ? Date.parse(lastUpdatedAt) : 0;
    const stale = !updatedMs || Date.now() - updatedMs > STALE_AFTER_MS;

    const warnings: string[] = [];
    if (stale) warnings.push("The last successful snapshot is older than the expected refresh window.");
    if (snapshot.status === "partial") {
      warnings.push("Some constituents could not be priced or the constituent list is using a stale fallback; rankings may be incomplete.");
    }
    if (lastRefreshStatus === "failed") {
      warnings.push("The most recent refresh failed. The previous successful snapshot has been retained.");
    }

    return NextResponse.json(
      {
        ok: true,
        data: {
          universe,
          source: snapshot.source ?? "unknown",
          dataType: snapshot.data_type ?? "daily_historical_or_delayed",
          interval: snapshot.bar_interval ?? "1d",
          refreshIntervalMinutes: snapshot.refresh_interval_minutes ?? 15,
          collectedAt: snapshot.collected_at ?? null,
          latestMarketDate: snapshot.latest_market_date ?? null,
          previousMarketDate: snapshot.previous_market_date ?? null,
          lastUpdatedAt,
          lastAttemptAt,
          lastRefreshStatus,
          stale,
          staleAfterMinutes: 45,
          rankingComplete: snapshot.ranking_complete === true,
          coverage: snapshot.coverage ?? null,
          gainers: Array.isArray(snapshot.gainers) ? snapshot.gainers : [],
          losers: Array.isArray(snapshot.losers) ? snapshot.losers : [],
          stocks: Array.isArray(snapshot.stocks) ? snapshot.stocks : [],
          unavailableSymbols: Array.isArray(snapshot.unavailable_symbols)
            ? snapshot.unavailable_symbols
            : [],
          warnings,
        },
      },
      {
        headers: {
          "Cache-Control": "private, max-age=60, stale-while-revalidate=300",
          Vary: "Cookie",
        },
      },
    );
  } catch (cause) {
    console.error(
      "Nifty 500 market-pulse request failed",
      cause instanceof Error ? cause.message : "unknown",
    );
    return jsonError("Nifty 500 market data is temporarily unavailable.", 503);
  }
}
