"use client";

import { useState } from "react";
import { ArrowRight, RefreshCw, TrendingDown, TrendingUp } from "lucide-react";
import Link from "next/link";
import { useTilt } from "@/features/shared/tilt-provider";
import MarketPlaybackControls from "@/features/shared/market-playback-controls";
import RealMarketIntelligence from "@/features/market/real-market-intelligence";
import {
  calculateLastCandleChange,
  calculateSinceStartChange,
} from "@/lib/market/returns";

const money = (paise: number) => new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
}).format(paise / 100);


export default function SimulatorDashboard() {
  const { loading, error, authenticated, market, histories, advanceMarket, marketAutoPlay } = useTilt();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function advance() {
    if (busy) return;
    setBusy(true);
    setMessage("");
    try {
      await advanceMarket();
      setMessage("New candle recorded. Prices and portfolio values are up to date.");
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : "Market advance failed.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <main className="p-8 text-slate-300">Loading simulator…</main>;
  if (!authenticated || !market) {
    return <main className="p-8 text-slate-400">{error || "Sign in to start a simulation."}</main>;
  }

  const candleMinutes = Math.max(1, Math.round(market.scenario.interval_ms / 60000));

  return (
    <main className="terminal-subpage min-h-screen bg-[#050505] p-5 text-slate-100 md:p-8">
      <div className="mx-auto max-w-7xl space-y-7">
        <header>
          <p className="text-xs tracking-[.25em] text-emerald-400">TILT / SIMULATION CONTROL</p>
          <h1 className="mt-2 text-3xl font-bold">Market Simulator</h1>
          <p className="mt-2 text-sm text-slate-400">
            {market.scenario.name} · {candleMinutes}-minute candles · Continuous stochastic price path
          </p>
        </header>

        <MarketPlaybackControls />

        <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/10 bg-[#101827] p-5">
          <div>
            <p className="text-sm text-emerald-300">Current market step</p>
            <p className="mt-1 text-4xl font-bold tabular-nums">{market.marketStep.toLocaleString("en-IN")}</p>
            <p className="mt-1 text-xs text-slate-400">{candleMinutes} simulated minutes per candle</p>
          </div>
          <button
            type="button"
            onClick={() => void advance()}
            disabled={busy || marketAutoPlay}
            className="rounded-xl bg-white px-5 py-3 font-semibold text-slate-950 disabled:opacity-40"
          >
            <RefreshCw className={busy ? "mr-2 inline animate-spin" : "mr-2 inline"} size={16} />
            {busy ? "Advancing…" : "Advance one candle manually"}
          </button>
        </section>

        {error && <p role="alert" className="rounded-xl border border-red-400/20 bg-red-400/5 p-3 text-sm text-red-200">{error}</p>}
        {message && <p role="status" className="rounded-xl bg-white/5 p-3 text-sm text-slate-300">{message}</p>}

        <RealMarketIntelligence />

        <section className="rounded-2xl border border-sky-300/15 bg-[#101827] p-5">
          <div className="mb-4">
            <p className="text-xs font-semibold tracking-[.18em] text-sky-300">TILT SIMULATED NEWS & CATALYSTS</p>
            <h2 className="mt-1 text-lg font-semibold">Events rolled into this candle</h2>
            <p className="mt-1 text-xs text-slate-400">These fictional catalysts move TILT prices. Real-world news above is context only and never changes the simulator.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {market.events.length ? market.events.map((event) => {
              const simulated = event.id.startsWith("sim:");
              return (
                <article key={event.id} className="rounded-2xl border border-white/10 bg-[#101827] p-5">
                  <p className={simulated ? "text-xs font-semibold tracking-wide text-sky-300" : "text-xs font-semibold tracking-wide text-amber-300"}>
                    {simulated ? "SIMULATED CATALYST" : "SCHEDULED NEWS"} · STEP {event.market_step}
                  </p>
                  <h3 className="mt-2 font-semibold">{event.title}</h3>
                  <p className="mt-2 text-sm text-slate-400">{event.description}</p>
                  <p className="mt-3 text-xs text-slate-500">
                    {event.symbol ?? event.sector} · {event.effect_bps > 0 ? "+" : ""}{(event.effect_bps / 100).toFixed(2)}% simulated impact
                  </p>
                </article>
              );
            }) : (
              <p className="text-sm text-slate-500">No catalyst rolled on this candle. Continuous market, sector and company volatility still applies.</p>
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-[#101827] p-5">
          <h2 className="font-semibold">Company prices</h2>
          <p className="mt-1 text-xs text-slate-500">Each stock shows its last-candle move and its total return since the simulation started.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {market.companies.map((company) => {
              const points = histories[company.symbol] ?? [];
              const currentPrice = company.currentPrice?.pricePaise ?? company.initialPricePaise;
              const candleChange = calculateLastCandleChange(
                points,
                market.marketStep,
                currentPrice,
                company.initialPricePaise,
              );
              const sinceStartChange = calculateSinceStartChange(
                currentPrice,
                company.initialPricePaise,
              );

              return (
                <article key={company.symbol} className="min-w-0 rounded-xl border border-white/5 p-4">
                  <p className="font-semibold">{company.symbol}</p>
                  <p className="text-xs text-slate-500">{company.name} · {company.sector}</p>
                  <p className="mt-3 text-xl font-bold tabular-nums">
                    {money(currentPrice)}
                  </p>
                  <div className="mt-2 space-y-1.5 text-xs tabular-nums">
                    <p className={candleChange === null ? "text-slate-500" : candleChange > 0 ? "flex items-center gap-1 text-emerald-300" : candleChange < 0 ? "flex items-center gap-1 text-rose-300" : "text-slate-400"}>
                      {candleChange === null ? "— last candle" : (
                        <>
                          {candleChange > 0 ? <TrendingUp size={13} /> : candleChange < 0 ? <TrendingDown size={13} /> : null}
                          {candleChange > 0 ? "+" : ""}{candleChange.toFixed(2)}% last candle
                        </>
                      )}
                    </p>
                    <p className={sinceStartChange === null ? "text-slate-500" : sinceStartChange > 0 ? "text-emerald-300" : sinceStartChange < 0 ? "text-rose-300" : "text-slate-400"}>
                      {sinceStartChange === null ? "— since start" : `${sinceStartChange > 0 ? "+" : ""}${sinceStartChange.toFixed(2)}% since start`}
                    </p>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <Link href="/markets" className="inline-flex items-center gap-2 text-sm text-emerald-400">
          Explore market <ArrowRight size={15} />
        </Link>
      </div>
    </main>
  );
}
