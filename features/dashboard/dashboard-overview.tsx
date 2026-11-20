"use client";

import { useState } from "react";
import Link from "next/link";
import { Area,AreaChart,CartesianGrid,ResponsiveContainer,Tooltip,XAxis,YAxis } from "recharts";
import { ArrowUpRight,BriefcaseBusiness,ChartNoAxesCombined,Wallet } from "lucide-react";
import { useTilt } from "@/features/shared/tilt-provider";

const money=(paise:number)=>new Intl.NumberFormat("en-IN",{style:"currency",currency:"INR",maximumFractionDigits:2}).format(paise/100);

export default function DashboardOverview() {
  const {authenticated,loading,error,portfolio,market,histories,sessionId,createSession}=useTilt();
  const [creating,setCreating]=useState(false);
  const [actionMessage,setActionMessage]=useState("");
  async function startNewSimulation(){setCreating(true);setActionMessage("");try{const id=await createSession();setActionMessage("New simulation created: "+id.slice(0,8));}catch(e){setActionMessage(e instanceof Error?e.message:"Could not create simulation.");}finally{setCreating(false);}}
  if(loading) return <main className="p-8 text-slate-300">Loading your TILT portfolio…</main>;
  if(!authenticated) return <main className="p-8"><h1 className="text-3xl font-bold">Welcome to TILT</h1><p className="mt-3 text-slate-400">{error || "Sign in to begin your simulation."}</p><Link className="mt-6 inline-flex rounded-xl bg-emerald-400 px-5 py-3 font-semibold text-slate-950" href="/login">Sign in / Create account</Link></main>;
  if(!portfolio || !market) return <main className="p-8 text-red-300">{error || "Portfolio unavailable"}</main>;
  const s=portfolio.snapshot;
  const lead=market.companies[0];
  const chart=(lead ? histories[lead.symbol] ?? [] : []).map(p=>({step:`Step ${p.market_step}`,price:p.pricePaise/100}));
  const cards=[
    {label:"Portfolio value",value:money(s.portfolioValuePaise),icon:Wallet},
    {label:"Invested amount",value:money(s.investedAmountPaise),icon:BriefcaseBusiness},
    {label:"Available cash",value:money(s.cashBalancePaise),icon:Wallet},
    {label:"Total P&L",value:money(s.totalPnlPaise),icon:ChartNoAxesCombined},
  ];
  return <main className="min-h-screen bg-[#080D19] text-slate-100">
    <header className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 px-5 py-5 md:px-8"><div><p className="text-sm text-slate-400">Financial Universe / Overview</p><h1 className="mt-1 text-2xl font-semibold">Dashboard</h1><p className="mt-2 text-sm text-slate-500">Simulation {sessionId?.slice(0,8)} · Market step {market.marketStep}</p></div><button onClick={startNewSimulation} disabled={creating} className="rounded-xl bg-emerald-400 px-4 py-3 text-sm font-semibold text-slate-950 disabled:opacity-50">{creating?"Creating…":"＋ New Simulation"}</button></header>
      {actionMessage&&<p role="status" className="mx-5 mt-4 rounded-lg bg-white/5 p-3 text-sm text-slate-300 md:mx-8">{actionMessage}</p>}
    <div className="space-y-8 p-5 md:p-8">
      <div><p className="text-sm text-slate-400">Welcome back, Investor</p><h2 className="mt-1 text-3xl font-bold">Your financial universe.</h2><p className="mt-2 text-sm text-slate-500">Track your performance. Understand your decisions. Build your strategy.</p></div>
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{cards.map(c=>{const Icon=c.icon;return <article key={c.label} className="rounded-2xl border border-white/10 bg-[#101827] p-5"><div className="flex justify-between text-sm text-slate-400"><span>{c.label}</span><Icon size={19} className="text-emerald-400"/></div><p className="mt-5 text-2xl font-bold">{c.value}</p>{c.label==="Total P&L"&&<p className={`mt-2 flex items-center gap-1 text-sm ${s.totalPnlPaise>=0?"text-emerald-400":"text-red-400"}`}><ArrowUpRight size={15}/>{s.returnPercent.toFixed(2)}% return</p>}</article>})}</section>
      <section className="grid gap-6 xl:grid-cols-2">
        <article className="rounded-2xl border border-white/10 bg-[#101827] p-5"><h3 className="font-semibold">Market price history{lead? ` · ${lead.symbol}`:""}</h3><p className="mt-1 text-xs text-slate-500">Persisted simulated prices, not fabricated portfolio history</p><div className="mt-5 h-[270px]">{chart.length?<ResponsiveContainer width="100%" height="100%"><AreaChart data={chart}><CartesianGrid stroke="#ffffff10" vertical={false}/><XAxis dataKey="step" stroke="#64748b"/><YAxis stroke="#64748b"/><Tooltip/><Area dataKey="price" stroke="#34D399" fill="#34D399" fillOpacity={.12}/></AreaChart></ResponsiveContainer>:<p className="pt-12 text-sm text-slate-500">No price history yet.</p>}</div></article>
        <article className="rounded-2xl border border-white/10 bg-[#101827] p-5"><h3 className="font-semibold">Market watchlist</h3><div className="mt-5 space-y-4">{market.companies.slice(0,5).map(c=><div key={c.symbol} className="flex justify-between gap-3"><div><p className="font-semibold">{c.symbol}</p><p className="text-xs text-slate-500">{c.name} · {c.sector}</p></div><p className="font-medium">{money(c.currentPrice?.pricePaise ?? c.initialPricePaise)}</p></div>)}</div><Link href="/markets" className="mt-6 inline-flex text-sm text-emerald-400">Explore all companies →</Link></article>
      </section>
      <section className="rounded-2xl border border-white/10 bg-[#101827] p-5"><div className="flex items-center justify-between"><h3 className="font-semibold">Recent transactions</h3><Link href="/portfolio" className="text-sm text-emerald-400">View portfolio →</Link></div>{portfolio.transactions.length===0?<p className="mt-5 text-sm text-slate-500">No trades yet. Open the market and place your first virtual order.</p>:<div className="mt-4 overflow-x-auto"><table className="w-full text-left text-sm"><thead className="text-slate-500"><tr><th className="py-3">Symbol</th><th>Side</th><th>Qty</th><th>Execution</th><th>Charges</th><th>Step</th></tr></thead><tbody>{portfolio.transactions.slice(-5).reverse().map(t=><tr key={t.id} className="border-t border-white/5"><td className="py-3 font-semibold">{t.symbol}</td><td className={t.side==="BUY"?"text-emerald-400":"text-red-400"}>{t.side}</td><td>{t.quantity}</td><td>{money(t.executionPricePaise)}</td><td>{money(t.chargesPaise)}</td><td>{t.marketStep}</td></tr>)}</tbody></table></div>}</section>
    </div>
  </main>;
}
