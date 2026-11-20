"use client";

import {
  ArrowDownRight,
  ArrowUpRight,
  Bell,
  BriefcaseBusiness,
  ChartNoAxesCombined,
  CircleDollarSign,
  Search,
  Wallet,
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

import {
  marketWatchlist,
  performanceData,
  portfolioSummary,
  recentActivity,
} from "./dashboard-data";

const money = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);

export default function DashboardOverview() {
  return (
    <main className="min-h-screen bg-[#080D19] text-slate-100">

      {/* TOPBAR */}
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 px-5 py-5 md:px-8">
        <div>
          <p className="text-sm text-slate-400">
            Financial Universe / Overview
          </p>
          <h2 className="mt-1 text-xl font-semibold">Dashboard</h2>
        </div>

        <div className="flex items-center gap-4">
          <button aria-label="Search" className="text-slate-400 hover:text-white">
            <Search size={20} />
          </button>
          <button aria-label="Notifications" className="text-slate-400 hover:text-white">
            <Bell size={20} />
          </button>
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-400/15 font-semibold text-emerald-400">
            U
          </div>
        </div>
      </header>

      <div className="space-y-8 p-5 md:p-8">

        {/* WELCOME */}
        <div>
          <p className="text-sm text-slate-400">Welcome back, Investor</p>
          <h2 className="mt-1 text-2xl font-bold md:text-3xl">
            Your financial universe.
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            Track your performance. Understand your decisions. Build your strategy.
          </p>
        </div>

        {/* SUMMARY CARDS */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            {
              label: "Total Portfolio Value",
              value: money(portfolioSummary.totalBalance),
              icon: Wallet,
            },
            {
              label: "Invested Amount",
              value: money(portfolioSummary.investedValue),
              icon: BriefcaseBusiness,
            },
            {
              label: "Available Cash",
              value: money(portfolioSummary.availableCash),
              icon: CircleDollarSign,
            },
            {
              label: "Total Profit / Loss",
              value: money(portfolioSummary.totalProfitLoss),
              icon: ChartNoAxesCombined,
              positive: true,
            },
          ].map((card) => {
            const Icon = card.icon;

            return (
              <div
                key={card.label}
                className="rounded-2xl border border-white/10 bg-[#101827] p-5"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm text-slate-400">{card.label}</p>
                  <Icon size={19} className="text-emerald-400" />
                </div>
                <p className="mt-5 text-2xl font-bold tracking-tight">
                  {card.value}
                </p>
                {card.positive && (
                  <p className="mt-2 flex items-center gap-1 text-sm text-emerald-400">
                    <ArrowUpRight size={16} />
                    +{portfolioSummary.profitLossPercentage}%
                  </p>
                )}
              </div>
            );
          })}
        </div>

        {/* PERFORMANCE CHART */}
        <div className="rounded-2xl border border-white/10 bg-[#101827] p-5 md:p-6">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-semibold">Portfolio Performance</h3>
              <p className="mt-1 text-xs text-slate-500">
                Your virtual capital over time
              </p>
            </div>
            <span className="rounded-lg bg-emerald-400/10 px-3 py-2 text-sm font-medium text-emerald-400">
              +4.48%
            </span>
          </div>

          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={performanceData}>
                <defs>
                  <linearGradient id="performanceGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#34D399" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#34D399" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#ffffff10" vertical={false} />
                <XAxis
                  dataKey="date"
                  stroke="#64748b"
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="#64748b"
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `₹${(value / 100000).toFixed(1)}L`}
                  width={65}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#101827",
                    border: "1px solid #334155",
                    borderRadius: "12px",
                    color: "#fff",
                  }}
                  formatter={(value) => [money(Number(value)), "Portfolio"]}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#34D399"
                  strokeWidth={2.5}
                  fill="url(#performanceGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* MARKET WATCHLIST + ACTIVITY */}
        <div className="grid gap-6 xl:grid-cols-2">

          <div className="rounded-2xl border border-white/10 bg-[#101827] p-5">
            <h3 className="mb-5 font-semibold">Market Watchlist</h3>

            <div className="space-y-5">
              {marketWatchlist.map((stock) => (
                <div
                  key={stock.symbol}
                  className="flex items-center justify-between gap-3"
                >
                  <div>
                    <p className="text-sm font-semibold">{stock.symbol}</p>
                    <p className="mt-1 text-xs text-slate-500">{stock.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">{money(stock.price)}</p>
                    <p
                      className={`mt-1 flex items-center justify-end gap-1 text-xs ${
                        stock.change >= 0 ? "text-emerald-400" : "text-red-400"
                      }`}
                    >
                      {stock.change >= 0 ? (
                        <ArrowUpRight size={14} />
                      ) : (
                        <ArrowDownRight size={14} />
                      )}
                      {stock.change > 0 ? "+" : ""}
                      {stock.change}%
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#101827] p-5">
            <h3 className="mb-5 font-semibold">Recent Activity</h3>

            <div className="space-y-5">
              {recentActivity.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-center justify-between gap-3"
                >
                  <div>
                    <p className="text-sm font-semibold">
                      {activity.action} {activity.symbol}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {activity.quantity} shares
                    </p>
                  </div>
                  <p className="text-sm font-medium">
                    {money(activity.price * activity.quantity)}
                  </p>
                </div>
              ))}
            </div>
          </div>

        </div>

        <p className="pb-4 text-center text-xs text-slate-600">
          TILT Financial Universe · Prototype Dashboard · Demo Data
        </p>
      </div>
    </main>
  );
}