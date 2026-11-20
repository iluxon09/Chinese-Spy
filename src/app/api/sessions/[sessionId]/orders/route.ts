import { NextResponse } from "next/server";
import { databaseErrorResponse, isUuid, jsonError, parseJsonObject } from "@/lib/api/http";
import { getAuthenticatedSupabase } from "@/lib/supabase/server";

type RouteContext = { params: Promise<{ sessionId: string }> };

export async function POST(request: Request, context: RouteContext) {
  try {
    const { sessionId } = await context.params;
    if (!isUuid(sessionId)) return jsonError("Invalid session ID.", 400);

    const { supabase, user } = await getAuthenticatedSupabase();
    if (!user) return jsonError("Sign in before placing an order.", 401);

    const body = parseJsonObject(await request.json().catch(() => null));
    if (!body) return jsonError("Request body must be a JSON object.", 400);
    const symbol = typeof body.symbol === "string" ? body.symbol.trim().toUpperCase() : "";
    const side = body.side;
    const quantity = body.quantity;
    const clientOrderId = body.clientOrderId;

    if (!/^[A-Z0-9]{2,10}$/.test(symbol)) return jsonError("A valid company symbol is required.", 400);
    if (side !== "BUY" && side !== "SELL") return jsonError("side must be BUY or SELL.", 400);
    if (typeof quantity !== "number" || !Number.isSafeInteger(quantity) || quantity <= 0) return jsonError("quantity must be a positive whole number.", 400);
    if (!isUuid(clientOrderId)) return jsonError("A unique clientOrderId UUID is required.", 400);

    const { data, error } = await supabase.rpc("place_market_order", {
      p_session_id: sessionId,
      p_client_order_id: clientOrderId,
      p_symbol: symbol,
      p_side: side,
      p_quantity: Number(quantity),
    });
    if (error) return databaseErrorResponse(error);
    return NextResponse.json({ result: data });
  } catch {
    return jsonError("Could not place order. Check server configuration.", 500);
  }
}
