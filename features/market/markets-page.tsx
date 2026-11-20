"use client";

import { useMemo, useState } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  Bell,
  Search,
  Star,
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

import { marketIndices, marketStocks } from "./market-data";

const money = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value);

const categories = [
  "All",
  "Banking",
  "Technology",
  "Energy",
  "Consumer",
  "Industrials",
  "Telecom",
];

export default function MarketsPage() {
  const [query, setQuery] = useState("");
  const [sector, setSector] = useState("All");
  const [selectedSymbol, setSelectedSymbol] = useState("RELIANCE");
  const [watchlist, setWatchlist] = useState<string[]>([
    "RELIANCE",
    "TCS",
    "HDFCBANK",
  ]);

  const stocks = useMemo(
    () =>
      marketStocks.filter(
        (stock) =>
          (sector === "All" || stock.sector === sector) &&
          `${stock.symbol} ${stock.name}`
            .toLowerCase()
            .includes(query.toLowerCase())
      ),
    [query, sector]
  );

  const selected =
    marketStocks.find((stock) => stock.symbol === selectedSymbol) ??
    marketStocks[0];

  const chartData = selected.history.map((price, index) => ({
    day: `D${index + 1}`,
    price,
  }));

  function toggleWatchlist(symbol: string) {
    setWatchlist((current) =>
      current.includes(symbol)
        ? current.filter((item) => item !== symbol)
        : [...current, symbol]
    );
  }

  return (
    <main className="min-h-screen bg-[#080D19] text-slate-100">

      {/* TOPBAR */}
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 px-5 py-5 md:px-8">
        <div>
          <p className="text-sm text-slate-400">
            Financial Universe / Markets
          </p>
          <h2 className="mt-1 text-xl font-semibold">Markets</h2>
        </div>

        <div className="flex items-center gap-4">
          <span className="rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1 text-xs text-amber-300">
            SIMULATED DATA
          </span>
          <Bell size={19} className="text-slate-400" />
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-400/15 font-semibold text-emerald-400">
            U
          </div>
        </div>
      </header>

      <div className="space-y-7 p-5 md:p-8">

        {/* INTRO */}
        <div>
          <p className="text-sm text-slate-400">Market overview</p>
          <h1 className="mt-1 text-2xl font-bold md:text-3xl">
            Explore the markets.
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Track indices, discover companies and build your watchlist.
          </p>
        </div>

        {/* MARKET INDICES */}
        <div className="grid gap-4 md:grid-cols-3">
          {marketIndices.map((index) => (
            <div
              key={index.name}
              className="rounded-2xl border border-white/10 bg-[#101827] p-5"
            >
              <p className="text-xs font-semibold tracking-wider text-slate-500">
                {index.name}
              </p>
              <p className="mt-3 text-2xl font-bold">{index.value}</p>
              <p
                className={`mt-2 text-sm ${
                  index.positive ? "text-emerald-400" : "text-red-400"
                }`}
              >
                {index.change}
                <span className="text-slate-500"> today</span>
              </p>
            </div>
          ))}
        </div>

        {/* SELECTED STOCK + WATCHLIST */}
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(280px,0.8fr)]">

          {/* SELECTED INSTRUMENT */}
          <div className="rounded-2xl border border-white/10 bg-[#101827] p-5 md:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs text-slate-500">
                  SELECTED INSTRUMENT
                </p>
                <h2 className="mt-1 text-xl font-bold">
                  {selected.name}
                </h2>
                <p className="text-sm text-slate-500">
                  {selected.symbol} · {selected.sector}
                </p>
              </div>

              <button
                onClick={() => toggleWatchlist(selected.symbol)}
                className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs ${
                  watchlist.includes(selected.symbol)
                    ? "border-amber-400/30 bg-amber-400/10 text-amber-300"
                    : "border-white/10 text-slate-400 hover:text-white"
                }`}
              >
                <Star
                  size={14}
                  fill={
                    watchlist.includes(selected.symbol)
                      ? "currentColor"
                      : "none"
                  }
                />
                {watchlist.includes(selected.symbol)
                  ? "In watchlist"
                  : "Add to watchlist"}
              </button>
            </div>

            <div className="mt-5 flex items-end gap-3">
              <p className="text-3xl font-bold">
                {money(selected.price)}
              </p>
              <p
                className={`mb-1 flex items-center text-sm ${
                  selected.change >= 0
                    ? "text-emerald-400"
                    : "text-red-400"
                }`}
              >
                {selected.change >= 0 ? (
                  <ArrowUpRight size={16} />
                ) : (
                  <ArrowDownRight size={16} />
                )}
                {selected.change > 0 ? "+" : ""}
                {selected.change}%
              </p>
            </div>

            <p className="mt-1 text-xs text-slate-500">
              Illustrative 8-session price history · not exchange data
            </p>

            <div className="mt-5 h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient
                      id="marketGradient"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="0%"
                        stopColor="#34D399"
                        stopOpacity={0.28}
                      />
                      <stop
                        offset="100%"
                        stopColor="#34D399"
                        stopOpacity={0}
                      />
                    </linearGradient>
                  </defs>

                  <CartesianGrid stroke="#ffffff10" vertical={false} />

                  <XAxis
                    dataKey="day"
                    stroke="#64748b"
                    tickLine={false}
                    axisLine={false}
                  />

                  <YAxis
                    domain={["auto", "auto"]}
                    stroke="#64748b"
                    tickLine={false}
                    axisLine={false}
                    width={55}
                  />

                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#101827",
                      border: "1px solid #334155",
                      borderRadius: 12,
                      color: "#fff",
                    }}
                    formatter={(value) => [
                      money(Number(value)),
                      "Price",
                    ]}
                  />

                  <Area
                    type="monotone"
                    dataKey="price"
                    stroke="#34D399"
                    strokeWidth={2.5}
                    fill="url(#marketGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* WATCHLIST */}
          <div className="rounded-2xl border border-white/10 bg-[#101827] p-5">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Your watchlist</h3>
              <span className="text-xs text-slate-500">
                {watchlist.length} assets
              </span>
            </div>

            <div className="mt-5 space-y-4">
              {marketStocks
                .filter((stock) => watchlist.includes(stock.symbol))
                .map((stock) => (
                  <button
                    key={stock.symbol}
                    onClick={() => setSelectedSymbol(stock.symbol)}
                    className={`flex w-full items-center justify-between rounded-xl p-3 text-left transition ${
                      selectedSymbol === stock.symbol
                        ? "bg-emerald-400/10"
                        : "hover:bg-white/5"
                    }`}
                  >
                    <div>
                      <p className="text-sm font-semibold">
                        {stock.symbol}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {stock.name}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="text-sm font-medium">
                        {money(stock.price)}
                      </p>
                      <p
                        className={`mt-1 text-xs ${
                          stock.change >= 0
                            ? "text-emerald-400"
                            : "text-red-400"
                        }`}
                      >
                        {stock.change > 0 ? "+" : ""}
                        {stock.change}%
                      </p>
                    </div>
                  </button>
                ))}

              {watchlist.length === 0 && (
                <p className="py-8 text-center text-sm text-slate-500">
                  Your watchlist is empty. Add assets from the market table.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* EXPLORE STOCKS */}
        <div className="rounded-2xl border border-white/10 bg-[#101827] p-5 md:p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="font-semibold">Explore stocks</h3>
              <p className="mt-1 text-xs text-slate-500">
                Select a stock to inspect its demo price chart.
              </p>
            </div>

            <div className="relative w-full sm:w-64">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
                size={16}
              />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search company or symbol"
                className="w-full rounded-xl border border-white/10 bg-[#0B1120] py-2.5 pl-9 pr-3 text-sm outline-none placeholder:text-slate-600 focus:border-emerald-400/50"
              />
            </div>
          </div>

          {/* SECTOR FILTERS */}
          <div className="mt-5 flex gap-2 overflow-x-auto pb-2">
            {categories.map((item) => (
              <button
                key={item}
                onClick={() => setSector(item)}
                className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs transition ${
                  sector === item
                    ? "bg-emerald-400 text-[#07110e]"
                    : "bg-white/5 text-slate-400 hover:bg-white/10"
                }`}
              >
                {item}
              </button>
            ))}
          </div>

          {/* STOCK TABLE */}
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[620px] text-left text-sm">
              <thead className="text-xs uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="py-3 font-medium">Company</th>
                  <th className="py-3 font-medium">Sector</th>
                  <th className="py-3 text-right font-medium">Price</th>
                  <th className="py-3 text-right font-medium">Change</th>
                  <th className="py-3 text-right font-medium">Volume</th>
                  <th className="py-3 text-right font-medium">Watch</th>
                </tr>
              </thead>

              <tbody>
                {stocks.map((stock) => (
                  <tr
                    key={stock.symbol}
                    className="border-t border-white/[0.06] hover:bg-white/[0.025]"
                  >
                    <td className="py-4">
                      <button
                        onClick={() => setSelectedSymbol(stock.symbol)}
                        className="text-left"
                      >
                        <p className="font-semibold text-slate-100">
                          {stock.symbol}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {stock.name}
                        </p>
                      </button>
                    </td>

                    <td className="py-4 text-slate-400">
                      {stock.sector}
                    </td>

                    <td className="py-4 text-right font-medium">
                      {money(stock.price)}
                    </td>

                    <td
                      className={`py-4 text-right ${
                        stock.change >= 0
                          ? "text-emerald-400"
                          : "text-red-400"
                      }`}
                    >
                      {stock.change > 0 ? "+" : ""}
                      {stock.change}%
                    </td>

                    <td className="py-4 text-right text-slate-400">
                      {stock.volume}
                    </td>

                    <td className="py-4 text-right">
                      <button
                        aria-label={`${
                          watchlist.includes(stock.symbol)
                            ? "Remove"
                            : "Add"
                        } ${stock.symbol} ${
                          watchlist.includes(stock.symbol)
                            ? "from"
                            : "to"
                        } watchlist`}
                        onClick={() => toggleWatchlist(stock.symbol)}
                        className="rounded-lg p-2 text-slate-500 hover:text-amber-300"
                      >
                        <Star
                          size={16}
                          fill={
                            watchlist.includes(stock.symbol)
                              ? "currentColor"
                              : "none"
                          }
                        />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {stocks.length === 0 && (
              <p className="py-10 text-center text-sm text-slate-500">
                No stocks match that search.
              </p>
            )}
          </div>
        </div>

        <p className="pb-4 text-center text-xs text-slate-600">
          TILT Financial Universe · Markets Prototype · Simulated Demo Data
        </p>
      </div>
    </main>
  );
}