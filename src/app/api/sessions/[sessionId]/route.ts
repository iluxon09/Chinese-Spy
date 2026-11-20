import { NextResponse } from "next/server";
import { calculatePortfolioSnapshot } from "@/lib/trading/engine";
import type { PortfolioState, Transaction } from "@/lib/domain/types";
import { getAuthenticatedSupabase } from "@/lib/supabase/server";
import { isUuid, jsonError } from "@/lib/api/http";

type RouteContext = { params: Promise<{ sessionId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { sessionId } = await context.params;
    if (!isUuid(sessionId)) return jsonError("Invalid session ID.", 400);
    const { supabase, user } = await getAuthenticatedSupabase();
    if (!user) return jsonError("Sign in to view this simulation.", 401);

    const { data: session, error: sessionError } = await supabase
      .from("simulation_sessions").select("*").eq("id", sessionId).single();
    if (sessionError || !session) return jsonError("Simulation session was not found.", 404);

    const [holdingsResult, transactionsResult, pricesResult, companiesResult] = await Promise.all([
      supabase.from("holdings").select("session_id,symbol,quantity,total_cost_paise").eq("session_id", sessionId),
      supabase.from("transactions").select("id,session_id,symbol,side,quantity,execution_price_paise,gross_amount_paise,charges_paise,cash_delta_paise,realised_pnl_paise,market_step,created_at").eq("session_id", sessionId).order("created_at", { ascending: true }),
      supabase.from("price_points").select("symbol,price_paise").eq("scenario_id", session.scenario_id).eq("market_step", session.market_step),
      supabase.from("companies").select("symbol,sector").eq("is_active", true),
    ]);
    if (holdingsResult.error || transactionsResult.error || pricesResult.error || companiesResult.error) {
      return jsonError("Could not load complete portfolio data.", 500);
    }

    type HoldingRow = { symbol: string; quantity: number | string; total_cost_paise: number | string };
    type TransactionRow = {
      id: string; session_id: string; symbol: string; side: string; quantity: number | string;
      execution_price_paise: number | string; gross_amount_paise: number | string;
      charges_paise: number | string; cash_delta_paise: number | string;
      realised_pnl_paise: number | string; market_step: number; created_at: string;
    };
    type PriceRow = { symbol: string; price_paise: number | string };
    type CompanySectorRow = { symbol: string; sector: string };
    const holdingRows = (holdingsResult.data ?? []) as HoldingRow[];
    const transactionRows = (transactionsResult.data ?? []) as TransactionRow[];
    const priceRows = (pricesResult.data ?? []) as PriceRow[];
    const companySectorRows = (companiesResult.data ?? []) as CompanySectorRow[];

    const holdings = Object.fromEntries(holdingRows.map((row) => [row.symbol, {
      symbol: row.symbol,
      quantity: Number(row.quantity),
      totalCostPaise: Number(row.total_cost_paise),
    }]));
    const transactions: Transaction[] = transactionRows.map((row) => ({
      id: row.id,
      sessionId: row.session_id,
      symbol: row.symbol,
      side: row.side as "BUY" | "SELL",
      quantity: Number(row.quantity),
      executionPricePaise: Number(row.execution_price_paise),
      grossAmountPaise: Number(row.gross_amount_paise),
      chargesPaise: Number(row.charges_paise),
      cashDeltaPaise: Number(row.cash_delta_paise),
      realisedPnlPaise: Number(row.realised_pnl_paise),
      marketStep: row.market_step,
      timestamp: row.created_at,
    }));
    const state: PortfolioState = {
      session: {
        id: session.id,
        userId: session.user_id,
        scenarioId: session.scenario_id,
        startingCapitalPaise: Number(session.starting_capital_paise),
        cashBalancePaise: Number(session.cash_balance_paise),
        marketStep: session.market_step,
      },
      holdings,
      transactions,
    };
    const prices = Object.fromEntries(priceRows.map((row) => [row.symbol, Number(row.price_paise)]));
    const sectorsBySymbol = Object.fromEntries(companySectorRows.map((row) => [row.symbol, row.sector]));
    const snapshot = calculatePortfolioSnapshot(state, prices, sectorsBySymbol);

    return NextResponse.json({ session, snapshot, holdings, transactions });
  } catch {
    return jsonError("Could not load portfolio. Check Supabase configuration and migration.", 500);
  }
}
