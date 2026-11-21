import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({
    service: "TILT Financial Universe API",
    authentication: "Supabase Auth cookie session required for all routes except /api/health and /api/docs.",
    moneyUnit: "All monetary fields ending in _paise are integer paise; 100 paise = ₹1.",
    endpoints: [
      { method: "GET", path: "/api/health", purpose: "Liveness check." },
      { method: "GET", path: "/api/market-insights", purpose: "Authenticated Google Search-grounded Indian market briefing; one refresh per 5 minutes and 20 per UTC day per user." },
      { method: "GET", path: "/api/market", purpose: "Read scenario, fictional companies, events and initial prices." },
      { method: "GET", path: "/api/sessions", purpose: "List the signed-in user's simulation sessions." },
      { method: "POST", path: "/api/sessions", body: { scenarioId: "tilt-demo-v1" }, purpose: "Create a ₹10,00,000 simulation session." },
      { method: "GET", path: "/api/sessions/{sessionId}", purpose: "Read session, holdings, transactions and calculated portfolio snapshot." },
      { method: "GET", path: "/api/sessions/{sessionId}/portfolio", purpose: "Read the calculated portfolio snapshot (same data as the session GET route)." },
      { method: "GET", path: "/api/sessions/{sessionId}/market", purpose: "Read current session market prices, current-step news events and scenario charge metadata." },
      { method: "POST", path: "/api/sessions/{sessionId}/orders", body: { clientOrderId: "UUID", symbol: "ASTE", side: "BUY", quantity: 10 }, purpose: "Execute an idempotent market order at the saved simulated market price." },
      { method: "GET", path: "/api/sessions/{sessionId}/transactions?limit=100", purpose: "Read the latest transactions; limit is capped at 500." },
      { method: "POST", path: "/api/sessions/{sessionId}/market/advance", purpose: "Advance the shared fictional market by one deterministic step; sessions are capped at 10,000 steps." },
      { method: "POST", path: "/api/ai/chat", purpose: "Authenticated Gemini Risk Coach stream; limited to 6 requests per minute and 50 requests per UTC day per user." },
      { method: "GET", path: "/api/sessions/{sessionId}/market/history?symbol=ASTE", purpose: "Read symbol history up to the session's current market step." },
    ],
    orderRules: [
      "The API does not accept a client-supplied execution price.",
      "BUY orders require sufficient cash including charges.",
      "SELL orders require sufficient holdings.",
      "clientOrderId must be a UUID and is unique per session for safe retries.",
      "Cash, holdings and transaction history are written in one database transaction.",
    ],
    demoChargePolicy: {
      configuredPerScenario: true,
      note: "Initial scenario uses 10 basis points (0.10%) and no minimum, as a provisional educational assumption; not an official Indian brokerage/statutory fee schedule. Change market_scenarios only through a trusted database administrator.",
    },
  });
}
