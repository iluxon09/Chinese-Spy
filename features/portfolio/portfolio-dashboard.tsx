"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  BriefcaseBusiness,
  ChartNoAxesCombined,
  Wallet,
  TrendingUp,
  Calculator,
  Upload,
  BrainCircuit,
  FileSpreadsheet,
} from "lucide-react";

import type { TradingState } from "@/features/trading/trading-engine";
import { INITIAL_TRADING_STATE } from "@/features/trading/trading-engine";
import { marketStocks } from "@/features/market/market-data";

const STORAGE_KEY = "tilt-trading-state";

const formatMoney = (value: number) =>
  `₹${value.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

export default function PortfolioDashboard() {
  const [tradingState, setTradingState] =
    useState<TradingState>(INITIAL_TRADING_STATE);
  const [isLoaded, setIsLoaded] = useState(false);

  const loadPortfolio = useCallback(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);

      if (saved) {
        const parsed = JSON.parse(saved) as TradingState;

        if (
          typeof parsed.cashBalance === "number" &&
          Array.isArray(parsed.holdings) &&
          Array.isArray(parsed.orders)
        ) {
          setTradingState(parsed);
        }
      }
    } catch (error) {
      console.error("Portfolio loading failed:", error);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  useEffect(() => {
    loadPortfolio();

    window.addEventListener("focus", loadPortfolio);
    window.addEventListener("pageshow", loadPortfolio);
    window.addEventListener("storage", loadPortfolio);
    document.addEventListener("visibilitychange", loadPortfolio);

    return () => {
      window.removeEventListener("focus", loadPortfolio);
      window.removeEventListener("pageshow", loadPortfolio);
      window.removeEventListener("storage", loadPortfolio);
      document.removeEventListener("visibilitychange", loadPortfolio);
    };
  }, [loadPortfolio]);

  const holdings = tradingState.holdings.map((holding) => {
    const stock = marketStocks.find(
      (item) => item.symbol === holding.symbol
    );

    const currentPrice = stock?.price ?? holding.averagePrice;
    const invested = holding.averagePrice * holding.quantity;
    const currentValue = currentPrice * holding.quantity;

    return {
      ...holding,
      currentPrice,
      invested,
      currentValue,
      pnl: currentValue - invested,
    };
  });

  const totalInvested = holdings.reduce(
    (sum, item) => sum + item.invested,
    0
  );

  const currentValue = holdings.reduce(
    (sum, item) => sum + item.currentValue,
    0
  );

  const totalPnl = currentValue - totalInvested;

  const stats = [
    { label: "Available Cash", value: formatMoney(tradingState.cashBalance), icon: Wallet },
    { label: "Invested Amount", value: formatMoney(totalInvested), icon: BriefcaseBusiness },
    { label: "Current Holdings Value", value: formatMoney(currentValue), icon: ChartNoAxesCombined },
    { label: "Total P&L", value: formatMoney(totalPnl), icon: TrendingUp },
  ];

  if (!isLoaded) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#080D19] text-slate-400">
        Loading portfolio...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#080d18] px-4 py-8 text-white sm:px-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm text-cyan-400">YOUR INVESTMENTS</p>
            <h1 className="mt-2 text-3xl font-bold">Portfolio</h1>
            <p className="mt-2 text-sm text-slate-400">
              Track your virtual investments and portfolio performance.
            </p>
          </div>

          <Link href="/trading" className="rounded-xl bg-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950 hover:bg-cyan-300">
            Go to Trading <ArrowUpRight className="ml-2 inline h-4 w-4" />
          </Link>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Link href="/portfolio/insights" className="group flex items-center justify-between rounded-2xl border border-violet-500/20 bg-[#111a2b] p-5 hover:border-violet-400/50">
            <div>
              <div className="flex items-center gap-2 text-violet-300">
                <BrainCircuit size={20} />
                <span className="text-sm font-semibold">Trading Psychology</span>
              </div>
              <p className="mt-2 text-sm text-slate-400">Explore patterns in your simulated trading behaviour.</p>
            </div>
            <ArrowUpRight className="text-slate-500 group-hover:text-violet-300" />
          </Link>
          <Link href="/portfolio/history" className="group flex items-center justify-between rounded-2xl border border-cyan-500/20 bg-[#111a2b] p-5 hover:border-cyan-400/50">
            <div>
              <div className="flex items-center gap-2 text-cyan-300">
                <FileSpreadsheet size={20} />
                <span className="text-sm font-semibold">Trading History Analyzer</span>
              </div>
              <p className="mt-2 text-sm text-slate-400">Import a CSV and visualise your trading history.</p>
            </div>
            <ArrowUpRight className="text-slate-500 group-hover:text-cyan-300" />
          </Link>
          <Link href="/portfolio/architect" className="group flex items-center justify-between rounded-2xl border border-blue-500/20 bg-[#111a2b] p-5 hover:border-blue-400/50">
            <div>
              <div className="flex items-center gap-2 text-blue-400">
                <Calculator size={20} />
                <span className="text-sm font-semibold">Investment Architect</span>
              </div>
              <p className="mt-2 text-sm text-slate-400">
                Plan SIP investments and estimate your financial goals.
              </p>
            </div>
            <ArrowUpRight className="text-slate-500 group-hover:text-blue-400" />
          </Link>

          <Link href="/portfolio/upload" className="group flex items-center justify-between rounded-2xl border border-purple-500/20 bg-[#111a2b] p-5 hover:border-purple-400/50">
            <div>
              <div className="flex items-center gap-2 text-purple-400">
                <Upload size={20} />
                <span className="text-sm font-semibold">Import Portfolio CSV</span>
              </div>
              <p className="mt-2 text-sm text-slate-400">
                Upload and preview your portfolio statement.
              </p>
            </div>
            <ArrowUpRight className="text-slate-500 group-hover:text-purple-400" />
          </Link>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map((stat) => {
            const Icon = stat.icon;

            return (
              <div key={stat.label} className="rounded-2xl border border-white/10 bg-[#111a2b] p-5">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-slate-400">{stat.label}</p>
                  <Icon className="h-5 w-5 text-cyan-400" />
                </div>
                <p className="mt-4 text-2xl font-bold">{stat.value}</p>
              </div>
            );
          })}
        </div>

        <section className="rounded-2xl border border-white/10 bg-[#111a2b] p-6">
          <div className="mb-6">
            <h2 className="text-xl font-semibold">Your Holdings</h2>
            <p className="mt-1 text-sm text-slate-400">
              Your currently owned stocks and their performance.
            </p>
          </div>

          {holdings.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/15 px-6 py-14 text-center">
              <BriefcaseBusiness className="mx-auto h-10 w-10 text-slate-500" />
              <h3 className="mt-4 text-lg font-semibold">No holdings yet</h3>
              <p className="mt-2 text-sm text-slate-400">
                Your investments will appear here after your first trade.
              </p>
              <Link href="/markets" className="mt-5 inline-block rounded-lg border border-cyan-400/40 px-5 py-2.5 text-sm text-cyan-300 hover:bg-cyan-400/10">
                Explore Markets
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-left text-sm">
                <thead className="border-b border-white/10 text-slate-400">
                  <tr>
                    <th className="pb-4">Asset</th>
                    <th className="pb-4">Quantity</th>
                    <th className="pb-4">Average Price</th>
                    <th className="pb-4">Current Price</th>
                    <th className="pb-4">Invested</th>
                    <th className="pb-4">Current Value</th>
                    <th className="pb-4">P&L</th>
                  </tr>
                </thead>
                <tbody>
                  {holdings.map((holding) => (
                    <tr key={holding.symbol} className="border-b border-white/5 last:border-0">
                      <td className="py-4">
                        <p className="font-semibold">{holding.symbol}</p>
                        <p className="text-xs text-slate-400">{holding.name}</p>
                      </td>
                      <td>{holding.quantity}</td>
                      <td>{formatMoney(holding.averagePrice)}</td>
                      <td>{formatMoney(holding.currentPrice)}</td>
                      <td>{formatMoney(holding.invested)}</td>
                      <td>{formatMoney(holding.currentValue)}</td>
                      <td className={holding.pnl >= 0 ? "text-emerald-400" : "text-red-400"}>
                        {formatMoney(holding.pnl)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <p className="text-xs text-slate-500">
          Virtual portfolio · Synchronized with this browser's trading account.
        </p>
      </div>
    </main>
  );
}