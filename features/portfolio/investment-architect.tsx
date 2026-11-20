"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Calculator, Target, TrendingUp } from "lucide-react";

export default function InvestmentArchitect() {
  const [monthly, setMonthly] = useState(5000);
  const [years, setYears] = useState(10);
  const [rate, setRate] = useState(12);
  const [goal, setGoal] = useState(1500000);

  const result = useMemo(() => {
    const months = years * 12;
    const monthlyRate = rate / 12 / 100;

    const invested = monthly * months;
    const futureValue =
      monthlyRate === 0
        ? invested
        : monthly *
          ((Math.pow(1 + monthlyRate, months) - 1) /
            monthlyRate) *
          (1 + monthlyRate);

    return {
      invested,
      futureValue,
      gains: futureValue - invested,
      progress: Math.min((futureValue / goal) * 100, 100),
      required: Math.ceil(
        goal /
          ((Math.pow(1 + monthlyRate, months) - 1) /
            (monthlyRate || 1)) /
          (1 + monthlyRate)
      ),
    };
  }, [monthly, years, rate, goal]);

  const money = (value: number) =>
    "₹" + Math.round(value).toLocaleString("en-IN");

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
          <div className="mb-3 flex items-center gap-2 text-blue-400">
            <Target size={20} />
            <span className="text-sm font-semibold uppercase tracking-wider">
              Investment Architect
            </span>
          </div>
          <h1 className="text-3xl font-bold md:text-4xl">
            Plan your financial future.
          </h1>
          <p className="mt-3 text-slate-400">
            Estimate your SIP growth and build a plan around your financial goals.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-2xl border border-white/10 bg-[#111a2b] p-6">
            <h2 className="mb-6 flex items-center gap-2 text-lg font-semibold">
              <Calculator size={19} className="text-blue-400" />
              SIP Calculator
            </h2>

            <div className="space-y-7">
              <SliderInput
                label="Monthly Investment"
                value={monthly}
                min={500}
                max={100000}
                step={500}
                display={money(monthly)}
                onChange={setMonthly}
              />

              <SliderInput
                label="Investment Period"
                value={years}
                min={1}
                max={40}
                step={1}
                display={`${years} years`}
                onChange={setYears}
              />

              <SliderInput
                label="Expected Annual Return"
                value={rate}
                min={1}
                max={20}
                step={0.5}
                display={`${rate}%`}
                onChange={setRate}
              />
            </div>

            <div className="mt-8 rounded-xl border border-blue-500/20 bg-blue-500/5 p-5">
              <p className="text-sm text-slate-400">
                Estimated Future Value
              </p>
              <p className="mt-2 text-3xl font-bold text-blue-400">
                {money(result.futureValue)}
              </p>
              <div className="mt-5 grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-slate-500">Invested Amount</p>
                  <p className="mt-1 font-semibold">
                    {money(result.invested)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Estimated Gains</p>
                  <p className="mt-1 font-semibold text-green-400">
                    {money(result.gains)}
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-white/10 bg-[#111a2b] p-6">
            <h2 className="mb-6 flex items-center gap-2 text-lg font-semibold">
              <Target size={19} className="text-purple-400" />
              Goal Planner
            </h2>

            <label className="mb-3 block text-sm text-slate-400">
              Your Financial Goal (₹)
            </label>

            <input
              type="number"
              min={1000}
              value={goal}
              onChange={(e) =>
                setGoal(Math.max(1000, Number(e.target.value) || 1000))
              }
              className="w-full rounded-lg border border-white/10 bg-[#0b1322] p-4 text-xl font-semibold outline-none focus:border-blue-500"
            />

            <div className="mt-8">
              <div className="mb-3 flex justify-between text-sm">
                <span className="text-slate-400">Projected goal progress</span>
                <span className="font-semibold text-blue-400">
                  {result.progress.toFixed(1)}%
                </span>
              </div>

              <div className="h-3 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-blue-500 transition-all"
                  style={{ width: `${result.progress}%` }}
                />
              </div>
            </div>

            <div className="mt-8 space-y-5">
              <div>
                <p className="text-sm text-slate-400">
                  Projected Value
                </p>
                <p className="mt-1 text-2xl font-bold">
                  {money(result.futureValue)}
                </p>
              </div>

              <div>
                <p className="text-sm text-slate-400">
                  Monthly SIP Needed for Goal
                </p>
                <p className="mt-1 text-2xl font-bold text-purple-400">
                  {money(result.required)}
                </p>
              </div>

              <div className="rounded-lg bg-white/5 p-4 text-sm leading-6 text-slate-400">
                {result.futureValue >= goal
                  ? "Your projected SIP value meets or exceeds your goal."
                  : `You are approximately ${money(goal - result.futureValue)} short of your goal at the current SIP assumptions.`}
              </div>
            </div>
          </section>
        </div>

        <div className="mt-6 flex items-start gap-3 rounded-xl border border-white/10 bg-[#111a2b] p-5">
          <TrendingUp className="mt-1 shrink-0 text-green-400" size={20} />
          <p className="text-sm leading-6 text-slate-400">
            These are illustrative estimates based on a fixed assumed return.
            Actual market returns vary and are not guaranteed. This calculator
            is a prototype and is not investment advice.
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
      <div className="mb-3 flex items-center justify-between">
        <label className="text-sm text-slate-400">{label}</label>
        <span className="font-semibold text-white">{display}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-blue-500"
      />
      <div className="mt-1 flex justify-between text-xs text-slate-600">
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </div>
  );
}