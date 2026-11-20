import { NextResponse } from "next/server";
import { getAuthenticatedSupabase } from "@/lib/supabase/server";
import { databaseErrorResponse, jsonError, parseJsonObject } from "@/lib/api/http";

export async function GET() {
  try {
    const { supabase, user } = await getAuthenticatedSupabase();
    if (!user) return jsonError("Sign in to view your simulations.", 401);
    const { data, error } = await supabase
      .from("simulation_sessions")
      .select("id,scenario_id,starting_capital_paise,cash_balance_paise,market_step,created_at,updated_at")
      .order("created_at", { ascending: false });
    if (error) return jsonError("Could not load simulation sessions.", 500);
    return NextResponse.json({ sessions: data });
  } catch {
    return jsonError("Supabase is not configured.", 503);
  }
}

export async function POST(request: Request) {
  try {
    const { supabase, user } = await getAuthenticatedSupabase();
    if (!user) return jsonError("Sign in before creating a simulation.", 401);

    const rawBody = await request.text();
    let body: Record<string, unknown> | null = {};
    if (rawBody.trim().length > 0) {
      try {
        body = parseJsonObject(JSON.parse(rawBody));
      } catch {
        return jsonError("Request body must contain valid JSON.", 400);
      }
      if (!body) return jsonError("Request body must be a JSON object.", 400);
    }
    const scenarioId = body.scenarioId === undefined ? "tilt-demo-v1" : body.scenarioId;
    if (typeof scenarioId !== "string" || !/^[a-z0-9-]{2,64}$/.test(scenarioId)) {
      return jsonError("scenarioId must be a valid scenario identifier.", 400);
    }

    const { data, error } = await supabase.rpc("create_simulation_session", {
      p_scenario_id: scenarioId,
    });
    if (error) return databaseErrorResponse(error);
    return NextResponse.json({ session: data }, { status: 201 });
  } catch {
    return jsonError("Supabase is not configured.", 503);
  }
}
