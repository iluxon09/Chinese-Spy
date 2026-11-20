"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft, ArrowRight, BrainCircuit, CircleHelp, Clock3,
  GraduationCap, ShieldCheck, Wallet, AlertTriangle, RotateCcw,
  ChartNoAxesCombined,
} from "lucide-react";

type Risk = "conservative" | "balanced" | "growth";
type Goal = "preserve" | "grow" | "learn";
type Horizon = "under-3" | "3-5" | "5-10" | "10-plus";

type Allocation = {
  name: string;
  type: string;
  percent: number;
  risk: string;
  access: string;
  why: string;
  color: string;
};

const profiles: Record<Risk, { title: string; description: string; allocations: Allocation[] }> = {
  conservative: {
    title: "Capital-first learner",
    description: "A more cautious mix that gives greater weight to stability and access to money.",
    allocations: [
      { name: "Bank fixed deposits", type: "Fixed-income", percent: 40, risk: "Low (subject to bank and deposit limits)", access: "Premature withdrawal rules apply", why: "A predictable interest rate can make this easier to understand while you learn.", color: "bg-emerald-400" },
      { name: "Short-duration debt funds", type: "Mutual fund", percent: 30, risk: "Low to moderate; NAV can fall", access: "Usually redeemable on business days", why: "Adds a diversified debt-fund component, while still carrying interest-rate and credit risk.", color: "bg-sky-400" },
      { name: "Broad-market index fund", type: "Equity mutual fund", percent: 20, risk: "High; market-linked", access: "Usually redeemable on business days", why: "A smaller equity allocation introduces long-term market participation.", color: "bg-violet-400" },
      { name: "Gold ETF / fund", type: "Commodity-linked fund", percent: 10, risk: "High; price can fluctuate", access: "Depends on product and market hours", why: "A different return driver can diversify the mix, but gold prices are volatile too.", color: "bg-amber-400" },
    ],
  },
  balanced: {
    title: "Balanced builder",
    description: "A middle-ground educational example combining stability, diversification and growth exposure.",
    allocations: [
      { name: "Bank fixed deposits", type: "Fixed-income", percent: 20, risk: "Low (subject to bank and deposit limits)", access: "Premature withdrawal rules apply", why: "A stable component can help balance the ups and downs elsewhere.", color: "bg-emerald-400" },
      { name: "Short-duration debt funds", type: "Mutual fund", percent: 20, risk: "Low to moderate; NAV can fall", access: "Usually redeemable on business days", why: "Adds diversified fixed-income exposure, without implying a guaranteed return.", color: "bg-sky-400" },
      { name: "Broad-market index fund", type: "Equity mutual fund", percent: 45, risk: "High; market-linked", access: "Usually redeemable on business days", why: "Broad diversification across many companies, rather than betting on one stock.", color: "bg-violet-400" },
      { name: "Gold ETF / fund", type: "Commodity-linked fund", percent: 15, risk: "High; price can fluctuate", access: "Depends on product and market hours", why: "Provides exposure to a different asset class; it can still lose value.", color: "bg-amber-400" },
    ],
  },
  growth: {
    title: "Long-horizon explorer",
    description: "A growth-oriented illustration with greater market risk. It is not suitable for money needed soon.",
    allocations: [
      { name: "Bank fixed deposits", type: "Fixed-income", percent: 10, risk: "Low (subject to bank and deposit limits)", access: "Premature withdrawal rules apply", why: "Keeps a smaller, more predictable portion in the mix.", color: "bg-emerald-400" },
      { name: "Short-duration debt funds", type: "Mutual fund", percent: 10, risk: "Low to moderate; NAV can fall", access: "Usually redeemable on business days", why: "Adds a debt allocation, though returns and principal are not guaranteed.", color: "bg-sky-400" },
      { name: "Broad-market index fund", type: "Equity mutual fund", percent: 60, risk: "High; market-linked", access: "Usually redeemable on business days", why: "A larger diversified equity allocation aims for long-term participation, with meaningful downside risk.", color: "bg-violet-400" },
      { name: "Gold ETF / fund", type: "Commodity-linked fund", percent: 20, risk: "High; price can fluctuate", access: "Depends on product and market hours", why: "Adds a non-equity asset class, but does not protect against every market fall.", color: "bg-amber-400" },
    ],
  },
};

const horizonLabels: Record<Horizon, string> = {
  "under-3": "Less than 3 years",
  "3-5": "3–5 years",
  "5-10": "5–10 years",
  "10-plus": "More than 10 years",
};

