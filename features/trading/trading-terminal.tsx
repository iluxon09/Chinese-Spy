"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  Activity,
  Wallet,
  BriefcaseBusiness,
  Clock,
  TrendingUp,
} from "lucide-react";

import { marketStocks } from "@/features/market/market-data";
import {
  executeTrade,
  INITIAL_TRADING_STATE,
  type TradingState,
} from "./trading-engine";

const STORAGE_KEY = "tilt-trading-state";

const money = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value);

export default function TradingTerminal() {
  const [tradingState, setTradingState] = useState<TradingState>(
    INITIAL_TRADING_STATE
  );
  const [isLoaded, setIsLoaded] = useState(false);

  const [selectedSymbol, setSelectedSymbol] = useState("RELIANCE");
  const [side, setSide] = useState<"BUY" | "SELL">("BUY");
  const [quantity, setQuantity] = useState("1");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    try {
      const savedState = localStorage.getItem(STORAGE_KEY);

      if (savedState) {
        const parsed = JSON.parse(savedState) as TradingState;

        if (
          typeof parsed.cashBalance === "number" &&
          Array.isArray(parsed.holdings) &&
          Array.isArray(parsed.orders)
        ) {
          setTradingState(parsed);
        }
      }
    } catch {
      console.error("Could not load saved trading state.");
    } finally {
      setIsLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!isLoaded) return;

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tradingState));
    } catch {
      console.error("Could not save trading state.");
    }
  }, [tradingState, isLoaded]);

  const selectedStock =
    marketStocks.find((stock) => stock.symbol === selectedSymbol) ??
    marketStocks[0];

  const parsedQuantity = Number(quantity);

  const orderValue = useMemo(() => {
    return Number.isInteger(parsedQuantity) && parsedQuantity > 0
      ? selectedStock.price * parsedQuantity
      : 0;
  }, [parsedQuantity, selectedStock.price]);

  const currentHolding = tradingState.holdings.find(
    (item) => item.symbol === selectedSymbol
  );

  function handleTrade() {
    setError("");
    setMessage("");

    try {
      const updatedState = executeTrade(
        tradingState,
        selectedStock,
        side,
        parsedQuantity
      );

      setTradingState(updatedState);

      setMessage(
        `${side} order executed successfully: ${parsedQuantity} shares of ${selectedSymbol}.`
      );

      setQuantity("1");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong."
      );
    }
  }

  if (!isLoaded) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#080D19] text-slate-400">
        Loading trading account...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#080D19] px-5 py-8 text-slate-100 md:px-10">
      <div className="mx-auto max-w-7xl space-y-8">
        <header className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-emerald-400">
              TILT / EXECUTION DESK
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">
              Trading Terminal
            </h1>
            <p className="mt-2 text-sm text-slate-400">
              Execute trades in your virtual financial universe.
            </p>
          </div>

          <div className="flex items-center gap-2 rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3">
            <Activity size={17} className="text-emerald-400" />
            <span className="text-sm font-medium text-emerald-400">
              Simulation Active
            </span>
          </div>
        </header>

        <section className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-[#0E1728] p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-400">Available Cash</p>
              <Wallet className="text-emerald-400" size={20} />
            </div>
            <h2 className="mt-3 text-2xl font-bold">
              {money(tradingState.cashBalance)}
            </h2>
            <p className="mt-2 text-xs text-slate-500">
              Funds available for trading
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#0E1728] p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-400">Portfolio Holdings</p>
              <BriefcaseBusiness className="text-blue-400" size={20} />
            </div>
            <h2 className="mt-3 text-2xl font-bold">
              {tradingState.holdings.length}
            </h2>
            <p className="mt-2 text-xs text-slate-500">
              Different stocks currently owned
            </p>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-2xl border border-white/10 bg-[#0E1728] p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Market Instrument</h2>
              <TrendingUp size={20} className="text-emerald-400" />
            </div>

            <label className="mt-6 block text-sm text-slate-400">
              Select Stock
            </label>

            <select
              value={selectedSymbol}
              onChange={(e) => {
                setSelectedSymbol(e.target.value);
                setError("");
                setMessage("");
              }}
              className="mt-2 w-full rounded-xl border border-white/10 bg-[#080D19] px-4 py-3 text-sm outline-none focus:border-emerald-400"
            >
              {marketStocks.map((stock) => (
                <option key={stock.symbol} value={stock.symbol}>
                  {stock.symbol} — {stock.name}
                </option>
              ))}
            </select>

            <div className="mt-7 rounded-xl border border-white/10 bg-white/[0.025] p-5">
              <p className="text-sm text-slate-400">
                {selectedStock.name}
              </p>

              <h3 className="mt-2 text-3xl font-bold">
                {money(selectedStock.price)}
              </h3>

              <div
                className={`mt-3 flex items-center gap-2 text-sm font-medium ${
                  selectedStock.change >= 0
                    ? "text-emerald-400"
                    : "text-red-400"
                }`}
              >
                {selectedStock.change >= 0 ? (
                  <ArrowUpRight size={17} />
                ) : (
                  <ArrowDownRight size={17} />
                )}
                {selectedStock.change > 0 ? "+" : ""}
                {selectedStock.change}% today
              </div>

              <div className="mt-5 grid grid-cols-2 gap-4 border-t border-white/10 pt-4">
                <div>
                  <p className="text-xs text-slate-500">Sector</p>
                  <p className="mt-1 text-sm font-medium">
                    {selectedStock.sector}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Volume</p>
                  <p className="mt-1 text-sm font-medium">
                    {selectedStock.volume}
                  </p>
                </div>
              </div>
            </div>

            {currentHolding && (
              <div className="mt-4 rounded-xl border border-blue-400/20 bg-blue-400/5 p-4">
                <p className="text-xs text-blue-300">Your current position</p>
                <p className="mt-1 text-sm font-semibold">
                  {currentHolding.quantity} shares
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  Average price: {money(currentHolding.averagePrice)}
                </p>
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#0E1728] p-6">
            <h2 className="text-lg font-semibold">Place Order</h2>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                onClick={() => {
                  setSide("BUY");
                  setError("");
                  setMessage("");
                }}
                className={`flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition ${
                  side === "BUY"
                    ? "bg-emerald-500 text-[#06130D]"
                    : "border border-white/10 bg-white/[0.03] text-slate-400 hover:bg-white/5"
                }`}
              >
                <ArrowUpRight size={17} />
                BUY
              </button>

              <button
                onClick={() => {
                  setSide("SELL");
                  setError("");
                  setMessage("");
                }}
                className={`flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition ${
                  side === "SELL"
                    ? "bg-red-500 text-white"
                    : "border border-white/10 bg-white/[0.03] text-slate-400 hover:bg-white/5"
                }`}
              >
                <ArrowDownRight size={17} />
                SELL
              </button>
            </div>

            <label className="mt-6 block text-sm text-slate-400">
              Order Type
            </label>
            <div className="mt-2 rounded-xl border border-white/10 bg-[#080D19] px-4 py-3 text-sm text-slate-300">
              Market Order
              <span className="float-right text-xs text-emerald-400">
                Instant execution
              </span>
            </div>

            <label className="mt-6 block text-sm text-slate-400">
              Quantity (Shares)
            </label>

            <input
              type="number"
              min="1"
              step="1"
              value={quantity}
              onChange={(e) => {
                setQuantity(e.target.value);
                setError("");
                setMessage("");
              }}
              className="mt-2 w-full rounded-xl border border-white/10 bg-[#080D19] px-4 py-3 text-sm outline-none focus:border-emerald-400"
              placeholder="Enter quantity"
            />

            <div className="mt-6 space-y-3 rounded-xl border border-white/10 bg-white/[0.025] p-4">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Price per share</span>
                <span>{money(selectedStock.price)}</span>
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Quantity</span>
                <span>{parsedQuantity > 0 ? parsedQuantity : 0}</span>
              </div>

              <div className="flex justify-between border-t border-white/10 pt-3">
                <span className="font-medium">Estimated Total</span>
                <span className="text-lg font-bold text-emerald-400">
                  {money(orderValue)}
                </span>
              </div>
            </div>

            {side === "BUY" && (
              <p className="mt-4 text-xs text-slate-500">
                Available balance: {money(tradingState.cashBalance)}
              </p>
            )}

            {error && (
              <div role="alert" className="mt-4 rounded-xl border border-red-400/20 bg-red-400/10 p-3 text-sm text-red-400">
                {error}
              </div>
            )}

            {message && (
              <div role="status" className="mt-4 rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-3 text-sm text-emerald-400">
                {message}
              </div>
            )}

            <button
              onClick={handleTrade}
              disabled={
                !Number.isInteger(parsedQuantity) ||
                parsedQuantity <= 0 ||
                !Number.isFinite(orderValue) ||
                orderValue <= 0
              }
              className={`mt-5 w-full rounded-xl py-4 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-40 ${
                side === "BUY"
                  ? "bg-emerald-500 text-[#06130D] hover:bg-emerald-400"
                  : "bg-red-500 text-white hover:bg-red-400"
              }`}
            >
              {side === "BUY" ? "Execute Buy Order" : "Execute Sell Order"}
            </button>

            <p className="mt-3 text-center text-xs text-slate-500">
              Virtual trading only. No real money involved.
            </p>
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-white/10 bg-[#0E1728]">
          <div className="flex items-center justify-between border-b border-white/10 p-5">
            <h2 className="font-semibold">Your Holdings</h2>
            <BriefcaseBusiness size={19} className="text-blue-400" />
          </div>

          {tradingState.holdings.length === 0 ? (
            <div className="p-10 text-center">
              <Wallet size={30} className="mx-auto text-slate-600" />
              <p className="mt-3 text-sm text-slate-400">
                No holdings yet.
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Execute your first buy order to get started.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-white/[0.025] text-xs text-slate-500">
                  <tr>
                    <th className="px-5 py-4">Stock</th>
                    <th className="px-5 py-4">Quantity</th>
                    <th className="px-5 py-4">Average Price</th>
                    <th className="px-5 py-4">Current Price</th>
                    <th className="px-5 py-4">Market Value</th>
                  </tr>
                </thead>
                <tbody>
                  {tradingState.holdings.map((holding) => {
                    const stock = marketStocks.find(
                      (item) => item.symbol === holding.symbol
                    );
                    const price = stock?.price ?? holding.averagePrice;

                    return (
                      <tr key={holding.symbol} className="border-t border-white/5">
                        <td className="px-5 py-4 font-semibold">{holding.symbol}</td>
                        <td className="px-5 py-4">{holding.quantity}</td>
                        <td className="px-5 py-4">{money(holding.averagePrice)}</td>
                        <td className="px-5 py-4">{money(price)}</td>
                        <td className="px-5 py-4 font-medium">
                          {money(price * holding.quantity)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="overflow-hidden rounded-2xl border border-white/10 bg-[#0E1728]">
          <div className="flex items-center justify-between border-b border-white/10 p-5">
            <h2 className="font-semibold">Order History</h2>
            <Clock size={19} className="text-slate-400" />
          </div>

          {tradingState.orders.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500">
              No orders have been placed yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-white/[0.025] text-xs text-slate-500">
                  <tr>
                    <th className="px-5 py-4">Stock</th>
                    <th className="px-5 py-4">Side</th>
                    <th className="px-5 py-4">Quantity</th>
                    <th className="px-5 py-4">Price</th>
                    <th className="px-5 py-4">Total</th>
                    <th className="px-5 py-4">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {tradingState.orders.map((order) => (
                    <tr key={order.id} className="border-t border-white/5">
                      <td className="px-5 py-4 font-semibold">{order.symbol}</td>
                      <td className={`px-5 py-4 font-semibold ${
                        order.side === "BUY" ? "text-emerald-400" : "text-red-400"
                      }`}>
                        {order.side}
                      </td>
                      <td className="px-5 py-4">{order.quantity}</td>
                      <td className="px-5 py-4">{money(order.price)}</td>
                      <td className="px-5 py-4">{money(order.total)}</td>
                      <td className="px-5 py-4">
                        <span className="rounded-full bg-emerald-400/10 px-3 py-1 text-xs text-emerald-400">
                          {order.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}