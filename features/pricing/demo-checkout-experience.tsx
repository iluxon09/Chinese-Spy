"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  CreditCard,
  Landmark,
  LockKeyhole,
  Smartphone,
} from "lucide-react";
import {
  getValidatedCohortSize,
  type DemoCheckoutPlan,
} from "@/lib/pricing/plans";

type DemoMethod = "upi" | "card" | "bank";

const demoMethods: readonly {
  id: DemoMethod;
  label: string;
  description: string;
  icon: typeof Smartphone;
}[] = [
  { id: "upi", label: "UPI", description: "UI preview only", icon: Smartphone },
  { id: "card", label: "Card", description: "No card details requested", icon: CreditCard },
  { id: "bank", label: "Net banking", description: "No bank sign-in requested", icon: Landmark },
];

export default function DemoCheckoutExperience({ plan }: { plan: DemoCheckoutPlan }) {
  const [method, setMethod] = useState<DemoMethod>("upi");
  const [cohortSizeInput, setCohortSizeInput] = useState("");
  const [finished, setFinished] = useState(false);

  const cohortSize = getValidatedCohortSize(cohortSizeInput);
  const canComplete = !plan.requiresCohortSize || cohortSize !== null;

  return (
    <main className="min-h-screen bg-[#080d18] px-4 py-8 text-slate-100 sm:px-8">
      <div className="mx-auto max-w-5xl space-y-7">
        <Link href="/pricing" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-emerald-300">
          <ArrowLeft size={16} aria-hidden="true" /> Back to pricing
        </Link>
        <header>
          <p className="text-xs font-bold uppercase tracking-[.22em] text-emerald-400">
            TILT / DEMO CHECKOUT
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            {finished ? "Demo preview complete" : "Preview a future checkout"}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
            This is a UI walkthrough only. It does not submit a pilot enquiry, contact the TILT team,
            create a quote or commercial order, or change an account.
          </p>
        </header>

        <div
          role="note"
          className="flex items-start gap-3 rounded-xl border border-amber-300/30 bg-amber-300/[.07] p-4 text-sm leading-6 text-amber-100"
        >
          <LockKeyhole size={19} className="mt-0.5 shrink-0" aria-hidden="true" />
          <p>
            <strong>DEMO ONLY — ₹0 CHARGED.</strong> This page never contacts a payment
            service, requests card/UPI/bank details, records an order or grants paid access.
          </p>
        </div>

        {finished ? (
          <section
            role="status"
            className="rounded-2xl border border-emerald-300/25 bg-[#101a2b] p-7 sm:p-10"
          >
            <CheckCircle2 size={48} className="text-emerald-300" aria-hidden="true" />
            <h2 className="mt-5 text-2xl font-bold">Demo preview finished</h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300">
              You completed a UI-only preview for <strong>{plan.name}</strong>
              {cohortSize !== null ? (
                <> scoped to <strong>{cohortSize.toLocaleString("en-IN")} learners</strong></>
              ) : null}.
              No enquiry, quote or commercial order was created, no money was charged, and no
              paid benefit or account access changed.
            </p>
            <div className="mt-3 text-sm font-semibold text-emerald-300">Amount charged: ₹0</div>
            <div className="mt-7 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setFinished(false)}
                className="rounded-xl bg-emerald-300 px-5 py-3 text-sm font-bold text-slate-950 hover:bg-emerald-200"
              >
                Restart this demo
              </button>
              <Link
                href="/pricing"
                className="rounded-xl border border-white/20 px-5 py-3 text-sm font-bold text-slate-100 hover:bg-white/5"
              >
                Explore business model
              </Link>
            </div>
          </section>
        ) : (
          <div className="grid items-start gap-6 lg:grid-cols-[1.15fr_.85fr]">
            <section className="rounded-2xl border border-white/10 bg-[#101a2b] p-6 sm:p-7">
              <div className="mb-6 flex items-center justify-between gap-3">
                <h2 className="text-xl font-bold">Demo payment method</h2>
                <span className="rounded-full bg-emerald-300/10 px-3 py-1 text-xs font-semibold text-emerald-200">
                  Interactive UI preview
                </span>
              </div>
              <p className="mb-5 text-sm leading-6 text-slate-400">
                Select a method to preview its selected state. This interaction is local
                to your browser; no payment provider or financial institution is contacted.
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
                        selected
                          ? "border-emerald-300/60 bg-emerald-300/10"
                          : "border-white/10 bg-[#0b1423] hover:border-white/25"
                      }`}
                    >
                      <Icon
                        size={22}
                        className={selected ? "text-emerald-300" : "text-slate-400"}
                        aria-hidden="true"
                      />
                      <span className="flex-1">
                        <strong className="block text-sm">{option.label}</strong>
                        <span className="mt-1 block text-xs text-slate-400">{option.description}</span>
                      </span>
                      <span
                        className={`h-4 w-4 rounded-full border ${
                          selected ? "border-4 border-emerald-300" : "border-slate-500"
                        }`}
                        aria-hidden="true"
                      />
                    </button>
                  );
                })}
              </div>
              <div className="mt-6 rounded-xl border border-white/10 bg-[#0a1321] p-4 text-xs leading-6 text-slate-400">
                In a real checkout, a payment provider would handle authorisation and
                verification. This prototype does neither and must not be used to enter
                real payment credentials.
              </div>
            </section>

            <aside className="rounded-2xl border border-white/10 bg-[#101a2b] p-6 sm:p-7">
              <h2 className="text-xl font-bold">Request preview</h2>
              <p className="mt-2 text-sm text-slate-400">{plan.description}</p>
              <div className="mt-6 border-t border-white/10 pt-5">
                <p className="text-sm font-semibold text-white">{plan.name}</p>
                <p className="mt-2 text-xs text-slate-400">{plan.interval}</p>
                <div className="mt-5 rounded-xl border border-white/10 bg-[#0a1321] p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Pricing status
                  </p>
                  <p className="mt-2 text-sm font-semibold text-white">{plan.pricingStatus}</p>
                  <p className="mt-2 text-xs leading-5 text-slate-400">{plan.pricingBasis}</p>
                </div>

                {plan.requiresCohortSize ? (
                  <div className="mt-5">
                    <label htmlFor="cohort-size" className="block text-sm font-semibold">
                      Approximate cohort size
                    </label>
                    <input
                      id="cohort-size"
                      type="number"
                      min={1}
                      max={5000}
                      step={1}
                      inputMode="numeric"
                      required
                      value={cohortSizeInput}
                      onChange={(event) => setCohortSizeInput(event.target.value)}
                      aria-invalid={cohortSize === null}
                      aria-describedby="cohort-size-help"
                      className="mt-2 w-full rounded-lg border border-white/20 bg-[#080d18] px-3 py-3 text-sm"
                    />
                    <p id="cohort-size-help" className="mt-2 text-xs leading-5 text-slate-400">
                      Enter 1 to 5,000 learners. This scopes the demo request only; it is
                      not multiplied by a per-student rate.
                    </p>
                    {cohortSize === null ? (
                      <p role="alert" className="mt-2 text-xs text-amber-200">
                        Enter a whole number between 1 and 5,000 to continue.
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </div>

              <div className="mt-6 flex items-center justify-between border-y border-white/10 py-5">
                <span className="text-sm text-slate-300">Amount charged</span>
                <strong className="text-2xl text-emerald-300">₹0</strong>
              </div>
              <button
                type="button"
                disabled={!canComplete}
                onClick={() => setFinished(true)}
                className="mt-7 w-full rounded-xl bg-emerald-300 px-4 py-3.5 text-sm font-bold text-slate-950 transition hover:bg-emerald-200 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Complete demo preview — no charge
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
