"use client";

import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import Link from "next/link";
import Papa from "papaparse";
import {
  Activity, AlertTriangle, Brain, CheckCircle2, FileSpreadsheet, Info,
  ShieldCheck, Upload,
} from "lucide-react";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import type { TradeOrder, TradingState } from "@/features/trading/trading-engine";
import { INITIAL_TRADING_STATE } from "@/features/trading/trading-engine";

type Side = "BUY" | "SELL";
type AnalyticsTrade = {
  id: string;
  date: string;
  symbol: string;
  side: Side;
  quantity: number;
  price: number;
  total: number;
  pnl?: number;
  source: "simulator" | "csv";
};
type CsvTrade = Omit<AnalyticsTrade, "source">;
const TRADING_KEY = "tilt-trading-state";
const IMPORT_KEY = "tilt-imported-trades";
const COLORS = ["#34d399", "#60a5fa", "#a78bfa", "#fbbf24", "#fb7185", "#22d3ee"];
const money = (value: number) => "₹" + Math.round(value).toLocaleString("en-IN");
const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, "");
const parseNumber = (value: unknown) => {
  const raw = String(value ?? "").replace(/[₹,\s]/g, "").trim();
  if (!raw) return NaN;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : NaN;
};

function readSimulatorTrades(state: TradingState): AnalyticsTrade[] {
  return state.orders.filter((order) => order.status === "EXECUTED").map((order: TradeOrder) => ({
    id: order.id,
    date: order.timestamp,
    symbol: order.symbol,
    side: order.side,
    quantity: order.quantity,
    price: order.price,
    total: order.total,
    source: "simulator" as const,
  }));
}

function parseCsv(file: File): Promise<CsvTrade[]> {
  return new Promise((resolve, reject) => {
    if (file.size > 5 * 1024 * 1024) {
      reject(new Error("This CSV is larger than 5 MB. Export a smaller date range and try again."));
      return;
    }

    Papa.parse<Record<string, unknown>>(file, {
      header: true,
      skipEmptyLines: "greedy",
      transformHeader: (header) => normalize(header),
      complete: ({ data, errors, meta }) => {
        if (errors.length) {
          reject(new Error("The CSV contains formatting errors. Re-export it as a standard comma-separated CSV and try again."));
          return;
        }
        if (data.length > 20000) {
          reject(new Error("This file contains more than 20,000 rows. Import a smaller date range."));
          return;
        }
        const fields = meta.fields ?? [];
        const pick = (row: Record<string, unknown>, aliases: string[]) => {
          const key = fields.find((field) => aliases.includes(normalize(field)));
          return key ? row[key] : undefined;
        };
        const rows: CsvTrade[] = [];
        for (const [index, row] of data.entries()) {
          const symbol = String(pick(row, ["symbol", "ticker", "stock", "tradingsymbol", "instrument"]) ?? "").trim().toUpperCase();
          const rawSide = String(pick(row, ["side", "type", "action", "transactiontype", "buysell"]) ?? "").trim().toUpperCase();
          const side: Side | null = /^(BUY|B|PURCHASE)$/.test(rawSide) ? "BUY" : /^(SELL|S|SALE)$/.test(rawSide) ? "SELL" : null;
          const quantity = parseNumber(pick(row, ["quantity", "qty", "shares", "units", "filledquantity"]));
          const price = parseNumber(pick(row, ["price", "averageprice", "avgprice", "tradeprice", "rate"]));
          const totalRaw = parseNumber(pick(row, ["total", "value", "tradevalue", "amount", "turnover"]));
          const total = Number.isFinite(totalRaw) ? Math.abs(totalRaw) : quantity * price;
          const rawDate = String(pick(row, ["date", "timestamp", "datetime", "tradedate", "orderdate"]) ?? "");
          const parsedDate = rawDate ? new Date(rawDate) : null;
          const pnlRaw = parseNumber(pick(row, ["pnl", "profitloss", "realizedpnl", "realisedpnl", "profit"]));
          if (!symbol || !side || !Number.isFinite(quantity) || quantity <= 0 || !Number.isFinite(price) || price < 0 || !Number.isFinite(total)) continue;
          rows.push({
            id: "csv-" + index + "-" + symbol,
            date: parsedDate && !Number.isNaN(parsedDate.getTime()) ? parsedDate.toISOString() : "",
            symbol, side, quantity, price, total,
            ...(Number.isFinite(pnlRaw) ? { pnl: pnlRaw } : {}),
          });
        }
        if (!rows.length) {
          reject(new Error("No valid trades found. Include columns for symbol, side (BUY/SELL), quantity and price."));
          return;
        }
        resolve(rows);
      },
      error: (error) => reject(error),
    });
  });
}

