"use client";

import {useState} from "react";
import {RefreshCw,ArrowRight} from "lucide-react";
import Link from "next/link";
import {useTilt} from "@/features/shared/tilt-provider";
const money=(p:number)=>new Intl.NumberFormat("en-IN",{style:"currency",currency:"INR",maximumFractionDigits:2}).format(p/100);
export default function SimulatorDashboard(){
 const {loading,error,authenticated,market,advanceMarket}=useTilt();const [busy,setBusy]=useState(false);const [message,setMessage]=useState("");
 async function advance(){setBusy(true);setMessage("");try{await advanceMarket();setMessage("Market advanced. Prices and events have been refreshed.");}catch(e){setMessage(e instanceof Error?e.message:"Advance failed.");}finally{setBusy(false);}}
 if(loading)return <main className="p-8 text-slate-300">Loading simulator…</main>;
 if(!authenticated||!market)return <main className="p-8 text-slate-400">{error||"Sign in to start a simulation."}</main>;
 return <main className="min-h-screen bg-[#080D19] p-5 text-slate-100 md:p-8"><div className="mx-auto max-w-7xl space-y-7">
 <header><p className="text-xs tracking-[.25em] text-emerald-400">TILT / SIMULATION CONTROL</p><h1 className="mt-2 text-3xl font-bold">Market Simulator</h1><p className="mt-2 text-sm text-slate-400">Deterministic fictional market · Scenario {market.scenario.name}</p></header>
 <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-emerald-400/20 bg-emerald-400/5 p-5"><div><p className="text-sm text-emerald-300">Current market step</p><p className="mt-1 text-4xl font-bold">{market.marketStep}</p></div><button onClick={advance} disabled={busy} className="rounded-xl bg-emerald-400 px-5 py-3 font-semibold text-slate-950 disabled:opacity-50"><RefreshCw className="mr-2 inline" size={16}/>{busy?"Advancing…":"Advance market one step"}</button></section>
 {error&&<p role="alert" className="rounded-xl border border-red-400/20 bg-red-400/5 p-3 text-sm text-red-200">{error}</p>}
 {message&&<p role="status" className="rounded-xl bg-white/5 p-3 text-sm text-slate-300">{message}</p>}
 <section className="grid gap-4 md:grid-cols-2">{market.events.length?market.events.map(e=><article key={e.id} className="rounded-2xl border border-white/10 bg-[#101827] p-5"><p className="text-xs text-amber-300">STEP {e.market_step} NEWS</p><h2 className="mt-2 font-semibold">{e.title}</h2><p className="mt-2 text-sm text-slate-400">{e.description}</p><p className="mt-3 text-xs text-slate-500">{e.symbol??e.sector} · {(e.effect_bps/100).toFixed(2)}% effect</p></article>):<p className="text-sm text-slate-500">No event scheduled for this step.</p>}</section>
 <section className="rounded-2xl border border-white/10 bg-[#101827] p-5"><h2 className="font-semibold">Company prices</h2><div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{market.companies.map(c=><article key={c.symbol} className="rounded-xl border border-white/5 p-4"><p className="font-semibold">{c.symbol}</p><p className="text-xs text-slate-500">{c.name} · {c.sector}</p><p className="mt-3 text-xl font-bold">{money(c.currentPrice?.pricePaise??c.initialPricePaise)}</p></article>)}</div></section>
 <Link href="/markets" className="inline-flex items-center gap-2 text-sm text-emerald-400">Explore market <ArrowRight size={15}/></Link>
 </div></main>;
}
