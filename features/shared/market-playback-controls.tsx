"use client";

import { Pause, Play } from "lucide-react";
import { useTilt } from "@/features/shared/tilt-provider";

const SPEED_OPTIONS = [
  { value: 5000, label: "Slow · 5 sec / candle" },
  { value: 2500, label: "Normal · 2.5 sec / candle" },
  { value: 1000, label: "Fast · 1 sec / candle" },
];

export default function MarketPlaybackControls() {
  const {
    loading,
    authenticated,
    market,
    marketAutoPlay,
    setMarketAutoPlay,
    marketPlaybackIntervalMs,
    setMarketPlaybackIntervalMs,
  } = useTilt();

  if (loading || !authenticated || !market) return null;

  const candleMinutes = Math.max(1, Math.round(market.scenario.interval_ms / 60000));

  return (
    <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-emerald-400/20 bg-emerald-400/5 p-4">
      <div className="min-w-[220px]">
        <p className="text-xs font-semibold tracking-[.16em] text-emerald-300">MARKET PLAYBACK</p>
        <p className="mt-1 text-sm text-slate-200">
          {marketAutoPlay ? "Live market is running" : "Market is paused"}
        </p>
        <p className="mt-1 text-xs text-slate-400">
          Each tick advances {candleMinutes} simulated minutes. Playback continues as you move between market, trading and portfolio pages.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <label className="sr-only" htmlFor="market-playback-speed">Market playback speed</label>
        <select
          id="market-playback-speed"
          value={marketPlaybackIntervalMs}
          onChange={(event) => setMarketPlaybackIntervalMs(Number(event.target.value))}
          className="min-h-10 rounded-lg border border-white/10 bg-[#080D19] px-3 text-xs text-slate-200"
        >
          {SPEED_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>

        <button
          type="button"
          aria-pressed={marketAutoPlay}
          onClick={() => setMarketAutoPlay(!marketAutoPlay)}
          className={marketAutoPlay
            ? "inline-flex min-h-10 items-center gap-2 rounded-lg border border-amber-300/30 bg-amber-300/10 px-4 text-sm font-semibold text-amber-100"
            : "inline-flex min-h-10 items-center gap-2 rounded-lg bg-emerald-400 px-4 text-sm font-semibold text-slate-950"}
        >
          {marketAutoPlay ? <Pause size={15} /> : <Play size={15} />}
          {marketAutoPlay ? "Pause market" : "Start live market"}
        </button>
      </div>
    </section>
  );
}
