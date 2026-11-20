"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, CreditCard, Landmark, LockKeyhole, Smartphone } from "lucide-react";
import {
  getDemoTotalRupees,
  type DemoCheckoutPlan,
} from "@/lib/pricing/plans";

type DemoMethod = "upi" | "card" | "bank";
const demoMethods: readonly {
  id: DemoMethod;
  label: string;
  description: string;
  icon: typeof Smartphone;
}[] = [
  { id: "upi", label: "UPI", description: "Visual demo only", icon: Smartphone },
  { id: "card", label: "Card", description: "No card details needed", icon: CreditCard },
  { id: "bank", label: "Net banking", description: "No bank sign-in needed", icon: Landmark },
];

const rupees = (amount: number) => new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
}).format(amount);

export default function DemoCheckoutExperience({ plan }: { plan: DemoCheckoutPlan }) {
  const [method, setMethod] = useState<DemoMethod>("upi");
  const [studentCount, setStudentCount] = useState("400");
  const [finished, setFinished] = useState(false);

  const seats = Number(studentCount);
  const validSeats = Number.isSafeInteger(seats) && seats >= 1 && seats <= 5000;
  const total = plan.id === "college"
    ? (validSeats ? getDemoTotalRupees("college", seats) : null)
    : getDemoTotalRupees(plan.id);
  const canComplete = total !== null;

  return (
    <main className="min-h-screen bg-[#080d18] px-4 py-8 text-slate-100 sm:px-8">
      <div className="mx-auto max-w-5xl space-y-7">
        <Link href="/pricing" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-emerald-300">
          <ArrowLeft size={16} aria-hidden="true" /> Back to pricing
        </Link>
        <header>
          <p className="text-xs font-bold uppercase tracking-[.22em] text-emerald-400">TILT / DEMO CHECKOUT</p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            {finished ? "Demonstration complete" : "Preview your checkout"}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
            Experience how a future TILT checkout might look without making a purchase.
          </p>
        </header>
        <div role="note" className="flex items-start gap-3 rounded-xl border border-amber-300/30 bg-amber-300/[.07] p-4 text-sm leading-6 text-amber-100">
          <LockKeyhole size={19} className="mt-0.5 shrink-0" aria-hidden="true" />
          <p>
            <strong>DEMO ONLY — ₹0 CHARGED.</strong> This page never contacts a payment service,
            requests card/UPI/bank details, records an order, or grants a subscription.
          </p>
        </div>

        {finished ? (
          <section role="status" className="rounded-2xl border border-emerald-300/25 bg-[#101a2b] p-7 sm:p-10">
            <CheckCircle2 size={48} className="text-emerald-300" aria-hidden="true" />
            <h2 className="mt-5 text-2xl font-bold">Mock checkout finished</h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300">
              You previewed the checkout for <strong>{plan.name}</strong> with an indicative
              amount of <strong>{rupees(total ?? 0)}</strong>. No real transaction occurred,
              and no paid benefits have been activated.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setFinished(false)}
                className="rounded-xl bg-emerald-300 px-5 py-3 text-sm font-bold text-slate-950 hover:bg-emerald-200"
              >
                Restart this demo
              </button>
              <Link href="/pricing" className="rounded-xl border border-white/20 px-5 py-3 text-sm font-bold text-slate-100 hover:bg-white/5">
                Explore other plans
              </Link>
            </div>
          </section>
        ) : (
          <div className="grid items-start gap-6 lg:grid-cols-[1.15fr_.85fr]">
            <section className="rounded-2xl border border-white/10 bg-[#101a2b] p-6 sm:p-7">
              <div className="mb-6 flex items-center justify-between gap-3">
                <h2 className="text-xl font-bold">Demo payment method</h2>
                <span className="rounded-full bg-emerald-300/10 px-3 py-1 text-xs font-semibold text-emerald-200">
                  Interactive preview
                </span>
              </div>
              <p className="mb-5 text-sm leading-6 text-slate-400">
                Choose a method to see the proposed layout. All choices lead to the same
                simulation, with no real payment or personal data entry.
              </p>
              <div className="space-y-3" role="group" aria-label="Demo payment method">
                {demoMethods.map((option) => {
                  const Icon = option.icon;
                  const selected = method === option.id;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => setMethod(option.id)}
                      className={`flex w-full items-center gap-4 rounded-xl border p-4 text-left transition ${
                        selected ? "border-emerald-300/60 bg-emerald-300/10" : "border-white/10 bg-[#0b1423] hover:border-white/25"
                      }`}
                    >
                      <Icon size={22} className={selected ? "text-emerald-300" : "text-slate-400"} aria-hidden="true" />
                      <span className="flex-1">
                        <strong className="block text-sm">{option.label}</strong>
                        <span className="mt-1 block text-xs text-slate-400">{option.description}</span>
                      </span>
                      <span className={`h-4 w-4 rounded-full border ${
                        selected ? "border-4 border-emerald-300" : "border-slate-500"
                      }`} aria-hidden="true" />
                    </button>
                  );
                })}
              </div>
              <div className="mt-6 rounded-xl border border-white/10 bg-[#0a1321] p-4 text-xs leading-6 text-slate-400">
                In a real checkout, a licensed payment provider would securely handle
                authorisation and payment verification. This prototype does neither.
              </div>
            </section>

            <aside className="rounded-2xl border border-white/10 bg-[#101a2b] p-6 sm:p-7">
              <h2 className="text-xl font-bold">Order preview</h2>
              <p className="mt-2 text-sm text-slate-400">{plan.description}</p>
              <div className="mt-6 border-t border-white/10 pt-5">
                <p className="text-sm font-semibold text-white">{plan.name}</p>
                <p className="mt-2 text-xs text-slate-400">{plan.interval}</p>
                {plan.id === "college" && (
                  <div className="mt-5">
                    <label htmlFor="student-count" className="block text-sm font-semibold">
                      Number of students
                    </label>
                    <input
                      id="student-count"
                      type="number"
                      min={1}
                      max={5000}
                      step={1}
                      inputMode="numeric"
                      value={studentCount}
                      onChange={(event) => setStudentCount(event.target.value)}
                      aria-invalid={!validSeats}
                      aria-describedby="student-count-help"
                      className="mt-2 w-full rounded-lg border border-white/20 bg-[#080d18] px-3 py-3 text-sm"
                    />
                    <p id="student-count-help" className="mt-2 text-xs leading-5 text-slate-400">
                      1 to 5,000 students. ₹150 per student per year. For demo estimates only.
                    </p>
                    {!validSeats && (
                      <p role="alert" className="mt-2 text-xs text-red-300">
                        Enter a whole number between 1 and 5,000.
                      </p>
                    )}
                  </div>
                )}
              </div>
              <div className="mt-6 flex items-center justify-between border-y border-white/10 py-5">
                <span className="text-sm text-slate-300">Indicative amount</span>
                <strong className="text-2xl">{total === null ? "—" : rupees(total)}</strong>
              </div>
              <div className="mt-3 flex justify-between text-xs text-slate-400">
                <span>Amount charged</span>
                <strong className="text-emerald-300">₹0</strong>
              </div>
              <button
                type="button"
                disabled={!canComplete}
                onClick={() => setFinished(true)}
                className="mt-7 w-full rounded-xl bg-emerald-300 px-4 py-3.5 text-sm font-bold text-slate-950 transition hover:bg-emerald-200 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Simulate checkout — no charge
              </button>
              <p className="mt-4 text-center text-xs leading-5 text-slate-500">
                No payment will be taken, and your account remains on its existing access level.
              </p>
            </aside>
          </div>
        )}
      </div>
    </main>
  );
}