export default function TradingAnalytics({ mode }: { mode: "psychology" | "history" }) {
  const [simulatorTrades, setSimulatorTrades] = useState<AnalyticsTrade[]>([]);
  const [importedTrades, setImportedTrades] = useState<CsvTrade[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    try {
      const savedState = localStorage.getItem(TRADING_KEY);
      const state = savedState ? JSON.parse(savedState) as TradingState : INITIAL_TRADING_STATE;
      if (Array.isArray(state.orders)) setSimulatorTrades(readSimulatorTrades(state));
      const savedImports = localStorage.getItem(IMPORT_KEY);
      if (savedImports) {
        const parsed = JSON.parse(savedImports) as CsvTrade[];
        if (Array.isArray(parsed)) setImportedTrades(parsed);
      }
    } catch {
      setError("Some saved analytics data could not be loaded. You can still import a CSV.");
    } finally {
      setLoaded(true);
    }
  }, []);

  const trades = importedTrades.length ? importedTrades.map((t) => ({ ...t, source: "csv" as const })) : simulatorTrades;
  const hasImported = importedTrades.length > 0;
  const buyTrades = trades.filter((trade) => trade.side === "BUY");
  const sellTrades = trades.filter((trade) => trade.side === "SELL");
  const totalVolume = trades.reduce((sum, trade) => sum + trade.total, 0);
  const symbols = new Set(trades.map((trade) => trade.symbol)).size;
  const suppliedPnl = trades.filter((trade) => typeof trade.pnl === "number");
  const pnlTotal = suppliedPnl.reduce((sum, trade) => sum + (trade.pnl ?? 0), 0);
  const hasPnl = suppliedPnl.length > 0;

  const sideData = [
    { name: "Buy orders", value: buyTrades.length },
    { name: "Sell orders", value: sellTrades.length },
  ].filter((item) => item.value > 0);
  const symbolData = Object.entries(trades.reduce<Record<string, number>>((acc, trade) => {
    acc[trade.symbol] = (acc[trade.symbol] ?? 0) + trade.total;
    return acc;
  }, {})).map(([symbol, value]) => ({ symbol, value })).sort((a, b) => b.value - a.value).slice(0, 6);
  const timeline = Object.entries(trades.reduce<Record<string, number>>((acc, trade) => {
    const parsed = new Date(trade.date);
    if (!trade.date || Number.isNaN(parsed.getTime())) return acc;
    const day = parsed.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit" });
    acc[day] = (acc[day] ?? 0) + 1;
    return acc;
  }, {})).map(([date, count]) => ({ date, count })).slice(-14);
  const avgTrade = trades.length ? totalVolume / trades.length : 0;
  const largest = [...trades].sort((a, b) => b.total - a.total)[0];

  const patterns = useMemo(() => {
    if (!trades.length) return [];
    const results: { title: string; detail: string; level: "watch" | "neutral" | "positive" }[] = [];
    const buyRatio = buyTrades.length / trades.length;
    if (trades.length >= 6 && trades.length / Math.max(1, new Set(trades.map((t) => new Date(t.date).toDateString())).size) > 4) {
      results.push({ title: "High trading frequency", detail: "You average more than four recorded trades per active day. Review whether each trade had a clear reason.", level: "watch" });
    }
    const top = symbolData[0];
    if (top && totalVolume > 0 && top.value / totalVolume >= 0.6) {
      results.push({ title: "Single-symbol concentration", detail: top.symbol + " represents " + Math.round(top.value / totalVolume * 100) + "% of recorded trade value. Check whether this reflects a deliberate strategy.", level: "watch" });
    }
    if (trades.length >= 4 && buyRatio > 0.85) {
      results.push({ title: "Mostly buy-side activity", detail: "Most recorded activity is on the buy side. This is a description of the dataset, not inherently good or bad.", level: "neutral" });
    } else if (trades.length >= 4 && buyRatio < 0.2) {
      results.push({ title: "Mostly sell-side activity", detail: "Most recorded activity is on the sell side. Consider the context and purpose of these transactions.", level: "neutral" });
    }
    if (hasPnl) {
      results.push({ title: pnlTotal >= 0 ? "Reported P&L is positive" : "Reported P&L is negative", detail: "The CSV contains P&L values for " + suppliedPnl.length + " trades. This reflects the supplied file and may not include fees or taxes.", level: pnlTotal >= 0 ? "positive" : "watch" });
    }
    return results;
  }, [trades, buyTrades.length, totalVolume, symbolData, hasPnl, pnlTotal, suppliedPnl.length]);

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setBusy(true); setError(""); setMessage("");
    try {
      const rows = await parseCsv(file);
      setImportedTrades(rows);
      localStorage.setItem(IMPORT_KEY, JSON.stringify(rows));
      setMessage("Imported " + rows.length + " valid trades from " + file.name + ".");
    } catch (err) {
      setError(err instanceof Error ? err.message : "CSV import failed.");
    } finally {
      setBusy(false);
      event.target.value = "";
    }
  }

  function clearImport() {
    localStorage.removeItem(IMPORT_KEY);
    setImportedTrades([]);
    setMessage("Imported history cleared from this browser.");
    setError("");
  }

  if (!loaded) return <main className="min-h-screen bg-[#080d18] p-8 text-slate-400">Loading your analytics…</main>;

  return (
    <main className="min-h-screen bg-[#080d18] px-4 py-8 text-white sm:px-8">
      <div className="mx-auto max-w-7xl space-y-7">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-cyan-300">TILT / MARKET MIRROR</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">{mode === "psychology" ? "Trading Psychology" : "Trading History Analyzer"}</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">{mode === "psychology" ? "Understand the patterns behind your simulated trading decisions—not just the numbers." : "Import a broker statement or trade log and turn your transaction history into clear visual insights."}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/portfolio/insights" className={"rounded-lg border px-3 py-2 text-xs " + (mode === "psychology" ? "border-cyan-300/40 bg-cyan-300/10 text-cyan-200" : "border-white/10 text-slate-400")}>Psychology</Link>
            <Link href="/portfolio/history" className={"rounded-lg border px-3 py-2 text-xs " + (mode === "history" ? "border-cyan-300/40 bg-cyan-300/10 text-cyan-200" : "border-white/10 text-slate-400")}>History Analyzer</Link>
          </div>
        </header>

        {mode === "history" && (
          <section className="rounded-2xl border border-cyan-300/20 bg-[#101a2b] p-5 md:p-6">
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
              <div className="flex items-start gap-3">
                <div className="rounded-xl bg-cyan-300/10 p-3 text-cyan-200"><FileSpreadsheet size={22} /></div>
                <div><h2 className="font-semibold">Import your trading history</h2><p className="mt-1 max-w-xl text-xs leading-5 text-slate-400">CSV only. Required columns: symbol, side (BUY/SELL), quantity and price. Optional: date, total and P&L. Your file is processed in this browser and saved locally.</p></div>
              </div>
              <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-cyan-300 px-5 py-3 text-sm font-bold text-slate-950 hover:bg-cyan-200">
                <Upload size={16} /> {busy ? "Analysing…" : "Upload CSV"}
                <input type="file" accept=".csv,text/csv" className="hidden" disabled={busy} onChange={handleFile} />
              </label>
            </div>
            {message && <p className="mt-4 flex items-center gap-2 text-xs text-emerald-300"><CheckCircle2 size={15} />{message}</p>}
            {error && <p role="alert" className="mt-4 flex items-center gap-2 text-xs text-rose-300"><AlertTriangle size={15} />{error}</p>}
            {hasImported && <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4"><p className="text-xs text-slate-400">{importedTrades.length} imported rows · Saved in this browser</p><button onClick={clearImport} className="text-xs text-slate-400 underline hover:text-white">Clear imported data</button></div>}
          </section>
        )}

        {mode === "psychology" && (
          <section className="flex items-start gap-3 rounded-2xl border border-violet-300/20 bg-violet-300/[0.05] p-4">
            <Brain className="mt-0.5 shrink-0 text-violet-300" size={20} />
            <p className="text-xs leading-5 text-slate-300">These are descriptive learning signals from recorded simulated trades. They do not diagnose your personality or prove why you made a decision. Import a CSV in the History Analyzer and it will also become the dataset for these insights.</p>
          </section>
        )}

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "Recorded trades", value: String(trades.length), sub: trades.length ? "Orders in selected dataset" : "No trade records yet" },
            { label: "Total traded value", value: money(totalVolume), sub: "Gross buy + sell turnover" },
            { label: "Symbols traded", value: String(symbols), sub: "Distinct instruments" },
            { label: hasPnl ? "Reported P&L" : "Average trade value", value: hasPnl ? money(pnlTotal) : money(avgTrade), sub: hasPnl ? suppliedPnl.length + " rows include P&L" : "No P&L field assumed" },
          ].map((card) => <div key={card.label} className="rounded-2xl border border-white/10 bg-[#111a2b] p-5"><p className="text-xs text-slate-400">{card.label}</p><p className="mt-3 text-2xl font-bold">{card.value}</p><p className="mt-1 text-xs text-slate-500">{card.sub}</p></div>)}
        </section>

        {!trades.length ? (
          <section className="rounded-2xl border border-dashed border-white/15 bg-[#111a2b] px-6 py-16 text-center">
            <Activity className="mx-auto text-slate-500" size={34} />
            <h2 className="mt-4 text-lg font-semibold">No trade data to visualise yet</h2>
            <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-400">Make a few simulated trades or upload a CSV with your transaction history. The charts and behavioural indicators will populate from those records.</p>
            <div className="mt-5 flex flex-wrap justify-center gap-3"><Link href="/trading" className="rounded-lg bg-cyan-300 px-4 py-2.5 text-sm font-semibold text-slate-950">Open Simulator</Link>{mode === "psychology" && <Link href="/portfolio/history" className="rounded-lg border border-white/10 px-4 py-2.5 text-sm text-slate-300">Import CSV</Link>}</div>
          </section>
        ) : (
          <>
            <section className="grid gap-5 xl:grid-cols-[0.85fr_1.15fr]">
              <div className="rounded-2xl border border-white/10 bg-[#111a2b] p-5">
                <div className="mb-4"><h2 className="font-semibold">Buy vs sell activity</h2><p className="mt-1 text-xs text-slate-500">Count of recorded orders</p></div>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={sideData} dataKey="value" nameKey="name" innerRadius={62} outerRadius={94} paddingAngle={4}>{sideData.map((entry, index) => <Cell key={entry.name} fill={COLORS[index]} />)}</Pie><Tooltip contentStyle={{ background: "#0b1322", border: "1px solid #334155", borderRadius: 12 }} /><text x="50%" y="47%" textAnchor="middle" fill="#fff" fontSize="25" fontWeight="700">{trades.length}</text><text x="50%" y="57%" textAnchor="middle" fill="#94a3b8" fontSize="11">orders</text></PieChart></ResponsiveContainer>
                </div>
                <div className="flex justify-center gap-5 text-xs text-slate-400"><span><i className="mr-2 inline-block h-2 w-2 rounded-full bg-emerald-400" />Buy {buyTrades.length}</span><span><i className="mr-2 inline-block h-2 w-2 rounded-full bg-blue-400" />Sell {sellTrades.length}</span></div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-[#111a2b] p-5">
                <div className="mb-4"><h2 className="font-semibold">Trading activity over time</h2><p className="mt-1 text-xs text-slate-500">Number of recorded orders by date</p></div>
                <div className="h-64"><ResponsiveContainer width="100%" height="100%"><AreaChart data={timeline}><defs><linearGradient id="tradeCountFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#22d3ee" stopOpacity={0.35} /><stop offset="100%" stopColor="#22d3ee" stopOpacity={0} /></linearGradient></defs><CartesianGrid stroke="#ffffff10" vertical={false} /><XAxis dataKey="date" tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} /><YAxis allowDecimals={false} tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} /><Tooltip contentStyle={{ background: "#0b1322", border: "1px solid #334155", borderRadius: 12 }} /><Area type="monotone" dataKey="count" name="Orders" stroke="#22d3ee" fill="url(#tradeCountFill)" strokeWidth={2} /></AreaChart></ResponsiveContainer></div>
              </div>
            </section>

            <section className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
              <div className="rounded-2xl border border-white/10 bg-[#111a2b] p-5">
                <div className="mb-4"><h2 className="font-semibold">Trade value by symbol</h2><p className="mt-1 text-xs text-slate-500">Gross transaction value, not current holdings</p></div>
                <div className="h-72"><ResponsiveContainer width="100%" height="100%"><BarChart data={symbolData} layout="vertical" margin={{ left: 12, right: 18 }}><CartesianGrid stroke="#ffffff10" horizontal={false} /><XAxis type="number" tick={{ fill: "#94a3b8", fontSize: 11 }} tickFormatter={(v) => "₹" + Number(v).toLocaleString("en-IN")} axisLine={false} tickLine={false} /><YAxis type="category" dataKey="symbol" width={90} tick={{ fill: "#cbd5e1", fontSize: 11 }} axisLine={false} tickLine={false} /><Tooltip formatter={(value) => [money(Number(value)), "Trade value"]} contentStyle={{ background: "#0b1322", border: "1px solid #334155", borderRadius: 12 }} /><Bar dataKey="value" radius={[0, 6, 6, 0]}>{symbolData.map((item, index) => <Cell key={item.symbol} fill={COLORS[index % COLORS.length]} />)}</Bar></BarChart></ResponsiveContainer></div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-[#111a2b] p-5">
                <h2 className="font-semibold">{mode === "psychology" ? "Behavioural signals" : "History observations"}</h2>
                <p className="mt-1 text-xs text-slate-500">Patterns that can be checked in this dataset</p>
                <div className="mt-4 space-y-3">
                  {patterns.length ? patterns.map((pattern) => <div key={pattern.title} className="rounded-xl border border-white/10 bg-[#0b1322] p-3"><div className="flex items-center gap-2">{pattern.level === "positive" ? <ShieldCheck size={15} className="text-emerald-300" /> : <Info size={15} className={pattern.level === "watch" ? "text-amber-300" : "text-cyan-300"} />}<p className="text-sm font-semibold">{pattern.title}</p></div><p className="mt-2 text-xs leading-5 text-slate-400">{pattern.detail}</p></div>) : <p className="rounded-xl bg-[#0b1322] p-4 text-xs leading-5 text-slate-400">Not enough activity to identify a useful pattern yet. More records may reveal trends.</p>}
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-white/10 bg-[#111a2b] p-5">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-semibold">Recent recorded trades</h2><p className="mt-1 text-xs text-slate-500">Largest trade: {largest ? largest.symbol + " · " + money(largest.total) : "—"}</p></div><span className="rounded-full bg-cyan-300/10 px-3 py-1 text-[11px] text-cyan-200">{hasImported ? "Imported CSV" : "Simulator records"}</span></div>
              <div className="overflow-x-auto"><table className="w-full min-w-[620px] text-left text-xs"><thead className="text-slate-500"><tr><th className="pb-3">Date</th><th className="pb-3">Symbol</th><th className="pb-3">Side</th><th className="pb-3">Quantity</th><th className="pb-3">Price</th><th className="pb-3">Value</th></tr></thead><tbody>{[...trades].slice().reverse().slice(0, 12).map((trade) => <tr key={trade.id} className="border-t border-white/5"><td className="py-3 text-slate-400">{trade.date && !Number.isNaN(new Date(trade.date).getTime()) ? new Date(trade.date).toLocaleDateString("en-IN") : "Date unavailable"}</td><td className="font-semibold">{trade.symbol}</td><td className={trade.side === "BUY" ? "text-emerald-300" : "text-blue-300"}>{trade.side}</td><td>{trade.quantity}</td><td>{money(trade.price)}</td><td>{money(trade.total)}</td></tr>)}</tbody></table></div>
            </section>
          </>
        )}

        <div className="flex items-start gap-2 rounded-xl border border-white/10 bg-[#101a2b] p-4 text-[11px] leading-5 text-slate-500"><AlertTriangle size={15} className="mt-0.5 shrink-0 text-amber-300" /><p><strong className="text-slate-300">Data note:</strong> Charts describe the records available in this browser. CSV imports are stored in local browser storage, not uploaded to TILT's server. Trade value is gross turnover; it is not profit. P&L is shown only when supplied in the CSV. These insights are educational and may omit fees, taxes, corporate actions and incomplete records.</p></div>
      </div>
    </main>
  );
}
