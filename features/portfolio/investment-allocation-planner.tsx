"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  ChartNoAxesCombined,
  Clock3,
  Info,
  RotateCcw,
  ShieldCheck,
  Wallet,
} from "lucide-react";

type Risk = "conservative" | "balanced" | "growth";
type Goal = "preserve" | "grow" | "learn";
type Horizon = "under-3" | "3-5" | "5-10" | "10-plus";

type Allocation = {
  name: string;
  category: string;
  percent: number;
  risk: string;
  liquidity: string;
  role: string;
  color: string;
};

type Profile = {
  title: string;
  summary: string;
  allocations: Allocation[];
};

const profiles: Record<Risk, Profile> = {
  conservative: {
    title: "Lower-volatility illustration",
    summary: "A relatively cautious mix. It still includes market-linked exposure and does not protect every rupee of principal.",
    allocations: [
      { name: "Bank fixed deposits", category: "Fixed income", percent: 40, risk: "Low, subject to bank risk and deposit limits", liquidity: "Premature withdrawal rules may apply", role: "A defined interest rate can make returns easier to understand when held to maturity.", color: "bg-emerald-400" },
      { name: "Short-duration debt funds", category: "Debt mutual fund", percent: 30, risk: "Low to moderate; NAV can fall", liquidity: "Redemption and settlement terms vary", role: "Adds diversified debt exposure, with interest-rate and credit risk.", color: "bg-sky-400" },
      { name: "Broad-market index fund", category: "Equity mutual fund", percent: 25, risk: "High; market-linked", liquidity: "Market-linked; settlement rules apply", role: "Introduces diversified equity exposure rather than a single-stock bet.", color: "bg-violet-400" },
      { name: "Gold ETF / fund", category: "Commodity-linked fund", percent: 5, risk: "High; gold prices fluctuate", liquidity: "Product and market-hour dependent", role: "Adds a different return driver, but gold can also fall in value.", color: "bg-amber-400" },
    ],
  },
  balanced: {
    title: "Balanced growth illustration",
    summary: "A mixed example balancing fixed-income exposure with a larger allocation to diversified equities.",
    allocations: [
      { name: "Bank fixed deposits", category: "Fixed income", percent: 20, risk: "Low, subject to bank risk and deposit limits", liquidity: "Premature withdrawal rules may apply", role: "A more predictable component can temper volatility elsewhere in the mix.", color: "bg-emerald-400" },
      { name: "Short-duration debt funds", category: "Debt mutual fund", percent: 20, risk: "Low to moderate; NAV can fall", liquidity: "Redemption and settlement terms vary", role: "Provides diversified fixed-income exposure without a guaranteed return.", color: "bg-sky-400" },
      { name: "Broad-market index fund", category: "Equity mutual fund", percent: 50, risk: "High; market-linked", liquidity: "Market-linked; settlement rules apply", role: "Provides broad equity-market participation across many companies.", color: "bg-violet-400" },
      { name: "Gold ETF / fund", category: "Commodity-linked fund", percent: 10, risk: "High; gold prices fluctuate", liquidity: "Product and market-hour dependent", role: "Adds an asset class with a different set of price drivers.", color: "bg-amber-400" },
    ],
  },
  growth: {
    title: "Growth-oriented illustration",
    summary: "A higher-volatility example. It may experience substantial declines and is not designed for money needed soon.",
    allocations: [
      { name: "Bank fixed deposits", category: "Fixed income", percent: 10, risk: "Low, subject to bank risk and deposit limits", liquidity: "Premature withdrawal rules may apply", role: "Retains a smaller fixed-income component.", color: "bg-emerald-400" },
      { name: "Short-duration debt funds", category: "Debt mutual fund", percent: 10, risk: "Low to moderate; NAV can fall", liquidity: "Redemption and settlement terms vary", role: "Maintains some diversified debt exposure, with no guaranteed principal.", color: "bg-sky-400" },
      { name: "Broad-market index fund", category: "Equity mutual fund", percent: 70, risk: "High; market-linked", liquidity: "Market-linked; settlement rules apply", role: "Makes diversified equity the dominant source of potential long-term growth and volatility.", color: "bg-violet-400" },
      { name: "Gold ETF / fund", category: "Commodity-linked fund", percent: 10, risk: "High; gold prices fluctuate", liquidity: "Product and market-hour dependent", role: "Adds a non-equity asset class without guaranteeing downside protection.", color: "bg-amber-400" },
    ],
  },
};

