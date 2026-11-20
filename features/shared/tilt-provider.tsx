"use client";

import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState,
  type ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import {
  appendMarketPricePoints,
  type AdvancedPricePoint,
  type PriceHistoryPoint,
} from "@/lib/simulation/market-history";

type Session = {
  id: string;
  scenario_id: string;
  starting_capital_paise: number | string;
  cash_balance_paise: number | string;
  market_step: number;
};
type HoldingValue = {
  symbol: string; quantity: number; currentPricePaise: number;
  averagePurchasePricePaise: number; totalCostPaise: number;
  marketValuePaise: number; unrealisedPnlPaise: number;
};
type Snapshot = {
  cashBalancePaise: number; investedAmountPaise: number;
  holdingsValuePaise: number; portfolioValuePaise: number;
  realisedPnlPaise: number; unrealisedPnlPaise: number;
  totalPnlPaise: number; returnPercent: number;
  holdings: HoldingValue[];
  allocation: Array<{symbol:string; marketValuePaise:number; weightBps:number}>;
  sectorAllocation: Array<{sector:string; marketValuePaise:number; weightBps:number}>;
};
type Transaction = {
  id:string; symbol:string; side:"BUY"|"SELL"; quantity:number;
  executionPricePaise:number; grossAmountPaise:number; chargesPaise:number;
  cashDeltaPaise:number; realisedPnlPaise:number; marketStep:number; timestamp:string;
};
type Company = {
  symbol:string; name:string; sector:string; description:string;
  initialPricePaise:number;
  currentPrice:{pricePaise:number;timestamp:string}|null;
};
type MarketEvent = {
  id:string; market_step:number; title:string; description:string;
  effect_bps:number; symbol?:string|null; sector?:string|null;
};
type Market = {
  scenario:{id:string;name:string;charge_rate_bps:number;minimum_charge_paise:number};
  marketStep:number; companies:Company[]; events:MarketEvent[];
};
type PricePoint = PriceHistoryPoint;
type Portfolio = {session:Session; snapshot:Snapshot; holdings:Record<string,unknown>; transactions:Transaction[]};
type MarketAdvanceResult = {
  scenarioId: string;
  marketStep: number;
  eventsApplied: MarketEvent[];
  pricePoints: AdvancedPricePoint[];
};
type TiltContextValue = {
  authenticated:boolean; loading:boolean; error:string; sessionId:string|null;
  session:Session|null; portfolio:Portfolio|null; market:Market|null;
  histories:Record<string,PricePoint[]>;
  refresh:()=>Promise<void>;
  createSession:()=>Promise<string>;
  placeOrder:(symbol:string,side:"BUY"|"SELL",quantity:number)=>Promise<unknown>;
  advanceMarket:()=>Promise<MarketAdvanceResult>;
};

const TiltContext = createContext<TiltContextValue|null>(null);

async function api<T>(url:string, init?:RequestInit):Promise<T> {
  const response = await fetch(url, { credentials:"same-origin", cache:"no-store", ...init });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error ?? body.message ?? `Request failed (${response.status})`);
  return body as T;
}

