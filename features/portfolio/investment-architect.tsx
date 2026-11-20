"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Calculator, Target, TrendingUp } from "lucide-react";
import {
  calculateGoalSip,
  calculateSip,
} from "@/lib/member4/calculators/index";

const money = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value);

export default function InvestmentArchitect() {
  const [monthly, setMonthly] = useState(5000);
  const [years, setYears] = useState(10);
  const [rate, setRate] = useState(12);
  const [goal, setGoal] = useState(1_500_000);
  const [existingCorpus, setExistingCorpus] = useState(0);

  const result = useMemo(() => {
    const annualReturnRate = rate / 100;
    return {
      sip: calculateSip({
        monthlyContribution: monthly,
        annualReturnRate,
        years,
      }),
      goal: calculateGoalSip({
        targetAmount: goal,
        years,
        annualReturnRate,
        existingCorpus,
      }),
    };
  }, [monthly, years, rate, goal, existingCorpus]);

  const progress = Math.min((result.sip.estimatedValue / goal) * 100, 100);

  return (
    <main className="min-h-screen bg-[#080d18] px-5 py-8 text-white md:px-10">
      <div className="mx-auto max-w-6xl">
        <Link href="/portfolio/architect" className="mb-7 inline-flex items-center gap-2 text-sm text-slate-400">
          <ArrowLeft size={16} /> Back to Allocation Planner
        </Link>

        <header className="mb-8">
          <div className="mb-3 flex items-center gap-2 text-blue-400">
            <Target size={20} />
            <span className="text-sm font-semibold uppercase tracking-wider">
              SIP & Goal Calculator
            </span>
          </div>
          <h1 className="text-3xl font-bold md:text-4xl">Estimate a monthly SIP for your goal.</h1>
          <p className="mt-3 text-slate-400">
            Explore how regular contributions, time and an assumed return interact. All projections are illustrative, not guaranteed.
          </p>
        </header>

        <div className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-2xl border border-white/10 bg-[#111a2b] p-6">
            <h2 className="mb-6 flex items-center gap-2 text-lg font-semibold">
              <Calculator size={19} className="text-blue-400" /> SIP calculator
            </h2>

            <div className="space-y-7">
              <SliderInput
                label="Monthly investment"
                value={monthly}
                min={500}
                max={100000}
                step={500}
                display={money(monthly)}
                onChange={setMonthly}
              />
              <SliderInput
                label="Investment period"
                value={years}
                min={1}
                max={40}
                step={1}
                display={`${years} years`}
                onChange={setYears}
              />
              <SliderInput
                label="Assumed annual return"
                value={rate}
                min={1}
                max={20}
                step={0.5}
                display={`${rate}%`}
                onChange={setRate}
              />
            </div>

            <div className="mt-8 rounded-xl border border-blue-500/20 bg-blue-500/5 p-5">
              <p className="text-sm text-slate-400">Estimated future value</p>
              <p className="mt-2 text-3xl font-bold text-blue-400">
                {money(result.sip.estimatedValue)}
              </p>
              <div className="mt-5 grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-slate-500">Total invested</p>
                  <p className="mt-1 font-semibold">{money(result.sip.totalInvested)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Estimated gain</p>
                  <p className="mt-1 font-semibold text-green-400">
                    {money(result.sip.estimatedGain)}
                  </p>
                </div>
              </div>
            </div>
            <p className="mt-4 text-xs leading-5 text-slate-500">
              {result.sip.assumptions.join(" · ")}
            </p>
          </section>

          <section className="rounded-2xl border border-white/10 bg-[#111a2b] p-6">
            <h2 className="mb-6 flex items-center gap-2 text-lg font-semibold">
              <Target size={19} className="text-purple-400" /> Goal planner
            </h2>

            <label htmlFor="goal-amount" className="mb-3 block text-sm text-slate-400">
              Target amount (₹)
            </label>
            <input
              id="goal-amount"
              type="number"
              min={1000}
              max={1_000_000_000}
              value={goal}
              onChange={(event) =>
                setGoal(Math.min(1_000_000_000, Math.max(1000, Number(event.target.value) || 1000)))
              }
              className="w-full rounded-lg border border-white/10 bg-[#0b1322] p-4 text-xl font-semibold"
            />

            <label htmlFor="existing-corpus" className="mb-3 mt-5 block text-sm text-slate-400">
              Existing corpus (optional)
            </label>
            <input
              id="existing-corpus"
              type="number"
              min={0}
              max={1_000_000_000}
              value={existingCorpus}
              onChange={(event) =>
                setExistingCorpus(Math.min(1_000_000_000, Math.max(0, Number(event.target.value) || 0)))
              }
              className="w-full rounded-lg border border-white/10 bg-[#0b1322] p-4 text-xl font-semibold"
            />

            <div className="mt-8">
              <div className="mb-3 flex justify-between text-sm">
                <span className="text-slate-400">Projected goal progress at current SIP</span>
                <span className="font-semibold text-blue-400">
                  {progress.toFixed(1)}%
                </span>
              </div>
              <div
                className="h-3 overflow-hidden rounded-full bg-white/10"
                role="progressbar"
                aria-valuenow={Number(progress.toFixed(1))}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Projected goal progress"
              >
                <div
                  className="h-full rounded-full bg-blue-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            <div className="mt-8 space-y-5">
              <div>
                <p className="text-sm text-slate-400">Monthly SIP required for target</p>
                <p className="mt-1 text-2xl font-bold text-purple-400">
                  {money(result.goal.requiredMonthlySip)}
                </p>
              </div>
              <div>
                <p className="text-sm text-slate-400">Projected existing corpus</p>
                <p className="mt-1 text-xl font-semibold">
                  {money(result.goal.projectedExistingCorpus)}
                </p>
              </div>
              <div className="rounded-lg bg-white/5 p-4 text-sm leading-6 text-slate-400">
                {result.goal.requiredMonthlySip === 0
                  ? "Under the selected constant-return assumption, the existing corpus is projected to meet or exceed the target."
                  : `At the selected assumed return, a monthly SIP of ${money(result.goal.requiredMonthlySip)} is projected to reach the target.`}
              </div>
            </div>
            <p className="mt-4 text-xs leading-5 text-slate-500">
              {result.goal.assumptions.join(" · ")}
            </p>
          </section>
        </div>

        <div className="mt-6 flex items-start gap-3 rounded-xl border border-white/10 bg-[#111a2b] p-5">
          <TrendingUp className="mt-1 shrink-0 text-green-400" size={20} />
          <p className="text-sm leading-6 text-slate-400">
            {result.sip.disclaimer} These calculations are illustrations, not a prediction or investment recommendation.
          </p>
        </div>
      </div>
    </main>
  );
}

function SliderInput({
  label,
  value,
  min,
  max,
  step,
  display,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  display: string;
  onChange: (value: number) => void;
}) {
  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-3">
        <label className="text-sm text-slate-400">{label}</label>
        <span className="font-semibold text-white">{display}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="w-full accent-blue-500"
        aria-label={label}
      />
      <div className="mt-1 flex justify-between text-xs text-slate-600">
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </div>
  );
}
