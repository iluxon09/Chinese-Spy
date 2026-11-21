"use client";

import { useState } from "react";
import { ArrowRight, RefreshCw, TrendingDown, TrendingUp } from "lucide-react";
import Link from "next/link";
import { useTilt } from "@/features/shared/tilt-provider";
import MarketPlaybackControls from "@/features/shared/market-playback-controls";
import PageState from "@/components/ui/page-state";

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

  if (loading) {
    return <PageState variant="loading" title="Loading the simulator" description="Preparing the current market step and playback controls." />;
  }
  if (!authenticated) {
    return <PageState variant="empty" title="Sign in to start a simulation" description="Create a private virtual market session and control how the market advances." action={<Link href="/login" className="tilt-state-action">Sign in / Create account</Link>} />;
  }
  if (!market) {
    return <PageState variant="error" title="The simulation is unavailable" description={error || "TILT could not retrieve the current simulation state. Refresh the page to try again."} />;
  }

  const candleMinutes = Math.max(1, Math.round(market.scenario.interval_ms / 60000));

  return (
    <main className="min-h-screen bg-[#080D19] p-5 text-slate-100 md:p-8">
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

        <section className="grid gap-4 md:grid-cols-2">
          {market.events.length ? market.events.map((event) => (
            <article key={event.id} className="rounded-2xl border border-white/10 bg-[#101827] p-5">
              <p className="text-xs text-amber-300">STEP {event.market_step} NEWS</p>
              <h2 className="mt-2 font-semibold">{event.title}</h2>
              <p className="mt-2 text-sm text-slate-400">{event.description}</p>
              <p className="mt-3 text-xs text-slate-500">
                {event.symbol ?? event.sector} · {(event.effect_bps / 100).toFixed(2)}% effect
              </p>
            </article>
          )) : (
            <p className="text-sm text-slate-500">No scheduled news this candle. Baseline market volatility continues.</p>
          )}
        </section>

        <section className="rounded-2xl border border-white/10 bg-[#101827] p-5">
          <h2 className="font-semibold">Company prices</h2>
          <p className="mt-1 text-xs text-slate-500">Latest movement is measured against the previous candle.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {market.companies.map((company) => {
              const points = histories[company.symbol] ?? [];
              const latest = points[points.length - 1];
              const previous = points[points.length - 2];
              const change = latest && previous && previous.pricePaise > 0
                ? ((latest.pricePaise - previous.pricePaise) / previous.pricePaise) * 100
                : null;

              return (
                <article key={company.symbol} className="rounded-xl border border-white/5 p-4">
                  <p className="font-semibold">{company.symbol}</p>
                  <p className="text-xs text-slate-500">{company.name} · {company.sector}</p>
                  <p className="mt-3 text-xl font-bold">
                    {money(company.currentPrice?.pricePaise ?? company.initialPricePaise)}
                  </p>
                  <p className={change === null ? "mt-1 text-xs text-slate-500" : change >= 0 ? "mt-1 flex items-center gap-1 text-xs text-emerald-300" : "mt-1 flex items-center gap-1 text-xs text-rose-300"}>
                    {change === null ? "Waiting for next candle" : (
                      <>
                        {change >= 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                        {change >= 0 ? "+" : ""}{change.toFixed(2)}% last candle
                      </>
                    )}
                  </p>
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
