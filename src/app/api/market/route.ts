import { NextResponse } from "next/server";
import { getAuthenticatedSupabase } from "@/lib/supabase/server";
import { jsonError } from "@/lib/api/http";

export async function GET() {
  try {
    const { supabase, user } = await getAuthenticatedSupabase();
    if (!user) return jsonError("Sign in to access the fictional market.", 401);

    const [scenarioResult, companiesResult, eventsResult, pricesResult] = await Promise.all([
      supabase.from("market_scenarios").select("id,name,start_at,interval_ms,charge_rate_bps,minimum_charge_paise").eq("id", "tilt-demo-v1").single(),
      supabase.from("companies").select("symbol,name,sector,description,initial_price_paise,is_active").eq("is_active", true).order("symbol"),
      supabase.from("market_events").select("id,scenario_id,market_step,title,description,effect_bps,symbol,sector").eq("scenario_id", "tilt-demo-v1").order("market_step"),
      supabase.from("price_points").select("symbol,market_step,price_paise,recorded_at").eq("scenario_id", "tilt-demo-v1").eq("market_step", 0).order("symbol"),
    ]);
    const error = scenarioResult.error ?? companiesResult.error ?? eventsResult.error ?? pricesResult.error;
    if (error) return jsonError("Could not load market catalogue. Verify the Supabase migration.", 500);

    return NextResponse.json({
      scenario: scenarioResult.data,
      companies: companiesResult.data,
      events: eventsResult.data,
      initialPrices: pricesResult.data,
    });
  } catch {
    return jsonError("Supabase is not configured or the market could not be loaded.", 503);
  }
}
