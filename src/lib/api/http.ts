import { NextResponse } from "next/server";

export function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export function parseJsonObject(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

export function isUuid(value: unknown): value is string {
  return typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export function databaseErrorResponse(error: { message?: string | null; code?: string | null }) {
  const message = error.message ?? "Database operation failed.";
  if (error.code === "P0001") {
    const known: Record<string, string> = {
      AUTH_REQUIRED: "Sign in is required.",
      SESSION_NOT_FOUND: "Simulation session was not found.",
      UNKNOWN_SCENARIO: "Unknown market scenario.",
      CLIENT_ORDER_ID_REQUIRED: "A unique clientOrderId is required.",
      INVALID_SYMBOL: "Invalid stock symbol.",
      INVALID_SIDE: "Side must be BUY or SELL.",
      IDEMPOTENCY_KEY_REUSED: "This clientOrderId was already used for a different order. Generate a new UUID.",
      INVALID_QUANTITY: "Quantity must be a positive whole number.",
      INVALID_CHARGE_POLICY: "The configured transaction charge policy is invalid.",
      UNKNOWN_SYMBOL: "This company is not available for trading.",
      PRICE_NOT_AVAILABLE: "No price exists for this company at the session's current market step.",
      ORDER_VALUE_OUT_OF_RANGE: "The order value exceeds the supported limit.",
      CHARGES_EXCEED_ORDER_VALUE: "Transaction charges exceed the order value.",
      INSUFFICIENT_CASH: "Insufficient virtual cash for this order.",
      CASH_OUT_OF_RANGE: "The resulting cash balance is outside the supported range.",
      HOLDING_OUT_OF_RANGE: "The resulting holding is outside the supported range.",
      INSUFFICIENT_HOLDINGS: "You do not own enough shares to complete this sell order.",
      PREVIOUS_PRICE_STEP_INCOMPLETE: "The previous market step is incomplete. Contact the project administrator.",
      PRICE_STEP_PARTIAL_DATA: "The target market step contains partial data. Contact the project administrator.",
      INVALID_MARKET_PRICE: "A market event generated an invalid price.",
      INVALID_CRASH_REPLAY_QUESTIONNAIRE: "Complete the risk assessment before starting the replay.",
      INVALID_CRASH_REPLAY_PROFILE: "The calculated risk profile is invalid. Restart the assessment.",
      INVALID_CRASH_REPLAY_LIMIT: "The selected risk limits are invalid. Restart the assessment.",
      CRASH_REPLAY_NOT_FOUND: "Crash replay was not found.",
      CRASH_REPLAY_ATTEMPT_INVALID: "Invalid replay attempt.",
      CRASH_REPLAY_BASELINE_INCOMPLETE: "Complete the baseline attempt before starting reassessment.",
      CRASH_REPLAY_STEP_INCOMPLETE: "Advance through all five market steps before completing this attempt.",
    };
    const code = message.replace(/^.*?:\s*/, "").trim();
    return jsonError(known[code] ?? "The requested operation was rejected.", 400);
  }
  // Do not leak raw SQL, schema details, or credentials to the browser.
  return jsonError("Database operation failed. Check the server logs and Supabase migration.", 500);
}

