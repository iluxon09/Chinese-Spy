import { NextResponse } from "next/server";
import { isUuid, jsonError } from "@/lib/api/http";
import { groupMarketHistoryRows, type MarketHistoryRow } from "@/lib/simulation/market-history";
import { getAuthenticatedSupabase } from "@/lib/supabase/server";

type RouteContext = { params: Promise<{ sessionId: string }> };
const HISTORY_PAGE_SIZE = 1000;
const HISTORY_CANDLE_LIMIT = 500;

export async function GET(request: Request, context: RouteContext) {
  try {
    const { sessionId } = await context.params;
    if (!isUuid(sessionId)) return jsonError("Invalid session ID.", 400);

    const { supabase, user } = await getAuthenticatedSupabase();
    if (!user) return jsonError("Sign in to access price history.", 401);

    const url = new URL(request.url);
    const rawSymbol = url.searchParams.get("symbol");
    const symbol = rawSymbol?.trim().toUpperCase();
    if (rawSymbol !== null && (!symbol || !/^[A-Z0-9]{2,10}$/.test(symbol))) {
      return jsonError("A valid symbol query parameter is required.", 400);
    }

    const { data: session, error: sessionError } = await supabase
      .from("simulation_sessions")
      .select("scenario_id,market_step")
      .eq("id", sessionId)
      .single();

    if (sessionError || !session) {
      return jsonError("Simulation session was not found.", 404);
    }

    // Read all symbols in one API request. Paginate inside the server so
    // Supabase's configured PostgREST row limit cannot silently truncate history.
    const rows: MarketHistoryRow[] = [];
    for (let offset = 0; ; offset += HISTORY_PAGE_SIZE) {
      const baseQuery = supabase
        .from("price_points")
        .select("symbol,market_step,price_paise,recorded_at")
        .eq("scenario_id", session.scenario_id)
        .lte("market_step", session.market_step)
        .gte("market_step", Math.max(0, session.market_step - HISTORY_CANDLE_LIMIT + 1));

      const query = (symbol
        ? baseQuery.eq("symbol", symbol)
        : baseQuery)
        .order("symbol", { ascending: true })
        .order("market_step", { ascending: true })
        .range(offset, offset + HISTORY_PAGE_SIZE - 1);

      const { data, error } = await query;
      if (error) return jsonError("Could not load price history.", 500);

      const page = (data ?? []) as MarketHistoryRow[];
      rows.push(...page);
      if (page.length < HISTORY_PAGE_SIZE) break;
    }

    if (symbol) {
      return NextResponse.json(
        { symbol, history: rows },
        { headers: { "Cache-Control": "private, no-store" } },
      );
    }

    return NextResponse.json(
      { histories: groupMarketHistoryRows(rows) },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch {
    return jsonError("Could not load price history.", 500);
  }
}
