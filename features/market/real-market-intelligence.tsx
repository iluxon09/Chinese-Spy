"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ExternalLink, Globe2, RefreshCw, ShieldAlert } from "lucide-react";
import MarkdownMessage from "@/features/coach/markdown-message";

type MarketSource = {
  title: string;
  url: string;
};

type MarketBriefing = {
  asOf: string;
  market: string;
  answer: string;
  sources: MarketSource[];
};

export default function RealMarketIntelligence() {
  const [briefing, setBriefing] = useState<MarketBriefing | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const requestControllerRef = useRef<AbortController | null>(null);

  const loadBriefing = useCallback(async (forceRefresh = false) => {
    requestControllerRef.current?.abort();
    const controller = new AbortController();
    requestControllerRef.current = controller;

    if (forceRefresh) {
      setRefreshing(true);
      setError("");
    }

    try {
      const response = await fetch("/api/market-insights", {
        method: "GET",
        credentials: "same-origin",
        cache: forceRefresh ? "no-store" : "default",
        signal: controller.signal,
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        const message =
          typeof payload === "object" &&
          payload !== null &&
          "error" in payload &&
          typeof payload.error === "string"
            ? payload.error
            : "Could not load the real-market briefing.";
        throw new Error(message);
      }

      if (
        typeof payload !== "object" ||
        payload === null ||
        typeof payload.answer !== "string" ||
        !payload.answer.trim() ||
        !Array.isArray(payload.sources)
      ) {
        throw new Error("The market research service returned an invalid briefing.");
      }

      setBriefing({
        asOf: typeof payload.asOf === "string" ? payload.asOf : "Timestamp unavailable",
        market: typeof payload.market === "string" ? payload.market : "India · NSE / BSE",
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
      if (cause instanceof Error && cause.name === "AbortError") return;

      setError(
        cause instanceof Error
          ? cause.message
          : "Live market research is unavailable.",
      );
    } finally {
      if (requestControllerRef.current === controller) {
        requestControllerRef.current = null;
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    void loadBriefing(false);

    return () => {
      const controller = requestControllerRef.current;
      requestControllerRef.current = null;
      controller?.abort();
    };
  }, [loadBriefing]);

  return (
    <section className="overflow-hidden rounded-2xl border border-sky-300/20 bg-[#101827]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-5 py-4 md:px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-300/10 text-sky-200">
            <Globe2 size={19} />
          </div>
          <div>
            <p className="text-xs font-semibold tracking-[.18em] text-sky-300">
              REAL MARKET INTELLIGENCE
            </p>
            <h2 className="mt-1 text-base font-semibold text-white">
              Indian market news & movers
            </h2>
          </div>
        </div>

        <button
          type="button"
          onClick={() => void loadBriefing(true)}
          disabled={loading || refreshing}
          className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs font-medium text-slate-300 transition hover:border-sky-300/30 hover:bg-white/[0.04] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <RefreshCw
            size={13}
            className={refreshing ? "animate-spin" : ""}
          />
          {refreshing ? "Refreshing…" : "Refresh research"}
        </button>
      </div>

      <div className="space-y-4 px-5 py-5 md:px-6">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
          <span>{briefing?.market ?? "India · NSE / BSE"}</span>
          {briefing?.asOf && (
            <>
              <span aria-hidden="true">·</span>
              <span>Research checked {briefing.asOf} IST</span>
            </>
          )}
          <span className="rounded-full border border-sky-300/20 bg-sky-300/5 px-2 py-1 text-[10px] font-semibold tracking-wide text-sky-200">
            WEB-GROUNDED
          </span>
        </div>

        {loading && !briefing && (
          <div className="space-y-3 py-3" role="status" aria-live="polite">
            <div className="h-3 w-2/3 animate-pulse rounded bg-white/10" />
            <div className="h-3 w-full animate-pulse rounded bg-white/10" />
            <div className="h-3 w-5/6 animate-pulse rounded bg-white/10" />
            <p className="pt-2 text-xs text-slate-500">
              Checking the latest completed NSE/BSE session and current market headlines…
            </p>
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-xl border border-amber-300/20 bg-amber-300/[0.06] p-3 text-sm text-amber-100"
          >
            <ShieldAlert size={16} className="mt-0.5 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {briefing && (
          <>
            {refreshing && (
              <p className="text-xs text-sky-200" role="status">
                Updating market research…
              </p>
            )}

            <MarkdownMessage content={briefing.answer} />

            {briefing.sources.length > 0 && (
              <div className="border-t border-white/10 pt-4">
                <p className="mb-2 text-[10px] font-semibold tracking-[.16em] text-slate-500">
                  SOURCES
                </p>
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

        <div className="flex items-start gap-2 border-t border-white/10 pt-4 text-[11px] leading-5 text-slate-500">
          <ShieldAlert size={14} className="mt-0.5 shrink-0" />
          <p>
            Real-world market information may be delayed or revised. This research is
            educational, not investment advice, and it never changes TILT’s fictional
            stock prices or simulation events.
          </p>
        </div>
      </div>
    </section>
  );
}
