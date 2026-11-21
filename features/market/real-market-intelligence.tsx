"use client";

import { useCallback, useEffect, useState } from "react";
import { ExternalLink, Globe2, RefreshCw, ShieldAlert } from "lucide-react";
import MarkdownMessage from "@/features/coach/markdown-message";

type MarketSource = { title: string; url: string };
type MarketStock = {
  symbol: string;
  company: string;
  latest_price: number;
  previous_close: number;
  change_pct: number;
  market_date: string;
  previous_close_date: string;
};
type MarketPulse = {
  source: string;
  dataType: string;
  interval: string;
  collectedAt: string | null;
  latestMarketDate: string | null;
  previousMarketDate: string | null;
  lastUpdatedAt: string | null;
  lastRefreshStatus: string;
  stale: boolean;
  marketDataStale: boolean;
  marketDataAgeCalendarDays: number | null;
  rankingComplete: boolean;
  coverage: { requested: number; available: number; unavailable: number; percent: number } | null;
  gainers: MarketStock[];
  losers: MarketStock[];
  warnings: string[];
};
type MarketBriefing = {
  asOf: string;
  snapshotUpdatedAt: string | null;
  stale: boolean;
  answer: string;
  sources: MarketSource[];
};

const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
});
const time = (value: string | null) =>
  value
    ? new Intl.DateTimeFormat("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "Asia/Kolkata",
      }).format(new Date(value))
    : "Not available";

function errorMessage(payload: unknown, fallback: string) {
  if (
    typeof payload === "object" &&
    payload !== null &&
    "error" in payload &&
    typeof payload.error === "string"
  ) return payload.error;
  return fallback;
}

