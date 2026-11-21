"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  Search,
  Star,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useTilt } from "@/features/shared/tilt-provider";
import MarketPlaybackControls from "@/features/shared/market-playback-controls";
import RealMarketIntelligence from "@/features/market/real-market-intelligence";

const money = (paise: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(paise / 100);

function percentChange(currentPaise: number, referencePaise: number) {
  if (
    !Number.isFinite(currentPaise) ||
    !Number.isFinite(referencePaise) ||
    currentPaise < 0 ||
    referencePaise <= 0
  ) {
    return null;
  }

  return ((currentPaise - referencePaise) / referencePaise) * 100;
}

function lastCandleChange(
  points: readonly { market_step: number; pricePaise: number }[],
  currentStep: number,
  currentPricePaise: number,
  initialPricePaise: number,
) {
  let previousPricePaise: number | null = null;
  let previousStep = -1;

  for (const point of points) {
    if (
      Number.isSafeInteger(point.market_step) &&
      point.market_step < currentStep &&
      point.market_step > previousStep
    ) {
      previousStep = point.market_step;
      previousPricePaise = point.pricePaise;
    }
  }

  if (previousPricePaise === null && currentStep === 1) {
    previousPricePaise = initialPricePaise;
  }

  return previousPricePaise === null
    ? null
    : percentChange(currentPricePaise, previousPricePaise);
}

function scenarioChange(currentPaise: number, initialPaise: number) {
  return percentChange(currentPaise, initialPaise);
}

export default function MarketsPage() {
  const { loading, error, authenticated, market, histories } = useTilt();
  const [query, setQuery] = useState("");
  const [sector, setSector] = useState("All");
  const [selectedSymbol, setSelectedSymbol] = useState("");
  const [watchlist, setWatchlist] = useState<string[]>([]);
  const [watchOnly, setWatchOnly] = useState(false);

  const companies = market?.companies ?? [];
  const selected =
    companies.find((company) => company.symbol === selectedSymbol) ?? companies[0];
  const sectors = useMemo(
    () => ["All", ...Array.from(new Set(companies.map((company) => company.sector))).sort()],
    [companies],
  );

  const companyRows = useMemo(
    () =>
      companies.map((company) => {
        const points = histories[company.symbol] ?? [];
        const currentPrice = company.currentPrice?.pricePaise ?? company.initialPricePaise;
        return {
          ...company,
          currentPrice,
          candleChange: lastCandleChange(points, market?.marketStep ?? 0, currentPrice, company.initialPricePaise),
          scenarioChange: scenarioChange(currentPrice, company.initialPricePaise),
        };
      }),
    [companies, histories, market?.marketStep],
  );

  const filteredCompanies = useMemo(
    () =>
      companyRows.filter((company) =>
        (sector === "All" || company.sector === sector) &&
        (!watchOnly || watchlist.includes(company.symbol)) &&
        `${company.symbol} ${company.name} ${company.sector}`
          .toLowerCase()
          .includes(query.toLowerCase()),
      ),
    [companyRows, query, sector, watchOnly, watchlist],
  );

  if (loading) return <main className="p-8 text-slate-300">Loading fictional market…</main>;
  if (!authenticated || !market) {
    return <main className="p-8 text-slate-400">{error || "Sign in to view the market."}</main>;
  }

  const activeHistory = selected ? histories[selected.symbol] ?? [] : [];
  const chartData = activeHistory.map((point) => ({
    step: `#${point.market_step}`,
    price: point.pricePaise / 100,
  }));
  const activePrice = selected?.currentPrice?.pricePaise ?? selected?.initialPricePaise ?? 0;
  const activeChange = selected
    ? lastCandleChange(activeHistory, market.marketStep, activePrice, selected.initialPricePaise)
    : null;
  const activeScenarioChange = selected
    ? scenarioChange(activePrice, selected.initialPricePaise)
    : null;
  const candleMinutes = Math.max(1, Math.round(market.scenario.interval_ms / 60000));
  const positiveCount = companyRows.filter((company) => (company.scenarioChange ?? 0) > 0).length;
  const negativeCount = companyRows.filter((company) => (company.scenarioChange ?? 0) < 0).length;
  const watchCompanies = companyRows.filter((company) => watchlist.includes(company.symbol));

  function toggleWatchlist(symbol: string) {
    setWatchlist((current) =>
      current.includes(symbol)
        ? current.filter((item) => item !== symbol)
        : [...current, symbol],
    );
  }

  return (
    <main className="min-h-screen bg-[#080D19] p-5 text-slate-100 md:p-8">
      <div className="mx-auto max-w-7xl space-y-7">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold tracking-[.25em] text-emerald-400">TILT / FICTIONAL EXCHANGE</p>
            <h1 className="mt-2 text-3xl font-bold">Markets</h1>
            <p className="mt-2 text-sm text-slate-400">
              Explore the simulated market, monitor company prices and build a personal watchlist.
            </p>
          </div>
          <div className="rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1.5 text-xs font-medium text-amber-200">
            SIMULATED DATA · STEP {market.marketStep}
          </div>
        </header>

        <MarketPlaybackControls />

        <RealMarketIntelligence />

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Market summary">
          <article className="rounded-2xl border border-white/10 bg-[#101827] p-5">
            <p className="text-xs font-semibold tracking-wider text-slate-500">MARKET STEP</p>
            <p className="mt-3 text-2xl font-bold tabular-nums">{market.marketStep.toLocaleString("en-IN")}</p>
            <p className="mt-2 text-xs text-slate-500">{candleMinutes} simulated minutes per candle</p>
          </article>
          <article className="rounded-2xl border border-white/10 bg-[#101827] p-5">
            <p className="text-xs font-semibold tracking-wider text-slate-500">ACTIVE COMPANIES</p>
            <p className="mt-3 text-2xl font-bold tabular-nums">{companies.length}</p>
            <p className="mt-2 text-xs text-slate-500">{sectors.length - 1} represented sectors</p>
          </article>
          <article className="rounded-2xl border border-white/10 bg-[#101827] p-5">
            <p className="text-xs font-semibold tracking-wider text-slate-500">UP SINCE SCENARIO START</p>
            <p className="mt-3 flex items-center gap-2 text-2xl font-bold text-emerald-300">
              <TrendingUp size={19} /> {positiveCount}
            </p>
            <p className="mt-2 text-xs text-slate-500">Company prices above their initial values</p>
          </article>
          <article className="rounded-2xl border border-white/10 bg-[#101827] p-5">
            <p className="text-xs font-semibold tracking-wider text-slate-500">DOWN SINCE SCENARIO START</p>
            <p className="mt-3 flex items-center gap-2 text-2xl font-bold text-rose-300">
              <TrendingDown size={19} /> {negativeCount}
            </p>
            <p className="mt-2 text-xs text-slate-500">Company prices below their initial values</p>
          </article>
        </section>

        {error && (
          <div role="alert" className="rounded-xl border border-red-400/20 bg-red-400/5 p-4 text-sm text-red-200">
            {error}
          </div>
        )}

        {market.events.length > 0 && (
          <section className="rounded-2xl border border-amber-400/20 bg-amber-400/5 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold tracking-[.18em] text-amber-300">MARKET NEWS</p>
                <h2 className="mt-1 text-lg font-semibold">Events affecting this candle</h2>
              </div>
              <span className="rounded-full bg-amber-300/10 px-3 py-1 text-xs text-amber-200">
                {market.events.length} event{market.events.length === 1 ? "" : "s"}
              </span>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {market.events.map((event) => (
                <article key={event.id} className="rounded-xl border border-white/10 bg-[#101827]/70 p-4">
                  <p className="text-xs text-amber-300">STEP {event.market_step}</p>
                  <h3 className="mt-2 font-semibold">{event.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-400">{event.description}</p>
                  <p className="mt-3 text-xs text-slate-500">
                    {event.symbol ?? event.sector} · {(event.effect_bps / 100).toFixed(2)}% scripted effect
                  </p>
                </article>
              ))}
            </div>
          </section>
        )}

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(300px,.85fr)]">
          <article className="rounded-2xl border border-white/10 bg-[#101827] p-5 md:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold tracking-[.18em] text-slate-500">SELECTED INSTRUMENT</p>
                <h2 className="mt-2 text-2xl font-bold">{selected?.name ?? "Select a company"}</h2>
                <p className="mt-1 text-sm text-slate-400">{selected?.symbol} · {selected?.sector}</p>
              </div>
              {selected && (
                <button
                  type="button"
                  onClick={() => toggleWatchlist(selected.symbol)}
                  aria-pressed={watchlist.includes(selected.symbol)}
                  className={watchlist.includes(selected.symbol)
                    ? "inline-flex items-center gap-2 rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-xs font-semibold text-amber-200"
                    : "inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs text-slate-300 hover:bg-white/5"}
                >
                  <Star size={14} fill={watchlist.includes(selected.symbol) ? "currentColor" : "none"} />
                  {watchlist.includes(selected.symbol) ? "In watchlist" : "Add to watchlist"}
                </button>
              )}
            </div>

            {selected && (
              <>
                <div className="mt-5 flex flex-wrap items-end gap-x-4 gap-y-2">
                  <p className="text-3xl font-bold tabular-nums">{money(activePrice)}</p>
                  <div className="flex flex-wrap items-center gap-3 text-sm">
                    <span className={activeChange === null ? "text-slate-500" : activeChange >= 0 ? "inline-flex items-center gap-1 text-emerald-300" : "inline-flex items-center gap-1 text-rose-300"}>
                      {activeChange === null ? "Waiting for next candle" : (
                        <>
                          {activeChange >= 0 ? <ArrowUpRight size={15} /> : <ArrowDownRight size={15} />}
                          {activeChange >= 0 ? "+" : ""}{activeChange.toFixed(2)}% last candle
                        </>
                      )}
                    </span>
                    {activeScenarioChange !== null && (
                      <span className={activeScenarioChange >= 0 ? "text-emerald-300/80" : "text-rose-300/80"}>
                        {activeScenarioChange >= 0 ? "+" : ""}{activeScenarioChange.toFixed(2)}% since start
                      </span>
                    )}
                  </div>
                </div>
                <p className="mt-2 text-xs text-slate-500">{selected.description} · Simulated price history, not live exchange data.</p>

                <div className="mt-5 h-[290px] w-full">
                  {chartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="tiltUploadedMarketGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#34D399" stopOpacity={0.28} />
                            <stop offset="100%" stopColor="#34D399" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid stroke="#ffffff10" vertical={false} />
                        <XAxis dataKey="step" stroke="#64748b" tickLine={false} axisLine={false} minTickGap={24} />
                        <YAxis stroke="#64748b" tickLine={false} axisLine={false} width={62} tickFormatter={(value) => `₹${Number(value).toLocaleString("en-IN")}`} domain={["auto", "auto"]} />
                        <Tooltip
                          contentStyle={{ backgroundColor: "#101827", border: "1px solid #334155", borderRadius: 12, color: "#fff" }}
                          formatter={(value) => [money(Number(value) * 100), "Simulated price"]}
                        />
                        <Area type="monotone" dataKey="price" stroke="#34D399" strokeWidth={2.2} fill="url(#tiltUploadedMarketGradient)" activeDot={{ r: 4 }} />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-white/10 text-sm text-slate-500">
                      Price history will appear as the market advances.
                    </div>
                  )}
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Link href="/trading" className="rounded-lg bg-emerald-400 px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-emerald-300">
                    Trade {selected.symbol}
                  </Link>
                  <button
                    type="button"
                    onClick={() => setSelectedSymbol("")}
                    className="rounded-lg border border-white/10 px-4 py-2.5 text-sm text-slate-300 hover:bg-white/5"
                  >
                    Reset selection
                  </button>
                </div>
              </>
            )}
          </article>

          <aside className="rounded-2xl border border-white/10 bg-[#101827] p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold tracking-[.18em] text-slate-500">PERSONAL LIST</p>
                <h2 className="mt-1 text-lg font-semibold">Your watchlist</h2>
              </div>
              <Star size={18} className="text-amber-300" />
            </div>
            {watchCompanies.length > 0 ? (
              <div className="mt-4 space-y-2">
                {watchCompanies.map((company) => (
                  <button
                    key={company.symbol}
                    type="button"
                    onClick={() => setSelectedSymbol(company.symbol)}
                    className={selected?.symbol === company.symbol
                      ? "w-full rounded-xl border border-emerald-400/30 bg-emerald-400/10 p-3 text-left"
                      : "w-full rounded-xl border border-white/5 p-3 text-left hover:bg-white/5"}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold">{company.symbol}</p>
                        <p className="mt-1 text-xs text-slate-500">{company.name}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">{money(company.currentPrice)}</p>
                        <p className={company.candleChange === null ? "text-xs text-slate-500" : company.candleChange >= 0 ? "text-xs text-emerald-300" : "text-xs text-rose-300"}>
                          {company.candleChange === null ? "—" : `${company.candleChange >= 0 ? "+" : ""}${company.candleChange.toFixed(2)}%`}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="mt-4 rounded-xl border border-dashed border-white/10 p-5 text-center">
                <Star className="mx-auto text-slate-600" size={22} />
                <p className="mt-3 text-sm font-medium text-slate-300">Your watchlist is empty</p>
                <p className="mt-1 text-xs leading-5 text-slate-500">Select a company and add it to keep it here during this visit.</p>
              </div>
            )}
            <div className="mt-5 border-t border-white/10 pt-4">
              <p className="text-xs leading-5 text-slate-500">Watchlist selections are held in this browser session. Prices and price history remain sourced from the shared simulation.</p>
            </div>
          </aside>
        </section>

        <section className="overflow-hidden rounded-2xl border border-white/10 bg-[#101827]">
          <div className="flex flex-wrap items-end justify-between gap-4 border-b border-white/10 p-5">
            <div>
              <p className="text-xs font-semibold tracking-[.18em] text-slate-500">INSTRUMENT DIRECTORY</p>
              <h2 className="mt-1 text-lg font-semibold">Browse companies</h2>
            </div>
            <label className="flex min-w-[240px] flex-1 items-center gap-2 rounded-xl border border-white/10 bg-[#080D19] px-3 py-2.5 md:max-w-md">
              <Search size={16} className="shrink-0 text-slate-500" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search symbol, company or sector"
                className="w-full bg-transparent text-sm outline-none placeholder:text-slate-600"
              />
            </label>
          </div>
          <div className="flex flex-wrap items-center gap-2 border-b border-white/10 px-5 py-3">
            {sectors.map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={sector === value}
                onClick={() => setSector(value)}
                className={sector === value
                  ? "rounded-full bg-emerald-400 px-3 py-1.5 text-xs font-semibold text-slate-950"
                  : "rounded-full border border-white/10 px-3 py-1.5 text-xs text-slate-400 hover:text-white"}
              >
                {value}
              </button>
            ))}
            <button
              type="button"
              aria-pressed={watchOnly}
              onClick={() => setWatchOnly((value) => !value)}
              className={watchOnly
                ? "ml-auto rounded-full border border-amber-300/30 bg-amber-300/10 px-3 py-1.5 text-xs font-semibold text-amber-200"
                : "ml-auto rounded-full border border-white/10 px-3 py-1.5 text-xs text-slate-400"}
            >
              Watchlist only
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="bg-white/[0.025] text-xs text-slate-500">
                <tr>
                  <th className="px-5 py-4 font-medium">Instrument</th>
                  <th className="px-5 py-4 font-medium">Sector</th>
                  <th className="px-5 py-4 font-medium">Last price</th>
                  <th className="px-5 py-4 font-medium">Last candle</th>
                  <th className="px-5 py-4 font-medium">Since start</th>
                  <th className="px-5 py-4 font-medium">Watch</th>
                </tr>
              </thead>
              <tbody>
                {filteredCompanies.map((company) => (
                  <tr key={company.symbol} className="border-t border-white/5 hover:bg-white/[0.02]">
                    <td className="px-5 py-4">
                      <button type="button" onClick={() => setSelectedSymbol(company.symbol)} className="text-left">
                        <span className="block font-semibold text-slate-100">{company.symbol}</span>
                        <span className="mt-1 block text-xs text-slate-500">{company.name}</span>
                      </button>
                    </td>
                    <td className="px-5 py-4 text-slate-400">{company.sector}</td>
                    <td className="px-5 py-4 font-medium tabular-nums">{money(company.currentPrice)}</td>
                    <td className={company.candleChange === null ? "px-5 py-4 text-slate-500" : company.candleChange >= 0 ? "px-5 py-4 text-emerald-300" : "px-5 py-4 text-rose-300"}>
                      {company.candleChange === null ? "—" : `${company.candleChange >= 0 ? "+" : ""}${company.candleChange.toFixed(2)}%`}
                    </td>
                    <td className={company.scenarioChange === null ? "px-5 py-4 text-slate-500" : company.scenarioChange >= 0 ? "px-5 py-4 text-emerald-300" : "px-5 py-4 text-rose-300"}>
                      {company.scenarioChange === null ? "—" : `${company.scenarioChange >= 0 ? "+" : ""}${company.scenarioChange.toFixed(2)}%`}
                    </td>
                    <td className="px-5 py-4">
                      <button
                        type="button"
                        onClick={() => toggleWatchlist(company.symbol)}
                        aria-label={watchlist.includes(company.symbol) ? `Remove ${company.symbol} from watchlist` : `Add ${company.symbol} to watchlist`}
                        className="rounded-lg p-2 text-amber-300 hover:bg-amber-300/10"
                      >
                        <Star size={15} fill={watchlist.includes(company.symbol) ? "currentColor" : "none"} />
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredCompanies.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-5 py-10 text-center text-sm text-slate-500">
                      No companies match those filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <footer className="flex items-center gap-2 pb-4 text-xs text-slate-500">
          <Activity size={14} />
          All quotes are fictional simulated prices from the shared server-backed market. They are not NSE/BSE live quotes.
        </footer>
      </div>
    </main>
  );
}
