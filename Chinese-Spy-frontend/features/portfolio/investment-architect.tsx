"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Calculator, Target, TrendingUp, AlertCircle } from "lucide-react";
import { calculateSip, calculateGoalSip } from "@/lib/calculators";

function money(value: number) {
  return "₹" + Math.round(value).toLocaleString("en-IN");
}

export default function InvestmentArchitect() {
  // SIP calculator inputs (rate as percent for UI)
  const [monthly, setMonthly] = useState(5000);
  const [years, setYears] = useState(10);
  const [ratePercent, setRatePercent] = useState(12);

  // Goal calculator inputs
  const [goal, setGoal] = useState(1_500_000);
  const [goalYears, setGoalYears] = useState(10);
  const [goalRatePercent, setGoalRatePercent] = useState(12);
  const [existing, setExisting] = useState(0);

  const sipResult = useMemo(() => {
    try {
      return calculateSip({
        monthlyContribution: monthly,
        annualReturnRate: ratePercent / 100,
        years,
      });
    } catch {
      return null;
    }
  }, [monthly, years, ratePercent]);

  const goalResult = useMemo(() => {
    try {
      return calculateGoalSip({
        targetAmount: goal,
        years: goalYears,
        annualReturnRate: goalRatePercent / 100,
        existingCorpus: existing > 0 ? existing : undefined,
      });
    } catch {
      return null;
    }
  }, [goal, goalYears, goalRatePercent, existing]);

  return (
    <main className="min-h-screen bg-[#080d18] px-5 py-8 text-white md:px-10">
      <div className="mx-auto max-w-6xl">
        <Link
          href="/portfolio"
          className="mb-7 inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white"
        >
          <ArrowLeft size={16} /> Back to Portfolio
        </Link>

        <div className="mb-8">
          <div className="mb-3 flex items-center gap-2 text-cyan-400">
            <Target size={20} />
            <span className="text-sm font-semibold uppercase tracking-wider">
              Investment Architect
            </span>
          </div>
          <h1 className="text-3xl font-bold md:text-4xl">
            Plan your financial future.
          </h1>
          <p className="mt-3 text-slate-400">
            Estimate SIP growth and the monthly contribution needed for a goal.
            Educational only — not personalised advice.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* SIP Calculator */}
          <section className="rounded-2xl border border-white/10 bg-[#111a2b] p-6">
            <h2 className="mb-6 flex items-center gap-2 text-lg font-semibold">
              <Calculator size={19} className="text-cyan-400" />
              SIP Calculator
            </h2>

            <div className="space-y-6">
              <NumberField
                label="Monthly contribution (₹)"
                value={monthly}
                min={500}
                max={200000}
                step={500}
                onChange={setMonthly}
              />
              <NumberField
                label="Time horizon (years)"
                value={years}
                min={1}
                max={40}
                step={1}
                onChange={setYears}
              />
              <NumberField
                label="Expected annual return (%)"
                value={ratePercent}
                min={0}
                max={30}
                step={0.5}
                onChange={setRatePercent}
              />
            </div>

            {sipResult && (
              <div className="mt-8 space-y-3 rounded-xl border border-cyan-400/20 bg-cyan-400/5 p-5">
                <ResultRow label="Total invested" value={money(sipResult.totalInvested)} />
                <ResultRow label="Estimated value" value={money(sipResult.estimatedValue)} highlight />
                <ResultRow label="Estimated gain" value={money(sipResult.estimatedGain)} />
              </div>
            )}
          </section>

          {/* Goal Calculator */}
          <section className="rounded-2xl border border-white/10 bg-[#111a2b] p-6">
            <h2 className="mb-6 flex items-center gap-2 text-lg font-semibold">
              <TrendingUp size={19} className="text-cyan-400" />
              Goal Planner
            </h2>

            <div className="space-y-6">
              <NumberField
                label="Target amount (₹)"
                value={goal}
                min={10000}
                max={50_000_000}
                step={10000}
                onChange={setGoal}
              />
              <NumberField
                label="Time horizon (years)"
                value={goalYears}
                min={1}
                max={40}
                step={1}
                onChange={setGoalYears}
              />
              <NumberField
                label="Expected annual return (%)"
                value={goalRatePercent}
                min={0}
                max={30}
                step={0.5}
                onChange={setGoalRatePercent}
              />
              <NumberField
                label="Existing corpus (₹, optional)"
                value={existing}
                min={0}
                max={50_000_000}
                step={10000}
                onChange={setExisting}
              />
            </div>

            {goalResult && (
              <div className="mt-8 space-y-3 rounded-xl border border-cyan-400/20 bg-cyan-400/5 p-5">
                <ResultRow
                  label="Required monthly SIP"
                  value={money(goalResult.requiredMonthlySip)}
                  highlight
                />
                <ResultRow label="Total SIP contributions" value={money(goalResult.totalSipInvested)} />
                {existing > 0 && (
                  <ResultRow
                    label="Projected existing corpus"
                    value={money(goalResult.projectedExistingCorpus)}
                  />
                )}
              </div>
            )}
          </section>
        </div>

        <div className="mt-6 flex gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-amber-200/90">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
          <div>
            <p className="font-medium text-amber-300">Educational illustration only</p>
            <p className="mt-1 text-amber-200/70">
              Assumes constant returns, ignores taxes and fees, and does not guarantee outcomes.
              Not personalised investment advice.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}

function NumberField({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (n: number) => void;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-sm">
        <label className="text-slate-300">{label}</label>
        <span className="font-medium text-white">
          {label.includes("%") ? value : value.toLocaleString("en-IN")}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-cyan-400"
      />
      <input
        type="number"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => {
          const n = Number(e.target.value);
          if (Number.isFinite(n)) onChange(Math.min(max, Math.max(min, n)));
        }}
        className="mt-2 w-full rounded-lg border border-white/10 bg-[#0b1322] px-3 py-2 text-sm text-white outline-none focus:border-cyan-400/50"
      />
    </div>
  );
}

function ResultRow({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-slate-400">{label}</span>
      <span className={highlight ? "text-lg font-semibold text-cyan-300" : "font-medium text-white"}>
        {value}
      </span>
    </div>
  );
}
