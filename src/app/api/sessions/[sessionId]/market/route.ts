import { NextResponse } from "next/server";
import { getAuthenticatedSupabase } from "@/lib/supabase/server";
import { isUuid, jsonError } from "@/lib/api/http";

type RouteContext = { params: Promise<{ sessionId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { sessionId } = await context.params;
    if (!isUuid(sessionId)) return jsonError("Invalid session ID.", 400);
    const { supabase, user } = await getAuthenticatedSupabase();
    if (!user) return jsonError("Sign in to view the session market.", 401);

    const { data: session, error: sessionError } = await supabase
      .from("simulation_sessions").select("scenario_id,market_step").eq("id", sessionId).single();
    if (sessionError || !session) return jsonError("Simulation session was not found.", 404);

    const [scenarioResult, companyResult, priceResult, eventResult] = await Promise.all([
      supabase.from("market_scenarios").select("id,name,start_at,interval_ms,charge_rate_bps,minimum_charge_paise").eq("id", session.scenario_id).single(),
      supabase.from("companies").select("symbol,name,sector,description,initial_price_paise").eq("is_active", true).order("symbol"),
      supabase.from("price_points").select("symbol,price_paise,recorded_at").eq("scenario_id", session.scenario_id).eq("market_step", session.market_step),
      supabase.from("market_events").select("id,market_step,title,description,effect_bps,symbol,sector").eq("scenario_id", session.scenario_id).eq("market_step", session.market_step).order("id"),
    ]);
    if (scenarioResult.error || companyResult.error || priceResult.error || eventResult.error) {
      return jsonError("Could not load the market at this session's current step.", 500);
    }

    type CompanyRow = { symbol: string; name: string; sector: string; description: string; initial_price_paise: number | string };
    type PriceRow = { symbol: string; price_paise: number | string; recorded_at: string };
    const companies = (companyResult.data ?? []) as CompanyRow[];
    const prices = Object.fromEntries(((priceResult.data ?? []) as PriceRow[]).map((row) => [row.symbol, {
      pricePaise: Number(row.price_paise), timestamp: row.recorded_at,
    }]));

    return NextResponse.json({
      scenario: scenarioResult.data,
      marketStep: session.market_step,
      companies: companies.map((company) => ({
        symbol: company.symbol,
        name: company.name,
        sector: company.sector,
        description: company.description,
        initialPricePaise: Number(company.initial_price_paise),
        currentPrice: prices[company.symbol] ?? null,
      })),
      events: eventResult.data ?? [],
    }, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return jsonError("Could not load session market. Check Supabase configuration and migration.", 500);
  }
}
