"use client";

import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

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
type PricePoint = {symbol:string;market_step:number;pricePaise:number;timestamp:string};
type Portfolio = {session:Session; snapshot:Snapshot; holdings:Record<string,unknown>; transactions:Transaction[]};
type TiltContextValue = {
  authenticated:boolean; loading:boolean; error:string; sessionId:string|null;
  session:Session|null; portfolio:Portfolio|null; market:Market|null;
  histories:Record<string,PricePoint[]>;
  refresh:()=>Promise<void>;
  createSession:()=>Promise<string>;
  placeOrder:(symbol:string,side:"BUY"|"SELL",quantity:number)=>Promise<unknown>;
  advanceMarket:()=>Promise<unknown>;
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
  const pathnameRef = useRef(pathname);
  pathnameRef.current = pathname;

  const bootedRef = useRef(false);
  const bootRef = useRef<() => Promise<void>>(async () => {});

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

  const loadSession = useCallback(async (id:string) => {
    const [p,m] = await Promise.all([
      api<Portfolio>(`/api/sessions/${id}/portfolio`),
      api<Market>(`/api/sessions/${id}/market`),
    ]);

    const historyEntries = await Promise.all(m.companies.map(async company => {
      try {
        const h = await api<{history:Array<{symbol:string;market_step:number;price_paise:number|string;recorded_at:string}>}>(
          `/api/sessions/${id}/market/history?symbol=${encodeURIComponent(company.symbol)}`
        );
        return [company.symbol,h.history.map(point => ({
          symbol:point.symbol, market_step:point.market_step,
          pricePaise:Number(point.price_paise), timestamp:point.recorded_at,
        }))] as const;
      } catch {
        return [company.symbol,[]] as const;
      }
    }));

    // Commit a coherent snapshot together, after all required data has loaded.
    setSessionId(id);
    setSession(p.session);
    setPortfolio(p);
    setMarket(m);
    setHistories(Object.fromEntries(historyEntries));
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
        clearAccountData();
        setError("Sign in to access your simulation.");
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  },[clearAccountData,loadSession]);
  bootRef.current = boot;

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
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, authSession) => {
      if (event === "SIGNED_OUT" || !authSession) {
        bootedRef.current = false;
        clearAccountData();
      } else if (
        event === "SIGNED_IN" &&
        pathnameRef.current !== "/login" &&
        !bootedRef.current
      ) {
        bootedRef.current = true;
        void Promise.resolve().then(() => bootRef.current());
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
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  },[sessionId,boot,loadSession,clearAccountData]);

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
    const result = await api<{result:unknown}>(`/api/sessions/${sessionId}/orders`, {
      method:"POST", headers:{"Content-Type":"application/json"},
      body:JSON.stringify({clientOrderId:crypto.randomUUID(),symbol,side,quantity}),
    });
    await loadSession(sessionId);
    return result.result;
  },[sessionId,loadSession]);

  const advanceMarket = useCallback(async () => {
    if (!sessionId) throw new Error("No active simulation session.");
    const result = await api<{result:unknown}>(`/api/sessions/${sessionId}/market/advance`, {
      method:"POST",
    });
    await loadSession(sessionId);
    return result.result;
  },[sessionId,loadSession]);

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
