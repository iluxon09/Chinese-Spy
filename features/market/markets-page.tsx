"use client";

import {useMemo,useState} from "react";
import {Search,Star} from "lucide-react";
import {Area,AreaChart,CartesianGrid,ResponsiveContainer,Tooltip,XAxis,YAxis} from "recharts";
import {useTilt} from "@/features/shared/tilt-provider";

const money=(p:number)=>new Intl.NumberFormat("en-IN",{style:"currency",currency:"INR",maximumFractionDigits:2}).format(p/100);
export default function MarketsPage(){
 const {loading,error,authenticated,market,histories}=useTilt();
 const [query,setQuery]=useState(""); const [sector,setSector]=useState("All");
 const [selected,setSelected]=useState(""); const [watch,setWatch]=useState<string[]>([]);
 const companies=useMemo(()=>market?.companies??[],[market?.companies]);
 const active=companies.find(c=>c.symbol===selected)??companies[0];
 const sectors=["All",...Array.from(new Set(companies.map(c=>c.sector)))];
 const filtered=useMemo(()=>companies.filter(c=>(sector==="All"||c.sector===sector)&&`${c.symbol} ${c.name}`.toLowerCase().includes(query.toLowerCase())),[companies,sector,query]);
 const history=active?(histories[active.symbol]??[]).map(p=>({step:`Step ${p.market_step}`,price:p.pricePaise/100})):[];
 if(loading)return <main className="p-8 text-slate-300">Loading fictional market…</main>;
 if(!authenticated||!market)return <main className="p-8 text-slate-400">{error||"Sign in to view the market."}</main>;
 return <main className="min-h-screen bg-[#080D19] p-5 text-slate-100 md:p-8"><div className="mx-auto max-w-7xl space-y-7">
 <header><p className="text-xs tracking-[.25em] text-emerald-400">TILT / FICTIONAL EXCHANGE</p><h1 className="mt-2 text-3xl font-bold">Markets</h1><p className="mt-2 text-sm text-slate-400">Eight fictional companies · Market step {market.marketStep}</p></header>
 {market.events.length>0&&<section className="rounded-2xl border border-amber-400/20 bg-amber-400/5 p-5"><h2 className="font-semibold text-amber-300">News & market events</h2><div className="mt-3 grid gap-3 md:grid-cols-2">{market.events.map(e=><article key={e.id} className="rounded-xl border border-white/10 p-3"><p className="font-medium">{e.title}</p><p className="mt-1 text-sm text-slate-400">{e.description}</p><p className="mt-2 text-xs text-slate-500">{e.symbol??e.sector} · {(e.effect_bps/100).toFixed(2)}%</p></article>)}</div></section>}
 <section className="grid gap-6 xl:grid-cols-[1.5fr_1fr]"><article className="rounded-2xl border border-white/10 bg-[#101827] p-5"><div className="flex justify-between"><div><p className="text-xs text-slate-500">SELECTED COMPANY</p><h2 className="mt-2 text-2xl font-bold">{active?.name??"Select a company"}</h2><p className="text-sm text-slate-400">{active?.symbol} · {active?.sector}</p></div><button onClick={()=>active&&setWatch(v=>v.includes(active.symbol)?v.filter(s=>s!==active.symbol):[...v,active.symbol])} className="h-10 rounded-lg border border-white/10 px-3 text-sm text-slate-300"><Star size={15} className="inline"/> {active&&watch.includes(active.symbol)?"Saved":"Watch"}</button></div>
 {active&&<><p className="mt-5 text-3xl font-bold">{money(active.currentPrice?.pricePaise??active.initialPricePaise)}</p><p className="mt-1 text-xs text-slate-500">{active.description}</p><div className="mt-5 h-[260px]">{history.length?<ResponsiveContainer width="100%" height="100%"><AreaChart data={history}><CartesianGrid stroke="#ffffff12" vertical={false}/><XAxis dataKey="step" stroke="#64748b"/><YAxis stroke="#64748b"/><Tooltip/><Area dataKey="price" stroke="#34D399" fill="#34D399" fillOpacity={.12}/></AreaChart></ResponsiveContainer>:<p className="pt-12 text-sm text-slate-500">Price history will appear as the simulation advances.</p>}</div></>}</article>
 <article className="rounded-2xl border border-white/10 bg-[#101827] p-5"><h2 className="font-semibold">Company directory</h2><div className="mt-4 flex gap-2"><div className="relative flex-1"><Search size={16} className="absolute left-3 top-3 text-slate-500"/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search companies" className="w-full rounded-xl border border-white/10 bg-[#080D19] py-2.5 pl-9 pr-3 text-sm"/></div><select value={sector} onChange={e=>setSector(e.target.value)} className="max-w-32 rounded-xl border border-white/10 bg-[#080D19] px-2 text-sm">{sectors.map(s=><option key={s}>{s}</option>)}</select></div><div className="mt-4 max-h-[420px] space-y-2 overflow-y-auto">{filtered.map(c=><button key={c.symbol} onClick={()=>setSelected(c.symbol)} className={`w-full rounded-xl border p-3 text-left ${(active?.symbol===c.symbol)?"border-emerald-400/30 bg-emerald-400/10":"border-white/5 hover:bg-white/5"}`}><div className="flex justify-between"><div><p className="font-semibold">{c.symbol}</p><p className="text-xs text-slate-500">{c.name} · {c.sector}</p></div><p className="text-sm">{money(c.currentPrice?.pricePaise??c.initialPricePaise)}</p></div></button>)}{filtered.length===0&&<p className="p-5 text-center text-sm text-slate-500">No companies found.</p>}</div></article></section>
 </div></main>;
}
