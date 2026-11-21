import Link from "next/link";
import {
  ArrowRight,
  Check,
  GraduationCap,
  LockKeyhole,
  Landmark,
  WalletCards,
} from "lucide-react";
import { PRICING_PLANS } from "@/lib/pricing/plans";

export const metadata = {
  title: "Pricing & Business Model | TILT",
  description: "TILT's proposed pilot-first institutional revenue model. No prices or payments are live.",
};

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-[#080d18] px-4 py-9 text-slate-100 sm:px-8">
      <div className="mx-auto max-w-7xl space-y-9">
        <header className="space-y-5">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/25 bg-emerald-400/10 px-3 py-1.5 text-xs font-semibold text-emerald-200">
            <Landmark size={14} aria-hidden="true" /> REVENUE MODEL PREVIEW
          </div>
          <div className="max-w-3xl">
            <p className="text-xs font-bold uppercase tracking-[.24em] text-emerald-400">TILT / BUSINESS MODEL</p>
            <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">
              Free to learn. Built to scale with institutions.
            </h1>
            <p className="mt-4 text-base leading-7 text-slate-400">
              TILT starts with a free student experience, converts through facilitated
              class and club pilots, and scales through annual institutional site licences.
            </p>
          </div>
          <div
            role="note"
            className="flex items-start gap-3 rounded-xl border border-amber-300/25 bg-amber-300/[.06] p-4 text-sm leading-6 text-amber-100"
          >
            <LockKeyhole size={19} className="mt-0.5 shrink-0" aria-hidden="true" />
            <p>
              <strong>Model preview only.</strong> The team plan does not set Indian price
              points or establish willingness to pay. Pricing is to be validated through
              pilots. No paid plan, checkout, subscription or entitlement is active here;
              every checkout path is a no-charge UI simulation.
            </p>
          </div>
        </header>

        <section aria-label="TILT revenue model" className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {PRICING_PLANS.map((plan) => (
            <article
              key={plan.id}
              className={`flex h-full flex-col rounded-2xl border p-6 shadow-lg shadow-black/10 ${
                plan.highlightLabel
                  ? "border-emerald-400/50 bg-[#111a2b]"
                  : "border-white/10 bg-[#111a2b]"
              }`}
            >
              <div className="mb-5 flex items-center justify-between gap-3">
                <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                  {plan.audience}
                </span>
                {plan.highlightLabel ? (
                  <span className="rounded-full bg-emerald-300 px-3 py-1 text-[11px] font-bold text-slate-950">
                    {plan.highlightLabel}
                  </span>
                ) : null}
              </div>
              <h2 className="text-xl font-bold">{plan.name}</h2>
              <div className="mt-4 flex flex-wrap items-baseline gap-2">
                <strong className="text-2xl tracking-tight text-white">{plan.priceLabel}</strong>
                <span className="text-xs text-slate-400">{plan.interval}</span>
              </div>
              <p className="mt-4 min-h-14 text-sm leading-6 text-slate-400">{plan.description}</p>
              <ul className="my-6 space-y-3 text-sm text-slate-200">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2">
                    <Check size={16} className="mt-0.5 shrink-0 text-emerald-300" aria-hidden="true" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-auto">
                {plan.demoPlanId ? (
                  <Link
                    href={`/pricing/demo-checkout?plan=${plan.demoPlanId}`}
                    className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-emerald-300 px-4 py-3 text-center text-sm font-bold text-slate-950 transition hover:bg-emerald-200"
                  >
                    Preview demo flow <ArrowRight size={16} aria-hidden="true" />
                  </Link>
                ) : (
                  <Link
                    href="/simulator"
                    className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-white/20 px-4 py-3 text-sm font-bold text-slate-100 hover:bg-white/5"
                  >
                    Explore the free simulator <ArrowRight size={16} aria-hidden="true" />
                  </Link>
                )}
              </div>
            </article>
          ))}
        </section>

        <section className="grid gap-4 rounded-2xl border border-white/10 bg-[#101a2b] p-6 md:grid-cols-2">
          <div className="flex items-start gap-3">
            <GraduationCap className="mt-1 shrink-0 text-emerald-300" aria-hidden="true" />
            <div>
              <h2 className="font-semibold">The first commercial loop</h2>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                Free student demo → facilitated class or club session → paid cohort pilot
                → annual institutional site licence. Business and finance programmes,
                CFA-prep groups and trading clubs are the initial buyer focus.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <WalletCards className="mt-1 shrink-0 text-emerald-300" aria-hidden="true" />
            <div>
              <h2 className="font-semibold">Later and supplementary revenue</h2>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                Broker and fintech licensing comes after classroom evidence. Trading-firm
                assessments are a later segment. Extra scenario packs and deeper reports
                may support the free learner funnel, but are not the primary revenue bet.
              </p>
            </div>
          </div>
        </section>

        <p className="pb-6 text-xs leading-5 text-slate-500">
          This is a proposed business model, not a live offer or a forecast. No prices are
          published because the team plan calls for pricing validation through pilots.
          TILT remains an educational simulator: no real-money trading, stock tips or
          guaranteed returns.
        </p>
      </div>
    </main>
  );
}
