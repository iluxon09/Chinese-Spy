"use client";

import { useState } from "react";
import Link from "next/link";
import { marketStocks, marketIndices } from "@/features/market/market-data";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid
} from "recharts";
import { ArrowUpRight, ArrowDownRight, Activity, Search } from "lucide-react";

const money = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value);

export default function SimulatorDashboard() {
  const [selectedSymbol, setSelectedSymbol] = useState("RELIANCE");
  const [query, setQuery] = useState("");

  const selected =
    marketStocks.find((s) => s.symbol === selectedSymbol) ?? marketStocks[0];

  const stocks = marketStocks.filter((s) =>
    `${s.symbol} ${s.name}`.toLowerCase().includes(query.toLowerCase())
  );

  const chartData = selected.history.map((price, i) => ({
    session: `D${i + 1}`,
    price,
  }));

  return (
    <main className="min-h-screen bg-[#080D19] p-5 text-slate-100 md:p-8">
      <div className="mx-auto max-w-7xl space-y-8">

        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold tracking-[0.25em] text-emerald-400">
              TILT / VIRTUAL EXCHANGE
            </p>
            <h1 className="mt-2 text-3xl font-bold">Market Simulator</h1>
            <p className="mt-2 text-sm text-slate-400">
              Explore the virtual financial universe and practise investing.
            </p>
          </div>
          <Link href="/trading" className="rounded-xl bg-emerald-400 px-5 py-3 text-sm font-bold text-slate-950 hover:bg-emerald-300">
            Open Trading Terminal →
          </Link>
        </header>

        <div className="flex items-center gap-2 rounded-xl border border-emerald-400/20 bg-emerald-400/5 p-4 text-sm text-emerald-300">
          <Activity size={18} />
          Virtual market environment · Simulated demo data
        </div>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {marketIndices.map((index) => (
            <div key={index.name} className="rounded-2xl border border-white/10 bg-[#101827] p-5">
              <p className="text-xs text-slate-400">{index.name}</p>
              <h2 className="mt-3 text-2xl font-bold">{index.value}</h2>
              <p className={`mt-2 text-sm ${index.positive ? "text-emerald-400" : "text-red-400"}`}>
                {index.change} today
              </p>
            </div>
          ))}
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
          <div className="rounded-2xl border border-white/10 bg-[#101827] p-6">
            <p className="text-xs text-slate-500">SELECTED COMPANY</p>
            <h2 className="mt-2 text-2xl font-bold">{selected.name}</h2>
            <p className="mt-1 text-sm text-slate-400">
              {selected.symbol} · {selected.sector}
            </p>

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <span className="text-3xl font-bold">{money(selected.price)}</span>
              <span className={`flex items-center text-sm ${selected.change >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                {selected.change >= 0 ? <ArrowUpRight size={17}/> : <ArrowDownRight size={17}/>}
                {selected.change > 0 ? "+" : ""}{selected.change}%
              </span>
            </div>

            <p className="mt-2 text-xs text-slate-500">
              Illustrative price history · Simulated data
            </p>

            <div className="mt-6 h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="simGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#34D399" stopOpacity={0.3}/>
                      <stop offset="100%" stopColor="#34D399" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#ffffff12" vertical={false}/>
                  <XAxis dataKey="session" stroke="#64748b"/>
                  <YAxis domain={["auto", "auto"]} stroke="#64748b"/>
                  <Tooltip contentStyle={{backgroundColor:"#101827",border:"1px solid #334155",borderRadius:12}}/>
                  <Area type="monotone" dataKey="price" stroke="#34D399" fill="url(#simGradient)" strokeWidth={2}/>
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <Link href="/trading" className="mt-5 block rounded-xl bg-emerald-400 py-3 text-center text-sm font-bold text-slate-950">
              Trade {selected.symbol} →
            </Link>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#101827] p-5">
            <h2 className="text-lg font-semibold">Explore Companies</h2>
            <div className="relative mt-4">
              <Search className="absolute left-3 top-3 text-slate-500" size={16}/>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search companies..."
                className="w-full rounded-xl border border-white/10 bg-[#080D19] py-3 pl-9 pr-3 text-sm outline-none focus:border-emerald-400"
              />
            </div>

            <div className="mt-4 max-h-[430px] space-y-2 overflow-y-auto">
              {stocks.map((stock) => (
                <button
                  key={stock.symbol}
                  onClick={() => setSelectedSymbol(stock.symbol)}
                  className={`w-full rounded-xl border p-3 text-left transition ${
                    selectedSymbol === stock.symbol
                      ? "border-emerald-400/30 bg-emerald-400/10"
                      : "border-white/5 hover:bg-white/5"
                  }`}
                >
                  <div className="flex justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold">{stock.symbol}</p>
                      <p className="mt-1 text-xs text-slate-500">{stock.name}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm">{money(stock.price)}</p>
                      <p className={`mt-1 text-xs ${stock.change >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                        {stock.change > 0 ? "+" : ""}{stock.change}%
                      </p>
                    </div>
                  </div>
                </button>
              ))}
              {stocks.length === 0 && (
                <p className="py-6 text-center text-sm text-slate-500">No companies found.</p>
              )}
            </div>
          </div>
        </section>

        <p className="text-center text-xs text-slate-600">
          TILT Financial Universe · Market Simulator · Demo Data
        </p>
      </div>
    </main>
  );
}