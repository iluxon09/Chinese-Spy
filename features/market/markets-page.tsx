"use client";

import { useMemo, useState } from "react";
import { Search, Star, TrendingDown, TrendingUp } from "lucide-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useTilt } from "@/features/shared/tilt-provider";
import MarketPlaybackControls from "@/features/shared/market-playback-controls";

const money = (paise: number) => new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
}).format(paise / 100);

function lastCandleChange(points: readonly { pricePaise: number }[]) {
  const current = points[points.length - 1];
  const previous = points[points.length - 2];
  if (!current || !previous || previous.pricePaise <= 0) return null;
  return ((current.pricePaise - previous.pricePaise) / previous.pricePaise) * 100;
}

export default function MarketsPage() {
  const { loading, error, authenticated, market, histories } = useTilt();
  const [query, setQuery] = useState("");
  const [sector, setSector] = useState("All");
  const [selected, setSelected] = useState("");
  const [watch, setWatch] = useState<string[]>([]);

  const companies = useMemo(() => market?.companies ?? [], [market?.companies]);
  const active = companies.find((company) => company.symbol === selected) ?? companies[0];
  const sectors = ["All", ...Array.from(new Set(companies.map((company) => company.sector)))];
  const filtered = useMemo(
    () => companies.filter((company) =>
      (sector === "All" || company.sector === sector) &&
      `${company.symbol} ${company.name}`.toLowerCase().includes(query.toLowerCase()),
    ),
    [companies, sector, query],
  );

  if (loading) return <main className="p-8 text-slate-300">Loading fictional market…</main>;
  if (!authenticated || !market) {
    return <main className="p-8 text-slate-400">{error || "Sign in to view the market."}</main>;
  }

  const activeHistory = active ? histories[active.symbol] ?? [] : [];
  const history = activeHistory.map((point) => ({
    step: `Step ${point.market_step}`,
    price: point.pricePaise / 100,
  }));
  const activeChange = lastCandleChange(activeHistory);

  return (
    <main className="min-h-screen bg-[#080D19] p-5 text-slate-100 md:p-8">
      <div className="mx-auto max-w-7xl space-y-7">
        <header>
          <p className="text-xs tracking-[.25em] text-emerald-400">TILT / FICTIONAL EXCHANGE</p>
          <h1 className="mt-2 text-3xl font-bold">Markets</h1>
          <p className="mt-2 text-sm text-slate-400">
            Eight fictional companies · Market step {market.marketStep} · Five-minute candles
          </p>
        </header>

        <MarketPlaybackControls />

        {market.events.length > 0 && (
          <section className="rounded-2xl border border-amber-400/20 bg-amber-400/5 p-5">
            <h2 className="font-semibold text-amber-300">News & market events</h2>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              {market.events.map((event) => (
                <article key={event.id} className="rounded-xl border border-white/10 p-3">
                  <p className="font-medium">{event.title}</p>
                  <p className="mt-1 text-sm text-slate-400">{event.description}</p>
                  <p className="mt-2 text-xs text-slate-500">
                    {event.symbol ?? event.sector} · {(event.effect_bps / 100).toFixed(2)}%
                  </p>
                </article>
              ))}
            </div>
          </section>
        )}

        <section className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
          <article className="rounded-2xl border border-white/10 bg-[#101827] p-5">
            <div className="flex justify-between gap-4">
              <div>
                <p className="text-xs text-slate-500">SELECTED COMPANY</p>
                <h2 className="mt-2 text-2xl font-bold">{active?.name ?? "Select a company"}</h2>
                <p className="text-sm text-slate-400">{active?.symbol} · {active?.sector}</p>
              </div>
              <button
                type="button"
                onClick={() => active && setWatch((current) =>
                  current.includes(active.symbol)
                    ? current.filter((symbol) => symbol !== active.symbol)
                    : [...current, active.symbol],
                )}
                className="h-10 shrink-0 rounded-lg border border-white/10 px-3 text-sm text-slate-300"
              >
                <Star size={15} className="inline" /> {active && watch.includes(active.symbol) ? "Saved" : "Watch"}
              </button>
            </div>

            {active && (
              <>
                <p className="mt-5 text-3xl font-bold">
                  {money(active.currentPrice?.pricePaise ?? active.initialPricePaise)}
                </p>
                <p className="mt-1 text-xs text-slate-500">{active.description}</p>
                <p className={activeChange === null ? "mt-2 text-xs text-slate-500" : activeChange >= 0 ? "mt-2 flex items-center gap-1 text-xs text-emerald-300" : "mt-2 flex items-center gap-1 text-xs text-rose-300"}>
                  {activeChange === null ? "Waiting for another candle" : (
                    <>
                      {activeChange >= 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                      Last five-minute move: {activeChange >= 0 ? "+" : ""}{activeChange.toFixed(2)}%
                    </>
                  )}
                </p>
                <div className="mt-5 h-[260px]">
                  {history.length ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={history}>
                        <CartesianGrid stroke="#ffffff12" vertical={false} />
                        <XAxis dataKey="step" stroke="#64748b" />
                        <YAxis stroke="#64748b" />
                        <Tooltip />
                        <Area dataKey="price" stroke="#34D399" fill="#34D399" fillOpacity={0.12} />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="pt-12 text-sm text-slate-500">Price history will appear as the simulation advances.</p>
                  )}
                </div>
              </>
            )}
          </article>

          <article className="rounded-2xl border border-white/10 bg-[#101827] p-5">
            <h2 className="font-semibold">Company directory</h2>
            <div className="mt-4 flex gap-2">
              <div className="relative flex-1">
                <Search size={16} className="absolute left-3 top-3 text-slate-500" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search companies"
                  className="w-full rounded-xl border border-white/10 bg-[#080D19] py-2.5 pl-9 pr-3 text-sm"
                />
              </div>
              <select
                value={sector}
                onChange={(event) => setSector(event.target.value)}
                className="max-w-32 rounded-xl border border-white/10 bg-[#080D19] px-2 text-sm"
              >
                {sectors.map((value) => <option key={value}>{value}</option>)}
              </select>
            </div>

            <div className="mt-4 max-h-[420px] space-y-2 overflow-y-auto">
              {filtered.map((company) => {
                const change = lastCandleChange(histories[company.symbol] ?? []);
                return (
                  <button
                    key={company.symbol}
                    type="button"
                    onClick={() => setSelected(company.symbol)}
                    className={`w-full rounded-xl border p-3 text-left ${active?.symbol === company.symbol ? "border-emerald-400/30 bg-emerald-400/10" : "border-white/5 hover:bg-white/5"}`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold">{company.symbol}</p>
                        <p className="text-xs text-slate-500">{company.name} · {company.sector}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm">{money(company.currentPrice?.pricePaise ?? company.initialPricePaise)}</p>
                        <p className={change === null ? "text-[11px] text-slate-500" : change >= 0 ? "text-[11px] text-emerald-300" : "text-[11px] text-rose-300"}>
                          {change === null ? "—" : `${change >= 0 ? "+" : ""}${change.toFixed(2)}%`}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
              {filtered.length === 0 && <p className="p-5 text-center text-sm text-slate-500">No companies found.</p>}
            </div>
          </article>
        </section>
      </div>
    </main>
  );
}