export function TiltDataProvider({children}:{children:ReactNode}) {
  const pathname = usePathname();
  const router = useRouter();
  const bootedRef = useRef(false);
  const orderInFlightRef = useRef(false);
  const marketAdvanceInFlightRef = useRef(false);
  const [authenticated,setAuthenticated] = useState(false);
  const [loading,setLoading] = useState(true);
  const [error,setError] = useState("");
  const [sessionId,setSessionId] = useState<string|null>(null);
  const [session,setSession] = useState<Session|null>(null);
  const [portfolio,setPortfolio] = useState<Portfolio|null>(null);
  const [market,setMarket] = useState<Market|null>(null);
  const [histories,setHistories] = useState<Record<string,PricePoint[]>>({});

  const clearAccountData = useCallback(() => {
    setAuthenticated(false);
    setLoading(false);
    setError("");
    setSessionId(null);
    setSession(null);
    setPortfolio(null);
    setMarket(null);
    setHistories({});
  }, []);

  // A portfolio-only refresh is sufficient after orders and market advancement.
  // It deliberately does not reload the unchanged market metadata or full history.
  const refreshPortfolioSnapshot = useCallback(async (id:string) => {
    const nextPortfolio = await api<Portfolio>(`/api/sessions/${id}/portfolio`);
    setSession(nextPortfolio.session);
    setPortfolio(nextPortfolio);
    return nextPortfolio;
  },[]);

  const loadSession = useCallback(async (id:string) => {
    const [p,m,h] = await Promise.all([
      api<Portfolio>(`/api/sessions/${id}/portfolio`),
      api<Market>(`/api/sessions/${id}/market`),
      api<{histories:Record<string,PricePoint[]>}>(`/api/sessions/${id}/market/history`),
    ]);

    // Initial/full refresh now uses three concurrent reads, not one history
    // request per company. History is fetched in bulk and cached client-side.
    setSessionId(id);
    setSession(p.session);
    setPortfolio(p);
    setMarket(m);
    setHistories(h.histories ?? {});
  },[]);

  const boot = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await api<{sessions:Session[]}>("/api/sessions");
      const selected = result.sessions?.[0];

      if (!selected) {
        const created = await api<{session:{id:string}}>("/api/sessions", {
          method:"POST", headers:{"Content-Type":"application/json"},
          body:JSON.stringify({scenarioId:"tilt-demo-v1"}),
        });
        await loadSession(created.session.id);
      } else {
        await loadSession(selected.id);
      }
      setAuthenticated(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not load TILT.";
      if (/sign in|unauthorized|401/i.test(message)) {
        bootedRef.current = false;
        clearAccountData();
        setError("Sign in to access your simulation.");
        router.replace("/login");
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  },[clearAccountData,loadSession,router]);

  // Boot once per authenticated session, not on every client-side route change.
  useEffect(() => {
    if (pathname === "/login" || bootedRef.current) return;
    bootedRef.current = true;
    void Promise.resolve().then(boot);
  },[pathname,boot]);

  // Clear stale portfolio data on sign-out. A subsequent login will boot when
  // the protected route becomes active again.
  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) return;

    const supabase = createSupabaseBrowserClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        bootedRef.current = false;
        clearAccountData();
      }
    });

    return () => subscription.unsubscribe();
  },[clearAccountData]);

  const refresh = useCallback(async () => {
    if (!sessionId) {
      await boot();
      return;
    }
    setLoading(true);
    setError("");
    try {
      await loadSession(sessionId);
    } catch(err) {
      const message = err instanceof Error ? err.message : "Refresh failed.";
      if (/sign in|unauthorized|401/i.test(message)) {
        bootedRef.current = false;
        clearAccountData();
        setError("Your session has expired. Sign in again.");
        router.replace("/login");
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  },[sessionId,boot,loadSession,clearAccountData,router]);

  const createSession = useCallback(async () => {
    const created = await api<{session:{id:string}}>("/api/sessions", {
      method:"POST", headers:{"Content-Type":"application/json"},
      body:JSON.stringify({scenarioId:"tilt-demo-v1"}),
    });
    await loadSession(created.session.id);
    setAuthenticated(true);
    return created.session.id;
  },[loadSession]);

  const placeOrder = useCallback(async (symbol:string,side:"BUY"|"SELL",quantity:number) => {
    if (!sessionId) throw new Error("No active simulation session.");
    if (orderInFlightRef.current) throw new Error("An order is already being processed. Please wait.");

    orderInFlightRef.current = true;
    setError("");
    try {
      const result = await api<{result:unknown}>(`/api/sessions/${sessionId}/orders`, {
        method:"POST", headers:{"Content-Type":"application/json"},
        body:JSON.stringify({clientOrderId:crypto.randomUUID(),symbol,side,quantity}),
      });

      // The order is committed at this point. If the following read fails, do
      // not report the order itself as failed or encourage an unsafe resubmit.
      try {
        await refreshPortfolioSnapshot(sessionId);
      } catch (refreshError) {
        const message = refreshError instanceof Error ? refreshError.message : "Unknown refresh error.";
        setError(`Order completed, but portfolio refresh failed: ${message}. Use Refresh to reconcile the display.`);
      }

      return result.result;
    } finally {
      orderInFlightRef.current = false;
    }
  },[sessionId,refreshPortfolioSnapshot]);

  const advanceMarket = useCallback(async ():Promise<MarketAdvanceResult> => {
    if (!sessionId) throw new Error("No active simulation session.");
    if (marketAdvanceInFlightRef.current) throw new Error("Market advancement is already in progress.");

    marketAdvanceInFlightRef.current = true;
    setError("");
    try {
      const response = await api<{result:MarketAdvanceResult}>(`/api/sessions/${sessionId}/market/advance`, {
        method:"POST",
      });
      const advanced = response.result;

      // The atomic RPC already returns the committed market step, prices and
      // events. Apply that payload directly instead of re-fetching the market
      // and all eight historical series after every step.
      setMarket((current) => current ? {
        ...current,
        marketStep: advanced.marketStep,
        events: advanced.eventsApplied ?? [],
        companies: current.companies.map((company) => {
          const point = advanced.pricePoints.find((item) => item.symbol === company.symbol);
          return point
            ? { ...company, currentPrice: { pricePaise: Number(point.pricePaise), timestamp: point.timestamp } }
            : company;
        }),
      } : current);

      setSession((current) => current ? { ...current, market_step: advanced.marketStep } : current);
      setHistories((current) => appendMarketPricePoints(current, advanced.pricePoints ?? []));

      // Portfolio valuation is price-dependent, so refresh just this snapshot.
      // If the read fails, keep the successfully advanced market state visible.
      try {
        await refreshPortfolioSnapshot(sessionId);
      } catch (refreshError) {
        const message = refreshError instanceof Error ? refreshError.message : "Unknown refresh error.";
        setError(`Market advanced to step ${advanced.marketStep}, but portfolio refresh failed: ${message}. Use Refresh to reconcile the display.`);
      }

      return advanced;
    } finally {
      marketAdvanceInFlightRef.current = false;
    }
  },[sessionId,refreshPortfolioSnapshot]);

  const value = useMemo<TiltContextValue>(() => ({
    authenticated,loading,error,sessionId,session,portfolio,market,histories,
    refresh,createSession,placeOrder,advanceMarket,
  }),[authenticated,loading,error,sessionId,session,portfolio,market,histories,refresh,createSession,placeOrder,advanceMarket]);

  return <TiltContext.Provider value={value}>{children}</TiltContext.Provider>;
}

export function useTilt() {
  const value = useContext(TiltContext);
  if (!value) throw new Error("useTilt must be used inside TiltDataProvider.");
  return value;
}
