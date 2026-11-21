"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  BriefcaseBusiness,
  Clock3,
  Wallet,
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

const money = (paise: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(paise / 100);

function estimateCharge(grossPaise: number, rateBps: number, minimumPaise: number) {
  if (!Number.isSafeInteger(grossPaise) || grossPaise <= 0) return 0;
  const percentageCharge = Number((BigInt(grossPaise) * BigInt(rateBps) + 9_999n) / 10_000n);
  return Math.max(percentageCharge, minimumPaise);
}

export default function TradingTerminal() {
  const {
    authenticated,
    loading,
    error,
    market,
    portfolio,
    histories,
    placeOrder,
  } = useTilt();

  const [selectedSymbol, setSelectedSymbol] = useState("");
  const [side, setSide] = useState<"BUY" | "SELL">("BUY");
  const [quantity, setQuantity] = useState("1");
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  const companies = market?.companies ?? [];
  const selected = companies.find((company) => company.symbol === selectedSymbol) ?? companies[0];
  const parsedQuantity = Number(quantity);
  const pricePaise = selected?.currentPrice?.pricePaise ?? selected?.initialPricePaise ?? 0;
  const validQuantity = Number.isSafeInteger(parsedQuantity) && parsedQuantity > 0;
  const grossPaise = validQuantity && Number.isSafeInteger(pricePaise * parsedQuantity)
    ? pricePaise * parsedQuantity
    : 0;
  const chargePaise = market?.scenario
    ? estimateCharge(grossPaise, market.scenario.charge_rate_bps, market.scenario.minimum_charge_paise)
    : 0;
  const estimatedDebitPaise = grossPaise + chargePaise;
  const estimatedCreditPaise = Math.max(0, grossPaise - chargePaise);
  const holding = portfolio?.snapshot.holdings.find((item) => item.symbol === selected?.symbol);
  const chartData = selected
    ? (histories[selected.symbol] ?? []).map((point) => ({
        step: `#${point.market_step}`,
        price: point.pricePaise / 100,
      }))
    : [];
  const lastCandleChange = useMemo(() => {
    const points = selected ? histories[selected.symbol] ?? [] : [];
    const current = points[points.length - 1];
    const previous = points[points.length - 2];
    if (!current || !previous || previous.pricePaise <= 0) return null;
    return ((current.pricePaise - previous.pricePaise) / previous.pricePaise) * 100;
  }, [histories, selected]);

  const canAfford = side === "SELL" || (portfolio !== null && estimatedDebitPaise <= portfolio.snapshot.cashBalancePaise);
  const canSell = side === "BUY" || (holding !== undefined && holding.quantity >= parsedQuantity);
  const canSubmit = !busy && !!selected && validQuantity && grossPaise > 0 && canAfford && canSell;

  async function submitOrder() {
    if (!selected || !canSubmit) return;
    setBusy(true);
    setFeedback(null);
    try {
      await placeOrder(selected.symbol, side, parsedQuantity);
      setFeedback({
        tone: "success",
        text: `${side} order executed for ${parsedQuantity} shares of ${selected.symbol}.`,
      });
      setQuantity("1");
    } catch (cause) {
      setFeedback({
        tone: "error",
        text: cause instanceof Error ? cause.message : "The order could not be completed.",
      });
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <main className="terminal-subpage p-8 text-slate-300">Loading trading terminal…</main>;
  if (!authenticated || !market || !portfolio) {
    return <main className="terminal-subpage p-8 text-slate-400">{error || "Sign in to trade."}</main>;
  }

  return (
    <main className="terminal-subpage min-h-screen bg-[#080D19] px-5 py-8 text-slate-100 md:px-8">
      <div className="mx-auto max-w-7xl space-y-7">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold tracking-[.25em] text-emerald-400">TILT / EXECUTION DESK</p>
            <h1 className="mt-2 text-3xl font-bold">Trading Terminal</h1>
            <p className="mt-2 text-sm text-slate-400">Place virtual market orders against the shared simulation price, with server-side accounting and charges.</p>
          </div>
          <Link href="/markets" className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-4 py-2.5 text-sm text-slate-300 hover:bg-white/5">
            <Activity size={15} /> Explore markets
          </Link>
        </header>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <article className="rounded-2xl border border-white/10 bg-[#0E1728] p-5">
            <div className="flex items-center justify-between text-slate-400"><span className="text-sm">Available cash</span><Wallet size={18} /></div>
            <p className="mt-3 text-2xl font-bold tabular-nums">{money(portfolio.snapshot.cashBalancePaise)}</p>
            <p className="mt-2 text-xs text-slate-500">Funds available to deploy</p>
          </article>
          <article className="rounded-2xl border border-white/10 bg-[#0E1728] p-5">
            <div className="flex items-center justify-between text-slate-400"><span className="text-sm">Portfolio value</span><BriefcaseBusiness size={18} /></div>
            <p className="mt-3 text-2xl font-bold tabular-nums">{money(portfolio.snapshot.portfolioValuePaise)}</p>
            <p className="mt-2 text-xs text-slate-500">Cash plus current holdings</p>
          </article>
          <article className="rounded-2xl border border-white/10 bg-[#0E1728] p-5">
            <div className="flex items-center justify-between text-slate-400"><span className="text-sm">Open positions</span><Activity size={18} /></div>
            <p className="mt-3 text-2xl font-bold tabular-nums">{portfolio.snapshot.holdings.length}</p>
            <p className="mt-2 text-xs text-slate-500">Companies currently held</p>
          </article>
          <article className="rounded-2xl border border-white/10 bg-[#0E1728] p-5">
            <div className="flex items-center justify-between text-slate-400"><span className="text-sm">Current market step</span><Clock3 size={18} /></div>
            <p className="mt-3 text-2xl font-bold tabular-nums">{market.marketStep.toLocaleString("en-IN")}</p>
            <p className="mt-2 text-xs text-slate-500">Shared simulated market candle</p>
          </article>
        </section>

        {error && <div role="alert" className="rounded-xl border border-red-400/20 bg-red-400/5 p-3 text-sm text-red-200">{error}</div>}

        <section className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(330px,.9fr)]">
          <article className="rounded-2xl border border-white/10 bg-[#0E1728] p-5 md:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold tracking-[.18em] text-slate-500">MARKET INSTRUMENT</p>
                <h2 className="mt-2 text-xl font-bold">{selected?.name ?? "No instrument available"}</h2>
                <p className="mt-1 text-sm text-slate-400">{selected?.symbol} · {selected?.sector}</p>
              </div>
              <label className="sr-only" htmlFor="trade-company">Select company</label>
              <select
                id="trade-company"
                value={selected?.symbol ?? ""}
                onChange={(event) => { setSelectedSymbol(event.target.value); setFeedback(null); }}
                className="max-w-full rounded-xl border border-white/10 bg-[#080D19] px-3 py-2.5 text-sm text-slate-200"
              >
                {companies.map((company) => <option key={company.symbol} value={company.symbol}>{company.symbol} — {company.name}</option>)}
              </select>
            </div>

            {selected && (
              <>
                <div className="mt-6 flex flex-wrap items-end gap-3">
                  <p className="text-3xl font-bold tabular-nums">{money(pricePaise)}</p>
                  <p className={lastCandleChange === null ? "mb-1 text-xs text-slate-500" : lastCandleChange >= 0 ? "mb-1 inline-flex items-center gap-1 text-sm text-emerald-300" : "mb-1 inline-flex items-center gap-1 text-sm text-rose-300"}>
                    {lastCandleChange === null ? "Waiting for next candle" : (
                      <>
                        {lastCandleChange >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                        {lastCandleChange >= 0 ? "+" : ""}{lastCandleChange.toFixed(2)}% last candle
                      </>
                    )}
                  </p>
                </div>
                <p className="mt-2 text-xs leading-5 text-slate-500">{selected.description} · Simulated quote, not a live exchange price.</p>
                <div className="mt-5 h-[245px]">
                  {chartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData}>
                        <defs>
                          <linearGradient id="tradePriceFill" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#34D399" stopOpacity={0.25} />
                            <stop offset="100%" stopColor="#34D399" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid stroke="#ffffff10" vertical={false} />
                        <XAxis dataKey="step" stroke="#64748b" tickLine={false} axisLine={false} minTickGap={24} />
                        <YAxis stroke="#64748b" tickLine={false} axisLine={false} width={58} domain={["auto", "auto"]} />
                        <Tooltip contentStyle={{ backgroundColor: "#101827", border: "1px solid #334155", borderRadius: 12, color: "#fff" }} formatter={(value) => [money(Number(value) * 100), "Simulated price"]} />
                        <Area type="monotone" dataKey="price" stroke="#34D399" strokeWidth={2} fill="url(#tradePriceFill)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="pt-12 text-sm text-slate-500">Price history will appear after the next market advance.</p>
                  )}
                </div>
                {holding && (
                  <div className="mt-4 rounded-xl border border-blue-400/20 bg-blue-400/5 p-4">
                    <p className="text-xs text-blue-300">YOUR POSITION</p>
                    <p className="mt-1 text-sm font-semibold">{holding.quantity} shares · Average cost {money(holding.averagePurchasePricePaise)}</p>
                    <p className="mt-1 text-xs text-slate-400">Current market value {money(holding.marketValuePaise)}</p>
                  </div>
                )}
              </>
            )}
          </article>

          <article className="rounded-2xl border border-white/10 bg-[#0E1728] p-5 md:p-6">
            <h2 className="text-lg font-semibold">Place order</h2>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                type="button"
                aria-pressed={side === "BUY"}
                onClick={() => { setSide("BUY"); setFeedback(null); }}
                className={side === "BUY" ? "inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 py-3 text-sm font-bold text-slate-950" : "inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 py-3 text-sm font-semibold text-slate-400 hover:bg-white/5"}
              >
                <ArrowUpRight size={17} /> BUY
              </button>
              <button
                type="button"
                aria-pressed={side === "SELL"}
                onClick={() => { setSide("SELL"); setFeedback(null); }}
                className={side === "SELL" ? "inline-flex items-center justify-center gap-2 rounded-xl bg-rose-500 py-3 text-sm font-bold text-white" : "inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 py-3 text-sm font-semibold text-slate-400 hover:bg-white/5"}
              >
                <ArrowDownRight size={17} /> SELL
              </button>
            </div>

            <label htmlFor="trade-quantity" className="mt-6 block text-sm text-slate-400">Quantity (whole shares)</label>
            <input
              id="trade-quantity"
              type="number"
              inputMode="numeric"
              min="1"
              step="1"
              value={quantity}
              onChange={(event) => { setQuantity(event.target.value); setFeedback(null); }}
              className="mt-2 w-full rounded-xl border border-white/10 bg-[#080D19] px-4 py-3 text-sm outline-none focus:border-emerald-400"
            />

            <div className="mt-5 space-y-3 rounded-xl border border-white/10 bg-white/[0.025] p-4 text-sm">
              <div className="flex justify-between"><span className="text-slate-400">Price per share</span><span>{money(pricePaise)}</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Quantity</span><span>{validQuantity ? parsedQuantity : 0}</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Gross value</span><span>{money(grossPaise)}</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Indicative charges</span><span>{money(chargePaise)}</span></div>
              <div className="flex justify-between border-t border-white/10 pt-3 font-semibold">
                <span>{side === "BUY" ? "Estimated debit" : "Estimated net credit"}</span>
                <span className={side === "BUY" ? "text-emerald-300" : "text-rose-300"}>
                  {money(side === "BUY" ? estimatedDebitPaise : estimatedCreditPaise)}
                </span>
              </div>
              <p className="text-xs leading-5 text-slate-500">Indicative calculation only. The server is authoritative for execution price, fees, cash and holdings.</p>
            </div>

            {side === "BUY" && (
              <p className="mt-3 text-xs text-slate-500">Available cash: {money(portfolio.snapshot.cashBalancePaise)}</p>
            )}
            {side === "SELL" && (
              <p className="mt-3 text-xs text-slate-500">Available shares: {holding?.quantity ?? 0}</p>
            )}

            {feedback && (
              <div role={feedback.tone === "error" ? "alert" : "status"} className={feedback.tone === "success" ? "mt-4 rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-3 text-sm text-emerald-200" : "mt-4 rounded-xl border border-rose-400/20 bg-rose-400/10 p-3 text-sm text-rose-200"}>
                {feedback.text}
              </div>
            )}

            <button
              type="button"
              onClick={() => void submitOrder()}
              disabled={!canSubmit}
              className={side === "BUY"
                ? "mt-5 w-full rounded-xl bg-emerald-500 py-4 text-sm font-bold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-40"
                : "mt-5 w-full rounded-xl bg-rose-500 py-4 text-sm font-bold text-white transition hover:bg-rose-400 disabled:cursor-not-allowed disabled:opacity-40"}
            >
              {busy ? "Submitting order…" : `Execute ${side} order`}
            </button>
            {!canAfford && side === "BUY" && (
              <p className="mt-2 text-xs text-rose-300">The estimated debit is above your available cash.</p>
            )}
            {!canSell && side === "SELL" && (
              <p className="mt-2 text-xs text-rose-300">You do not hold enough shares for this order.</p>
            )}
            <p className="mt-3 text-center text-xs text-slate-500">Virtual trading only · No real money involved</p>
          </article>
        </section>

        <section className="overflow-hidden rounded-2xl border border-white/10 bg-[#0E1728]">
          <div className="flex items-center justify-between border-b border-white/10 p-5">
            <div><h2 className="font-semibold">Your holdings</h2><p className="mt-1 text-xs text-slate-500">Valued by the server using current simulation prices.</p></div>
            <BriefcaseBusiness size={18} className="text-blue-400" />
          </div>
          {portfolio.snapshot.holdings.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[740px] text-left text-sm">
                <thead className="bg-white/[0.025] text-xs text-slate-500"><tr><th className="px-5 py-4">Company</th><th className="px-5 py-4">Quantity</th><th className="px-5 py-4">Avg. cost</th><th className="px-5 py-4">Last price</th><th className="px-5 py-4">Market value</th><th className="px-5 py-4">Unrealised P&L</th></tr></thead>
                <tbody>
                  {portfolio.snapshot.holdings.map((item) => (
                    <tr key={item.symbol} className="border-t border-white/5">
                      <td className="px-5 py-4 font-semibold">{item.symbol}</td><td className="px-5 py-4">{item.quantity}</td><td className="px-5 py-4">{money(item.averagePurchasePricePaise)}</td><td className="px-5 py-4">{money(item.currentPricePaise)}</td><td className="px-5 py-4">{money(item.marketValuePaise)}</td><td className={item.unrealisedPnlPaise >= 0 ? "px-5 py-4 text-emerald-300" : "px-5 py-4 text-rose-300"}>{money(item.unrealisedPnlPaise)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-8 text-center"><p className="text-sm text-slate-300">No holdings yet.</p><p className="mt-1 text-xs text-slate-500">Execute your first virtual buy order to start a position.</p></div>
          )}
        </section>

        <section className="overflow-hidden rounded-2xl border border-white/10 bg-[#0E1728]">
          <div className="flex items-center justify-between border-b border-white/10 p-5">
            <div><h2 className="font-semibold">Transaction history</h2><p className="mt-1 text-xs text-slate-500">Executed orders and server-recorded charges.</p></div>
            <Clock3 size={18} className="text-slate-400" />
          </div>
          {portfolio.transactions.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="bg-white/[0.025] text-xs text-slate-500"><tr><th className="px-5 py-4">Company</th><th className="px-5 py-4">Side</th><th className="px-5 py-4">Quantity</th><th className="px-5 py-4">Execution price</th><th className="px-5 py-4">Charges</th><th className="px-5 py-4">Realised P&L</th><th className="px-5 py-4">Step</th></tr></thead>
                <tbody>
                  {[...portfolio.transactions].reverse().map((transaction) => (
                    <tr key={transaction.id} className="border-t border-white/5">
                      <td className="px-5 py-4 font-semibold">{transaction.symbol}</td>
                      <td className={transaction.side === "BUY" ? "px-5 py-4 text-emerald-300" : "px-5 py-4 text-rose-300"}>{transaction.side}</td>
                      <td className="px-5 py-4">{transaction.quantity}</td>
                      <td className="px-5 py-4">{money(transaction.executionPricePaise)}</td>
                      <td className="px-5 py-4">{money(transaction.chargesPaise)}</td>
                      <td className={transaction.realisedPnlPaise >= 0 ? "px-5 py-4 text-emerald-300" : "px-5 py-4 text-rose-300"}>{money(transaction.realisedPnlPaise)}</td>
                      <td className="px-5 py-4">#{transaction.marketStep}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="p-8 text-center text-sm text-slate-500">No transactions yet.</p>
          )}
        </section>
      </div>
    </main>
  );
}