const shortHorizonProfile: Profile = {
  title: "Short-horizon stability illustration",
  summary: "Because this money may be needed within three years, this example excludes equity and gold exposure. Debt funds still carry NAV, credit and interest-rate risk.",
  allocations: [
    { name: "Bank fixed deposits", category: "Fixed income", percent: 70, risk: "Low, subject to bank risk and deposit limits", liquidity: "Premature withdrawal rules may apply", role: "A maturity date can help align cash availability with a known spending date.", color: "bg-emerald-400" },
    { name: "Short-duration debt funds", category: "Debt mutual fund", percent: 30, risk: "Low to moderate; NAV can fall", liquidity: "Redemption and settlement terms vary", role: "Adds diversified debt exposure, but it is not a bank deposit or capital guarantee.", color: "bg-sky-400" },
  ],
};

const horizonLabels: Record<Horizon, string> = {
  "under-3": "Less than 3 years",
  "3-5": "3–5 years",
  "5-10": "5–10 years",
  "10-plus": "More than 10 years",
};

const money = (value: number) =>
  "₹" + Math.round(value).toLocaleString("en-IN", { maximumFractionDigits: 0 });

export default function InvestmentAllocationPlanner() {
  const [amount, setAmount] = useState("20000");
  const [risk, setRisk] = useState<Risk>("balanced");
  const [goal, setGoal] = useState<Goal>("grow");
  const [horizon, setHorizon] = useState<Horizon>("5-10");
  const [emergencyReady, setEmergencyReady] = useState<"yes" | "not-yet" | "unsure">("yes");
  const [built, setBuilt] = useState(false);

  const numericAmount = amount.trim() === "" ? 0 : Number(amount);
  const validAmount = Number.isFinite(numericAmount) && numericAmount >= 500 && numericAmount <= 100000000;
  const shortHorizon = horizon === "under-3";
  const stabilityLed = shortHorizon || goal === "preserve";
  const profile = shortHorizon ? shortHorizonProfile : profiles[goal === "preserve" ? "conservative" : risk];
  const profileTitle = goal === "preserve" && !shortHorizon
    ? "Capital-stability illustration"
    : profile.title;
  const allocations = profile.allocations.map((item) => ({
    ...item,
    amount: numericAmount * item.percent / 100,
  }));
  const selectedRiskLabel = stabilityLed ? "Stability-led" : risk === "growth" ? "Higher volatility" : risk === "balanced" ? "Moderate volatility" : "Lower volatility";

  function updateInput(update: () => void) {
    update();
    setBuilt(false);
  }

  function buildPlan(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (validAmount) setBuilt(true);
  }

  function resetPlanner() {
    setAmount("20000");
    setRisk("balanced");
    setGoal("grow");
    setHorizon("5-10");
    setEmergencyReady("yes");
    setBuilt(false);
  }

  return (
    <main className="min-h-screen bg-[#0b111a] px-4 py-7 text-slate-100 md:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-5">
          <Link href="/portfolio" className="inline-flex items-center gap-2 text-sm text-slate-400 transition hover:text-white">
            <ArrowLeft size={16} /> Portfolio
          </Link>
          <div className="flex items-center gap-4 text-sm">
            <span className="hidden text-xs font-semibold uppercase tracking-[.15em] text-slate-500 sm:inline">TILT / Learning tools</span>
            <Link href="/portfolio/architect/sip" className="inline-flex items-center gap-2 text-cyan-300 transition hover:text-cyan-100">
              SIP & goal calculator <ArrowRight size={15} />
            </Link>
          </div>
        </div>

        <header className="mb-8 max-w-4xl">
          <p className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[.19em] text-cyan-300">
            <ChartNoAxesCombined size={16} /> Investment allocation worksheet
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-white md:text-5xl">Build an allocation framework.</h1>
          <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-400 md:text-base">
            Explore how amount, time horizon and tolerance for volatility change an illustrative mix of asset classes. This is a transparent rule-based learning tool, not a personal investment recommendation.
          </p>
        </header>

        <div className="grid items-start gap-6 lg:grid-cols-[minmax(320px,.82fr)_minmax(0,1.18fr)]">
          <form onSubmit={buildPlan} className="border border-white/10 bg-[#111b29]">
            <div className="flex items-center gap-3 border-b border-white/10 px-5 py-4">
              <div className="grid size-9 place-items-center border border-cyan-300/20 bg-cyan-300/5 text-cyan-300">
                <Wallet size={17} />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-100">Planning assumptions</p>
                <p className="mt-0.5 text-xs text-slate-500">Set the inputs for your illustration</p>
              </div>
            </div>

            <div className="space-y-7 p-5">
              <section>
                <label htmlFor="investment-amount" className="mb-2 block text-xs font-semibold uppercase tracking-[.12em] text-slate-400">01 / Initial amount</label>
                <div className="flex items-center border border-white/15 bg-[#0b131e] px-3 focus-within:border-cyan-300/60">
                  <span className="text-lg text-slate-500">₹</span>
                  <input
                    id="investment-amount"
                    type="number"
                    inputMode="numeric"
                    min="500"
                    max="100000000"
                    step="500"
                    value={amount}
                    onChange={(event) => updateInput(() => setAmount(event.target.value))}
                    className="min-w-0 w-full bg-transparent px-3 py-3.5 text-xl font-semibold tabular-nums text-white outline-none"
                    aria-describedby="amount-hint"
                  />
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {[5000, 10000, 20000, 50000, 100000].map((value) => (
                    <button
                      type="button"
                      key={value}
                      onClick={() => updateInput(() => setAmount(String(value)))}
                      className={"border px-2.5 py-1.5 text-[11px] tabular-nums transition " + (Number(amount) === value ? "border-cyan-300/50 bg-cyan-300/10 text-cyan-100" : "border-white/10 text-slate-400 hover:border-white/25 hover:text-white")}
                    >
                      {money(value)}
                    </button>
                  ))}
                </div>
                <p id="amount-hint" className="mt-2 text-[11px] text-slate-600">Enter ₹500–₹10 crore. Amounts are rounded to whole rupees in the illustration.</p>
                {!validAmount && <p className="mt-2 text-xs text-rose-300">Enter a valid amount within the stated range.</p>}
              </section>

              <section>
                <p className="mb-3 text-xs font-semibold uppercase tracking-[.12em] text-slate-400">02 / Primary objective</p>
                <div className="divide-y divide-white/10 border-y border-white/10">
                  {([
                    ["preserve", "Capital stability", "Prioritise lower volatility; returns are not guaranteed."],
                    ["grow", "Long-term growth", "Accept market fluctuations in pursuit of growth."],
                    ["learn", "Understand the trade-offs", "Explore how different risk settings change the mix."],
                  ] as const).map(([value, title, description]) => (
                    <label key={value} className="flex cursor-pointer items-start gap-3 py-3">
                      <input
                        type="radio"
                        name="objective"
                        value={value}
                        checked={goal === value}
                        onChange={() => updateInput(() => setGoal(value))}
                        className="mt-1 accent-cyan-300"
                      />
                      <span>
                        <span className="block text-sm font-medium text-slate-200">{title}</span>
                        <span className="mt-1 block text-xs leading-5 text-slate-500">{description}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </section>

              <section>
                <label htmlFor="horizon" className="mb-3 block text-xs font-semibold uppercase tracking-[.12em] text-slate-400">03 / When might you need this money?</label>
                <select
                  id="horizon"
                  value={horizon}
                  onChange={(event) => updateInput(() => setHorizon(event.target.value as Horizon))}
                  className="w-full border border-white/15 bg-[#0b131e] px-3 py-3 text-sm text-slate-100 outline-none focus:border-cyan-300/60"
                >
                  {Object.entries(horizonLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
                <p className="mt-2 text-[11px] leading-5 text-slate-600">A short time horizon takes priority over the selected risk setting in this worksheet.</p>
              </section>

              <section>
                <p className="mb-3 text-xs font-semibold uppercase tracking-[.12em] text-slate-400">04 / Tolerance for volatility</p>
                <div className="grid grid-cols-3 border border-white/10">
                  {([
                    ["conservative", "Lower"],
                    ["balanced", "Medium"],
                    ["growth", "Higher"],
                  ] as const).map(([value, label]) => (
                    <button
                      type="button"
                      key={value}
                      aria-pressed={risk === value}
                      onClick={() => updateInput(() => setRisk(value))}
                      className={"border-r border-white/10 py-3 text-xs font-semibold last:border-r-0 " + (risk === value ? "bg-cyan-300/10 text-cyan-100" : "text-slate-400 transition hover:bg-white/[.03] hover:text-white")}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </section>

              <section className="border-t border-white/10 pt-5">
                <p className="text-xs font-semibold uppercase tracking-[.12em] text-slate-400">05 / Emergency savings</p>
                <p className="mt-1 text-xs leading-5 text-slate-500">This worksheet does not reserve an emergency fund from the amount above.</p>
                <div className="mt-3 flex flex-wrap gap-4">
                  {([
                    ["yes", "Already set aside"],
                    ["not-yet", "Not yet"],
                    ["unsure", "Not sure"],
                  ] as const).map(([value, label]) => (
                    <label key={value} className="inline-flex items-center gap-2 text-xs text-slate-300">
                      <input
                        type="radio"
                        name="emergency"
                        value={value}
                        checked={emergencyReady === value}
                        onChange={() => updateInput(() => setEmergencyReady(value))}
                        className="accent-cyan-300"
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </section>

              <button
                type="submit"
                disabled={!validAmount}
                className="flex w-full items-center justify-center gap-2 bg-cyan-300 px-4 py-3.5 text-sm font-semibold text-[#07131a] transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Generate illustration <ArrowRight size={16} />
              </button>
            </div>
          </form>

          <section className="min-w-0 border border-white/10 bg-[#111b29]">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="grid size-9 place-items-center border border-violet-300/20 bg-violet-300/5 text-violet-300">
                  <ChartNoAxesCombined size={17} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-100">Allocation illustration</p>
                  <p className="mt-0.5 text-xs text-slate-500">Rule-based example · No live market data</p>
                </div>
              </div>
              <span className={"border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[.1em] " + (built ? "border-emerald-300/20 bg-emerald-300/5 text-emerald-200" : "border-white/10 text-slate-500")}>
                {built ? "Generated" : "Preview"}
              </span>
            </div>

            {!built ? (
              <div className="flex min-h-[570px] flex-col justify-between p-6 md:p-8">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[.16em] text-violet-300">Before you begin</p>
                  <h2 className="mt-3 max-w-lg text-2xl font-semibold leading-tight text-white">An allocation is a set of trade-offs, not a prediction.</h2>
                  <p className="mt-3 max-w-xl text-sm leading-6 text-slate-400">
                    Choose an amount, objective and time horizon. The worksheet will show how a fixed set of rules changes the illustrative weights across asset classes.
                  </p>
                </div>
                <div className="mt-10 grid gap-0 border-y border-white/10 sm:grid-cols-2">
                  <div className="border-b border-white/10 py-5 sm:border-r sm:pr-5">
                    <ShieldCheck size={19} className="mb-3 text-emerald-300" />
                    <p className="text-sm font-semibold text-slate-200">Risk is visible</p>
                    <p className="mt-1 text-xs leading-5 text-slate-500">Each asset class includes its principal risks and liquidity considerations.</p>
                  </div>
                  <div className="py-5 sm:pl-5">
                    <Clock3 size={19} className="mb-3 text-amber-300" />
                    <p className="text-sm font-semibold text-slate-200">Horizon comes first</p>
                    <p className="mt-1 text-xs leading-5 text-slate-500">A horizon below three years switches to a stability-led example without equity exposure.</p>
                  </div>
                </div>
                <div className="mt-6 flex items-start gap-3 border border-white/10 bg-[#0b131e] p-4 text-xs leading-5 text-slate-500">
                  <Info size={16} className="mt-0.5 shrink-0 text-cyan-300" />
                  The model uses fixed example percentages. It does not evaluate income, liabilities, taxes, existing assets, product costs or current market conditions.
                </div>
              </div>
            ) : (
              <div className="p-5 md:p-7">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[.15em] text-cyan-300">Illustrative portfolio</p>
                    <h2 className="mt-2 text-3xl font-semibold tracking-tight tabular-nums text-white">{money(numericAmount)}</h2>
                    <p className="mt-2 text-sm text-slate-400">{profileTitle} <span className="px-1 text-slate-600">/</span> {horizonLabels[horizon]}</p>
                  </div>
                  <button type="button" onClick={() => setBuilt(false)} className="inline-flex items-center gap-2 border border-white/15 px-3 py-2 text-xs text-slate-300 transition hover:border-white/30 hover:text-white">
                    <RotateCcw size={13} /> Edit inputs
                  </button>
                </div>

                <div className="mt-6 grid grid-cols-2 divide-x divide-white/10 border-y border-white/10 py-4">
                  <div className="pr-4">
                    <p className="text-[10px] font-semibold uppercase tracking-[.12em] text-slate-500">Objective</p>
                    <p className="mt-1 text-sm font-medium text-slate-200">{goal === "preserve" ? "Capital stability" : goal === "grow" ? "Long-term growth" : "Learning / exploration"}</p>
                  </div>
                  <div className="pl-4">
                    <p className="text-[10px] font-semibold uppercase tracking-[.12em] text-slate-500">Risk setting</p>
                    <p className="mt-1 text-sm font-medium text-slate-200">{selectedRiskLabel}</p>
                  </div>
                </div>

                <p className="mt-5 text-sm leading-6 text-slate-400">{profile.summary}</p>

                <div className="mt-6">
                  <div className="mb-2 flex items-center justify-between text-[10px] font-semibold uppercase tracking-[.12em] text-slate-500">
                    <span>Asset mix</span><span>100% allocated</span>
                  </div>
                  <div className="flex h-3 w-full overflow-hidden bg-white/5" aria-label="Illustrative asset allocation">
                    {allocations.map((item) => (
                      <div key={item.name} title={item.name + ": " + item.percent + "%"} className={item.color} style={{ width: item.percent + "%" }} />
                    ))}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
                    {allocations.map((item) => (
                      <span key={item.name} className="inline-flex items-center gap-2 text-[11px] text-slate-400">
                        <span className={"size-2 " + item.color} />{item.name} {item.percent}%
                      </span>
                    ))}
                  </div>
                </div>

                <div className="mt-7 border-t border-white/10">
                  {allocations.map((item, index) => (
                    <article key={item.name} className="grid gap-3 border-b border-white/10 py-4 sm:grid-cols-[minmax(0,1fr)_auto]">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] tabular-nums text-slate-600">0{index + 1}</span>
                          <h3 className="text-sm font-semibold text-slate-100">{item.name}</h3>
                        </div>
                        <p className="mt-1 pl-6 text-[11px] text-slate-500">{item.category}</p>
                        <p className="mt-2 pl-6 text-xs leading-5 text-slate-400">{item.role}</p>
                        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 pl-6 text-[10px] leading-5 text-slate-500">
                          <span>Risk: {item.risk}</span>
                          <span>Liquidity: {item.liquidity}</span>
                        </div>
                      </div>
                      <div className="flex items-baseline justify-between gap-4 sm:block sm:text-right">
                        <p className="text-base font-semibold tabular-nums text-white">{money(item.amount)}</p>
                        <p className="mt-1 text-xs tabular-nums text-cyan-300">{item.percent}%</p>
                      </div>
                    </article>
                  ))}
                </div>

                <div className="mt-6 space-y-3">
                  {stabilityLed && (
                    <div className="flex items-start gap-3 border border-amber-300/20 bg-amber-300/[.04] p-3 text-xs leading-5 text-amber-100">
                      <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                      {shortHorizon
                        ? "A short horizon takes priority over your selected risk setting. This example excludes equity and gold, but fixed deposits and debt funds still carry risks and may not match every spending need."
                        : "You selected capital stability, so this example excludes equity and gold. It is not a capital guarantee; bank deposits and debt funds have different risks and withdrawal conditions."}
                    </div>
                  )}
                  {emergencyReady !== "yes" && (
                    <div className="flex items-start gap-3 border border-amber-300/20 bg-amber-300/[.04] p-3 text-xs leading-5 text-amber-100">
                      <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                      You have not confirmed that emergency savings are set aside. This illustration allocates the full amount entered; it does not create an emergency reserve.
                    </div>
                  )}
                </div>

                <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-5">
                  <p className="text-[11px] leading-5 text-slate-500">Rule set: objective + horizon + self-selected volatility. No product selection or return forecast.</p>
                  <button type="button" onClick={resetPlanner} className="inline-flex items-center gap-2 text-xs text-slate-400 transition hover:text-white">
                    <RotateCcw size={13} /> Reset worksheet
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>

        <footer className="mt-7 flex items-start gap-3 border-t border-white/10 pt-5 text-xs leading-6 text-slate-500">
          <AlertTriangle size={17} className="mt-1 shrink-0 text-amber-300" />
          <p>
            <strong className="text-slate-300">Educational use only.</strong> The percentages are fixed examples, not personalised advice or a recommendation to buy a product. The worksheet does not consider income, debts, existing assets, tax position, investment costs or current product terms. Investments can lose value; mutual funds and ETFs are not bank deposits. Check official product documents and consult a qualified adviser before making decisions.
          </p>
        </footer>
      </div>
    </main>
  );
}