const money = (n: number) => "₹" + Math.round(n).toLocaleString("en-IN");

export default function InvestmentArchitect() {
  const [amount, setAmount] = useState("20000");
  const [risk, setRisk] = useState<Risk>("balanced");
  const [goal, setGoal] = useState<Goal>("grow");
  const [horizon, setHorizon] = useState<Horizon>("5-10");
  const [emergencyReady, setEmergencyReady] = useState("yes");
  const [built, setBuilt] = useState(false);

  const principal = Math.max(0, Number(amount) || 0);
  const effectiveRisk: Risk =
    horizon === "under-3" || goal === "preserve" ? "conservative" : risk;
  const profile = profiles[effectiveRisk];
  const allocations = useMemo(
    () => profile.allocations.map((item) => ({ ...item, amount: principal * item.percent / 100 })),
    [profile, principal],
  );

  const canBuild = principal >= 500 && principal <= 100000000;

  return (
    <main className="min-h-screen bg-[#080d18] px-4 py-7 text-white md:px-8">
      <div className="mx-auto max-w-6xl">
        <Link href="/portfolio" className="mb-7 inline-flex items-center gap-2 text-sm text-slate-400 transition hover:text-white">
          <ArrowLeft size={16} /> Back to Portfolio
        </Link>

        <header className="mb-8">
          <div className="mb-3 flex items-center gap-2 text-cyan-300">
            <BrainCircuit size={19} />
            <span className="text-xs font-bold uppercase tracking-[0.2em]">TILT · Investment Architect</span>
            <span className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-2 py-1 text-[10px] font-semibold text-cyan-200">NEW EXPERIENCE</span>
          </div>
          <h1 className="max-w-3xl text-3xl font-bold tracking-tight md:text-5xl">Give your money a <span className="text-cyan-300">clearer direction.</span></h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-400 md:text-base">
            Tell us what you are working with. TILT will turn the basics into an easy-to-understand, educational allocation plan—not just another SIP calculation.
          </p>
        </header>

        <div className="grid gap-6 lg:grid-cols-[0.92fr_1.08fr]">
          <section className="rounded-2xl border border-white/10 bg-[#111a2b] p-5 md:p-7">
            <div className="mb-6 flex items-center gap-3">
              <div className="rounded-xl bg-cyan-400/10 p-2.5 text-cyan-300"><Wallet size={20} /></div>
              <div><h2 className="font-semibold">Your starting point</h2><p className="text-xs text-slate-500">A few details help shape the illustration</p></div>
            </div>

            <label className="mb-2 block text-sm font-medium text-slate-300" htmlFor="investment-amount">How much are you looking to invest?</label>
            <div className="flex items-center rounded-xl border border-white/10 bg-[#0b1322] px-4 focus-within:border-cyan-400/60">
              <span className="text-xl text-slate-500">₹</span>
              <input id="investment-amount" type="number" min="500" max="100000000" value={amount} onChange={(e) => { setAmount(e.target.value); setBuilt(false); }} className="w-full bg-transparent px-3 py-4 text-2xl font-bold outline-none" />
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {[5000, 10000, 20000, 50000, 100000].map((v) => <button key={v} onClick={() => { setAmount(String(v)); setBuilt(false); }} className={`rounded-full border px-3 py-1.5 text-xs transition ${Number(amount) === v ? "border-cyan-300/50 bg-cyan-300/10 text-cyan-200" : "border-white/10 text-slate-400 hover:border-white/30"}`}>{money(v)}</button>)}
            </div>

            <div className="my-7 border-t border-white/10" />
            <fieldset>
              <legend className="mb-3 text-sm font-medium text-slate-300">What matters most to you?</legend>
              <div className="grid gap-2">
                {([
                  ["preserve", "Protect what I have", "I prefer stability over high growth."],
                  ["grow", "Grow my money over time", "I can accept some ups and downs."],
                  ["learn", "I'm exploring and learning", "Help me understand the options first."],
                ] as const).map(([value, title, desc]) => <button type="button" key={value} onClick={() => { setGoal(value); setBuilt(false); }} className={`rounded-xl border p-3 text-left transition ${goal === value ? "border-cyan-300/50 bg-cyan-300/[0.07]" : "border-white/10 bg-[#0b1322] hover:border-white/20"}`}><span className="block text-sm font-semibold">{title}</span><span className="mt-1 block text-xs text-slate-500">{desc}</span></button>)}
              </div>
            </fieldset>

            <div className="mt-6">
              <label className="mb-3 block text-sm font-medium text-slate-300" htmlFor="horizon">When might you need this money?</label>
              <select id="horizon" value={horizon} onChange={(e) => { setHorizon(e.target.value as Horizon); setBuilt(false); }} className="w-full rounded-xl border border-white/10 bg-[#0b1322] px-4 py-3 text-sm text-white outline-none focus:border-cyan-400/60">
                {Object.entries(horizonLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </div>

            <fieldset className="mt-6">
              <legend className="mb-3 text-sm font-medium text-slate-300">How comfortable are you with market ups and downs?</legend>
              <div className="grid grid-cols-3 gap-2">
                {([
                  ["conservative", "Low"],
                  ["balanced", "Medium"],
                  ["growth", "High"],
                ] as const).map(([value, label]) => <button type="button" key={value} onClick={() => { setRisk(value); setBuilt(false); }} className={`rounded-xl border py-3 text-sm font-semibold transition ${risk === value ? "border-cyan-300/50 bg-cyan-300/10 text-cyan-200" : "border-white/10 bg-[#0b1322] text-slate-400 hover:border-white/20"}`}>{label}</button>)}
              </div>
              <p className="mt-2 text-xs leading-5 text-slate-500">Low = prefer smaller fluctuations. High = can tolerate larger temporary losses. Neither removes risk.</p>
              {goal === "preserve" && <p className="mt-2 text-xs leading-5 text-amber-200">Your capital-preservation goal takes priority, so the illustration will use the conservative mix.</p>}
            </fieldset>

            <div className="mt-6 rounded-xl border border-white/10 bg-[#0b1322] p-4">
              <p className="text-sm font-medium text-slate-300">Do you already have emergency savings?</p>
              <div className="mt-3 flex gap-2">
                {(["yes", "not-yet", "unsure"] as const).map((v) => <button key={v} onClick={() => { setEmergencyReady(v); setBuilt(false); }} className={`rounded-lg border px-3 py-2 text-xs ${emergencyReady === v ? "border-cyan-300/50 bg-cyan-300/10 text-cyan-200" : "border-white/10 text-slate-400"}`}>{v === "yes" ? "Yes" : v === "not-yet" ? "Not yet" : "Not sure"}</button>)}
              </div>
            </div>

            <button disabled={!canBuild} onClick={() => setBuilt(true)} className="mt-7 flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-300 px-5 py-4 text-sm font-bold text-slate-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-40">
              Build my learning plan <ArrowRight size={17} />
            </button>
            {!canBuild && <p className="mt-2 text-xs text-rose-300">Enter an amount between ₹500 and ₹10 crore.</p>}
            <p className="mt-3 text-center text-[11px] text-slate-600">No account linking · No real-money transactions · No guaranteed returns</p>
          </section>

          <section className="rounded-2xl border border-white/10 bg-[#111a2b] p-5 md:p-7">
            {!built ? (
              <div className="flex min-h-[560px] flex-col justify-between">
                <div>
                  <div className="mb-5 inline-flex rounded-xl bg-violet-400/10 p-3 text-violet-300"><ChartNoAxesCombined size={22} /></div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-violet-300">Your plan preview</p>
                  <h2 className="mt-3 text-2xl font-bold">A plan that starts with you.</h2>
                  <p className="mt-3 max-w-md text-sm leading-6 text-slate-400">Answer the questions on the left to see an illustrative allocation, the role of each asset class, and the risks you should understand before making any real-world decision.</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-white/10 bg-[#0b1322] p-4"><ShieldCheck className="mb-3 text-emerald-300" size={20} /><p className="text-sm font-semibold">Risk-aware</p><p className="mt-1 text-xs leading-5 text-slate-500">The time horizon and risk preference shape the example mix.</p></div>
                  <div className="rounded-xl border border-white/10 bg-[#0b1322] p-4"><GraduationCap className="mb-3 text-sky-300" size={20} /><p className="text-sm font-semibold">Beginner-friendly</p><p className="mt-1 text-xs leading-5 text-slate-500">Understand what each category does and what can go wrong.</p></div>
                  <div className="rounded-xl border border-white/10 bg-[#0b1322] p-4"><Clock3 className="mb-3 text-amber-300" size={20} /><p className="text-sm font-semibold">Time horizon matters</p><p className="mt-1 text-xs leading-5 text-slate-500">Money needed soon should not be treated like long-term money.</p></div>
                  <div className="rounded-xl border border-white/10 bg-[#0b1322] p-4"><CircleHelp className="mb-3 text-violet-300" size={20} /><p className="text-sm font-semibold">Transparent limits</p><p className="mt-1 text-xs leading-5 text-slate-500">No invented live prices or claims of AI market analysis.</p></div>
                </div>
              </div>
            ) : (
              <div>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div><p className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-300">Your illustrative allocation</p><h2 className="mt-2 text-2xl font-bold">{money(principal)}</h2><p className="mt-1 text-sm text-slate-400">{profile.title} · {horizonLabels[horizon]}</p></div>
                  <button onClick={() => setBuilt(false)} className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-2 text-xs text-slate-400 hover:text-white"><RotateCcw size={13} /> Edit answers</button>
                </div>

                {(horizon === "under-3" || goal === "preserve") && <div className="mt-5 flex gap-2 rounded-xl border border-amber-300/20 bg-amber-300/[0.06] p-3 text-xs leading-5 text-amber-100"><AlertTriangle size={16} className="mt-0.5 shrink-0" />{horizon === "under-3" ? "Because your horizon is under 3 years, this illustration uses the conservative mix even if you selected a higher risk preference. Equity can fall sharply over short periods." : "Because capital preservation is your stated priority, this illustration uses the conservative mix. It still includes market-linked assets and does not guarantee that your principal is protected."}</div>}
                {emergencyReady !== "yes" && <div className="mt-3 rounded-xl border border-amber-300/20 bg-amber-300/[0.06] p-3 text-xs leading-5 text-amber-100">Consider building an accessible emergency reserve before investing money you may need unexpectedly. This plan does not set aside an emergency fund.</div>}

                <p className="mt-5 text-sm leading-6 text-slate-400">{profile.description} {goal === "preserve" ? "You selected capital preservation, so consider whether any market-linked exposure is appropriate for your needs." : goal === "learn" ? "Use this as a learning exercise: compare the trade-offs before deciding whether any category belongs in your plan." : "A longer horizon can make market risk more manageable, but it never guarantees a positive outcome."}</p>

                <div className="mt-6 space-y-4">
                  {allocations.map((item) => (
                    <div key={item.name} className="rounded-xl border border-white/10 bg-[#0b1322] p-4">
                      <div className="flex items-start justify-between gap-3"><div><p className="font-semibold">{item.name}</p><p className="mt-1 text-xs text-slate-500">{item.type}</p></div><div className="text-right"><p className="font-bold">{money(item.amount)}</p><p className="text-xs text-cyan-300">{item.percent}%</p></div></div>
                      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10"><div className={`h-full rounded-full ${item.color}`} style={{ width: item.percent + "%" }} /></div>
                      <p className="mt-3 text-xs leading-5 text-slate-400">{item.why}</p>
                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-500"><span>Risk: {item.risk}</span><span>Access: {item.access}</span></div>
                    </div>
                  ))}
                </div>

                <div className="mt-5 rounded-xl border border-cyan-300/20 bg-cyan-300/[0.05] p-4">
                  <p className="text-sm font-semibold text-cyan-100">What this plan does—and doesn't do</p>
                  <p className="mt-2 text-xs leading-5 text-slate-400">This is a rule-based educational illustration, not an AI-generated or live-market recommendation. It does not compare current FD rates, fund expense ratios, NAVs, taxes or product suitability. Those checks require verified, up-to-date data and a proper suitability process.</p>
                </div>
                <button onClick={() => { setAmount("20000"); setRisk("balanced"); setGoal("grow"); setHorizon("5-10"); setEmergencyReady("yes"); setBuilt(false); }} className="mt-5 text-xs text-slate-500 underline decoration-slate-700 underline-offset-4 hover:text-white">Reset the planner</button>
              </div>
            )}
          </section>
        </div>

        <div className="mt-6 flex gap-3 rounded-xl border border-white/10 bg-[#111a2b] p-4 text-xs leading-5 text-slate-500">
          <AlertTriangle size={17} className="mt-0.5 shrink-0 text-amber-300" />
          <p><strong className="text-slate-300">Important:</strong> TILT is an educational simulator. The percentages above are illustrative examples, not personal financial advice or a recommendation to buy any product. Investments can lose value; mutual funds and ETFs are not deposits. Verify product documents, fees, taxes, liquidity and risks independently before making financial decisions.</p>
        </div>
      </div>
    </main>
  );
}