function MoversList({
  title,
  items,
  tone,
  compact,
}: {
  title: string;
  items: MarketStock[];
  tone: "up" | "down";
  compact: boolean;
}) {
  const positive = tone === "up";
  return (
    <section className="min-w-0">
      <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-2">
        <h3 className="text-xs font-semibold tracking-wide text-slate-200">{title}</h3>
        <span className={positive ? "text-[10px] font-medium text-emerald-300" : "text-[10px] font-medium text-rose-300"}>
          {positive ? "ADVANCERS" : "DECLINERS"}
        </span>
      </div>
      {items.length > 0 ? (
        <div className="divide-y divide-white/[0.06]">
          {items.map((item) => (
            <div key={item.symbol} className="flex items-center justify-between gap-3 py-2.5">
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold text-white">{item.symbol}</p>
                {!compact && <><p className="truncate text-[11px] text-slate-500">{item.company}</p><p className="mt-0.5 text-[10px] text-slate-600">{item.market_date} vs {item.previous_close_date}</p></>}
              </div>
              <div className="shrink-0 text-right">
                <p className="text-xs tabular-nums text-slate-200">{inr.format(item.latest_price)}</p>
                <p className={positive ? "text-[11px] tabular-nums text-emerald-300" : "text-[11px] tabular-nums text-rose-300"}>
                  {item.change_pct > 0 ? "+" : ""}{item.change_pct.toFixed(2)}%
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="py-3 text-xs text-slate-500">No {positive ? "positive" : "negative"} movers in the available data.</p>
      )}
    </section>
  );
}

export default function RealMarketIntelligence({ compact = false }: { compact?: boolean }) {
  const [pulse, setPulse] = useState<MarketPulse | null>(null);
  const [pulseLoading, setPulseLoading] = useState(true);
  const [pulseRefreshing, setPulseRefreshing] = useState(false);
  const [pulseError, setPulseError] = useState("");
  const [briefing, setBriefing] = useState<MarketBriefing | null>(null);
  const [briefingLoading, setBriefingLoading] = useState(false);
  const [briefingError, setBriefingError] = useState("");
  const [briefingRequested, setBriefingRequested] = useState(false);

  const loadPulse = useCallback(async () => {
    try {
      const response = await fetch("/api/market-pulse", {
        method: "GET",
        credentials: "same-origin",
        cache: "no-store",
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(errorMessage(payload, "Could not load the Nifty 500 snapshot."));
      const data = typeof payload === "object" && payload !== null && "data" in payload
        ? (payload.data as MarketPulse)
        : null;
      if (!data || !Array.isArray(data.gainers) || !Array.isArray(data.losers)) {
        throw new Error("The market-pulse endpoint returned an invalid snapshot.");
      }
      setPulse(data);
      setPulseError("");
    } catch (cause) {
      setPulseError(cause instanceof Error ? cause.message : "Nifty 500 data is unavailable.");
    } finally {
      setPulseLoading(false);
      setPulseRefreshing(false);
    }
  }, []);

  const refreshPulse = useCallback(() => {
    setPulseRefreshing(true);
    setPulseError("");
    void loadPulse();
  }, [loadPulse]);

  const loadBriefing = useCallback(async () => {
    setBriefingRequested(true);
    setBriefingLoading(true);
    setBriefingError("");
    try {
      const response = await fetch("/api/market-insights", {
        method: "GET",
        credentials: "same-origin",
        cache: "no-store",
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(errorMessage(payload, "Could not load the market explanation."));
      if (
        typeof payload !== "object" ||
        payload === null ||
        typeof payload.answer !== "string" ||
        !payload.answer.trim() ||
        !Array.isArray(payload.sources)
      ) {
        throw new Error("The explanation service returned an invalid response.");
      }
      setBriefing({
        asOf: typeof payload.asOf === "string" ? payload.asOf : new Date().toISOString(),
        snapshotUpdatedAt: typeof payload.snapshotUpdatedAt === "string" ? payload.snapshotUpdatedAt : null,
        stale: payload.stale === true,
        answer: payload.answer,
        sources: payload.sources.filter(
          (source: unknown): source is MarketSource =>
            typeof source === "object" &&
            source !== null &&
            "title" in source &&
            "url" in source &&
            typeof source.title === "string" &&
            typeof source.url === "string" &&
            source.url.startsWith("https://"),
        ),
      });
    } catch (cause) {
      setBriefingError(cause instanceof Error ? cause.message : "Market explanation is unavailable.");
    } finally {
      setBriefingLoading(false);
    }
  }, []);

  useEffect(() => {
    const request = window.setTimeout(() => {
      void loadPulse();
    }, 0);
    return () => window.clearTimeout(request);
  }, [loadPulse]);

  return (
    <section className={compact
      ? "terminal-news-widget overflow-hidden rounded-lg border border-white/10 bg-[#090909]"
      : "overflow-hidden rounded-2xl border border-sky-300/20 bg-[#101827]"}>
      <div className={compact
        ? "flex flex-wrap items-center justify-between gap-2 border-b border-white/10 px-3 py-3"
        : "flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-5 py-4 md:px-6"}>
        <div className="flex min-w-0 items-center gap-2.5">
          <div className={compact
            ? "flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-sky-300/10 text-sky-200"
            : "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-300/10 text-sky-200"}>
            <Globe2 size={compact ? 14 : 19} />
          </div>
          <div className="min-w-0">
            <p className="text-[9px] font-semibold tracking-[.16em] text-sky-300">NSE · NIFTY 500</p>
            <h2 className={compact ? "mt-0.5 truncate text-xs font-semibold text-white" : "mt-1 text-base font-semibold text-white"}>
              Daily gainers and losers
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={refreshPulse}
            disabled={pulseLoading || pulseRefreshing}
            aria-label="Reload the stored market snapshot"
            title="Reload stored snapshot (does not trigger a market-data fetch)"
            className={compact
              ? "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-white/10 text-slate-300 transition hover:bg-white/[0.04] disabled:opacity-50"
              : "inline-flex min-h-9 items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs font-medium text-slate-300 transition hover:bg-white/[0.04] disabled:opacity-50"}
          >
            <RefreshCw size={13} className={pulseRefreshing ? "animate-spin" : ""} />
            {!compact && "Reload data"}
          </button>
          <button
            type="button"
            onClick={() => void loadBriefing()}
            disabled={briefingLoading || !pulse}
            className={compact
              ? "inline-flex h-7 items-center rounded-md border border-sky-300/20 px-2 text-[10px] font-medium text-sky-200 disabled:opacity-50"
              : "inline-flex min-h-9 items-center gap-2 rounded-lg border border-sky-300/20 bg-sky-300/5 px-3 py-2 text-xs font-medium text-sky-100 transition hover:bg-sky-300/10 disabled:opacity-50"}
          >
            {briefingLoading ? "Explaining…" : "Explain movers"}
          </button>
        </div>
      </div>

      <div className={compact ? "terminal-news-scroll space-y-3 px-3 py-3" : "space-y-4 px-5 py-5 md:px-6"}>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500">
          <span>Source: {pulse?.source ?? "yfinance"}</span>
          <span>Daily bars · historical/delayed</span>
          <span>15-minute refresh target</span>
          {pulse?.lastUpdatedAt && <span>Snapshot: {time(pulse.lastUpdatedAt)} IST</span>}
          {pulse?.latestMarketDate && <span>Common sessions: {pulse.latestMarketDate} vs {pulse.previousMarketDate ?? "—"}</span>}
        </div>

        {pulse?.stale && (
          <p className="rounded-lg border border-amber-300/20 bg-amber-300/[0.05] p-2.5 text-xs text-amber-200">
            Snapshot refresh is stale — the worker has not published successfully within 45 minutes.
          </p>
        )}
        {pulse?.marketDataStale && (
          <p className="rounded-lg border border-amber-300/20 bg-amber-300/[0.05] p-2.5 text-xs text-amber-200">
            Market data is stale — the latest available trading session is {pulse.marketDataAgeCalendarDays ?? "an unknown number of"} calendar days old. A recent fetch time does not make old market data current.
          </p>
        )}
        {pulse && pulse.coverage && (
          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
            <span>{pulse.coverage.available}/{pulse.coverage.requested} stocks priced ({pulse.coverage.percent.toFixed(1)}% coverage)</span>
            <span>{pulse.rankingComplete ? "Complete universe" : "Partial universe — rankings may be incomplete"}</span>
          </div>
        )}
        {pulseLoading && !pulse && (
          <p className="py-3 text-xs text-slate-500" role="status">Loading stored Nifty 500 snapshot…</p>
        )}
        {pulseError && (
          <div role="alert" className="flex items-start gap-2 rounded-lg border border-amber-300/20 bg-amber-300/[0.05] p-3 text-xs text-amber-100">
            <ShieldAlert size={14} className="mt-0.5 shrink-0" />
            <p>{pulseError}</p>
          </div>
        )}
        {pulse && (
          <div className="grid gap-4 sm:grid-cols-2">
            <MoversList title="Top 5 gainers" items={pulse.gainers} tone="up" compact={compact} />
            <MoversList title="Top 5 losers" items={pulse.losers} tone="down" compact={compact} />
          </div>
        )}
        {pulse?.warnings.map((warning) => (
          <p key={warning} className="text-[11px] leading-5 text-amber-200/80">{warning}</p>
        ))}

        {briefingRequested && (
          <div className="space-y-3 border-t border-white/10 pt-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-semibold tracking-wide text-slate-300">SOURCE-GROUNDED COMMENTARY</p>
              {briefing?.snapshotUpdatedAt && (
                <span className="text-[10px] text-slate-500">Based on {time(briefing.snapshotUpdatedAt)} snapshot</span>
              )}
            </div>
            {briefingLoading && (
              <p className="text-xs text-slate-500" role="status">Checking dated company and exchange disclosures for the stored movers…</p>
            )}
            {briefingError && (
              <p className="rounded-lg border border-amber-300/20 bg-amber-300/[0.05] p-3 text-xs text-amber-100" role="alert">
                {briefingError}
              </p>
            )}
            {briefing && (
              <>
                {briefing.stale && <p className="text-xs text-amber-200">The snapshot used for this explanation may be stale.</p>}
                <MarkdownMessage content={briefing.answer} />
                {briefing.sources.length > 0 && (
                  <div className="border-t border-white/10 pt-3">
                    <p className="mb-2 text-[10px] font-semibold tracking-[.16em] text-slate-500">SOURCES</p>
                    <div className="flex flex-wrap gap-2">
                      {briefing.sources.map((source, index) => (
                        <a
                          key={source.url}
                          href={source.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex max-w-full items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.025] px-2.5 py-1.5 text-xs text-slate-300 transition hover:border-sky-300/30 hover:text-sky-200"
                        >
                          <span className="shrink-0 text-sky-300">[{index + 1}]</span>
                          <span className="truncate">{source.title}</span>
                          <ExternalLink size={11} className="shrink-0 opacity-70" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        <div className="flex items-start gap-2 border-t border-white/10 pt-3 text-[11px] leading-5 text-slate-500">
          <ShieldAlert size={14} className="mt-0.5 shrink-0" />
          <p>
            The 15-minute schedule controls refresh attempts, not quote freshness. Rankings compare the same two completed daily sessions for every included stock; today’s daily candle is excluded until after 4:00 pm IST. This feed is historical/delayed, not live. Real-world data never changes TILT’s fictional prices or trades.
          </p>
        </div>
      </div>
    </section>
  );
}
