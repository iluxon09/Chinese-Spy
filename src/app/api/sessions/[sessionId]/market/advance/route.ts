import { NextResponse } from "next/server";
import { databaseErrorResponse, isUuid, jsonError } from "@/lib/api/http";
import { getAuthenticatedSupabase } from "@/lib/supabase/server";

type RouteContext = { params: Promise<{ sessionId: string }> };

export async function POST(_request: Request, context: RouteContext) {
  try {
    const { sessionId } = await context.params;
    if (!isUuid(sessionId)) return jsonError("Invalid session ID.", 400);
    const { supabase, user } = await getAuthenticatedSupabase();
    if (!user) return jsonError("Sign in before advancing the market.", 401);
    const { data, error } = await supabase.rpc("advance_market_step", { p_session_id: sessionId });
    if (error) return databaseErrorResponse(error);
    return NextResponse.json({ result: data });
  } catch {
    return jsonError("Could not advance market. Check server configuration.", 500);
  }
}
