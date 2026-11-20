import { NextResponse } from "next/server";
import { isUuid, jsonError } from "@/lib/api/http";
import { getAuthenticatedSupabase } from "@/lib/supabase/server";

type RouteContext = { params: Promise<{ sessionId: string }> };

export async function GET(request: Request, context: RouteContext) {
  try {
    const { sessionId } = await context.params;
    if (!isUuid(sessionId)) return jsonError("Invalid session ID.", 400);
    const { supabase, user } = await getAuthenticatedSupabase();
    if (!user) return jsonError("Sign in to access price history.", 401);
    const url = new URL(request.url);
    const symbol = url.searchParams.get("symbol")?.trim().toUpperCase();
    if (!symbol || !/^[A-Z0-9]{2,10}$/.test(symbol)) return jsonError("A valid symbol query parameter is required.", 400);

    const { data: session, error: sessionError } = await supabase.from("simulation_sessions")
      .select("scenario_id,market_step").eq("id", sessionId).single();
    if (sessionError || !session) return jsonError("Simulation session was not found.", 404);
    const { data, error } = await supabase.from("price_points").select("symbol,market_step,price_paise,recorded_at")
      .eq("scenario_id", session.scenario_id).eq("symbol", symbol)
      .lte("market_step", session.market_step).order("market_step", { ascending: true });
    if (error) return jsonError("Could not load price history.", 500);
    return NextResponse.json({ symbol, history: data });
  } catch {
    return jsonError("Could not load price history.", 500);
  }
}
