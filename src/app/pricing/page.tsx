import Link from "next/link";
import { ArrowRight, Check, GraduationCap, LockKeyhole, Sparkles, WalletCards } from "lucide-react";
import { PRICING_PLANS } from "@/lib/pricing/plans";

export const metadata = {
  title: "Pricing & Plans | TILT",
  description: "Explore TILT's proposed free and paid educational plans. Demo checkout only.",
};

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-[#080d18] px-4 py-9 text-slate-100 sm:px-8">
      <div className="mx-auto max-w-7xl space-y-9">
        <header className="space-y-5">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/25 bg-emerald-400/10 px-3 py-1.5 text-xs font-semibold text-emerald-200">
            <Sparkles size={14} aria-hidden="true" /> REVENUE MODEL PREVIEW
          </div>
          <div className="max-w-3xl">
            <p className="text-xs font-bold uppercase tracking-[.24em] text-emerald-400">TILT / PRICING</p>
            <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">Learn for free. Grow with TILT.</h1>
            <p className="mt-4 text-base leading-7 text-slate-400">
              A look at how TILT could support its educational mission through optional premium
              plans and institution-funded access.
            </p>
          </div>
          <div role="note" className="flex items-start gap-3 rounded-xl border border-amber-300/25 bg-amber-300/[.06] p-4 text-sm leading-6 text-amber-100">
            <LockKeyhole size={19} className="mt-0.5 shrink-0" aria-hidden="true" />
            <p>
              <strong>Demo only.</strong> These prices come from our proposed revenue model.
              Payments, subscriptions, paid entitlements and statement-report delivery are not active.
              All checkout screens are simulations; no money will be collected.
            </p>
          </div>
        </header>

        <section aria-label="Proposed plans" className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {PRICING_PLANS.map((plan) => (
            <article
              key={plan.id}
              className={`flex h-full flex-col rounded-2xl border p-6 shadow-lg shadow-black/10 ${
                plan.featured
                  ? "border-emerald-400/50 bg-gradient-to-b from-emerald-400/[.11] to-[#111a2b]"
                  : "border-white/10 bg-[#111a2b]"
              }`}
            >
              <div className="mb-5 flex items-center justify-between gap-3">
                <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">{plan.audience}</span>
                {plan.featured ? (
                  <span className="rounded-full bg-emerald-300 px-3 py-1 text-[11px] font-bold text-slate-950">PROPOSED POPULAR PLAN</span>
                ) : null}
              </div>
              <h2 className="text-xl font-bold">{plan.name}</h2>
              <div className="mt-4 flex flex-wrap items-baseline gap-2">
                <strong className="text-3xl tracking-tight text-white">{plan.price}</strong>
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
                    Preview demo checkout <ArrowRight size={16} aria-hidden="true" />
                  </Link>
                ) : plan.id === "free" ? (
                  <Link
                    href="/simulator"
                    className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-white/20 px-4 py-3 text-sm font-bold text-slate-100 hover:bg-white/5"
                  >
                    Explore the free simulator <ArrowRight size={16} aria-hidden="true" />
                  </Link>
                ) : (
                  <p className="rounded-xl border border-white/10 p-3 text-center text-xs leading-5 text-slate-400">
                    Institutional partnerships are a future offering; no checkout is available.
                  </p>
                )}
              </div>
            </article>
          ))}
        </section>

        <section className="grid gap-4 rounded-2xl border border-white/10 bg-[#101a2b] p-6 md:grid-cols-2">
          <div className="flex items-start gap-3">
            <GraduationCap className="mt-1 shrink-0 text-emerald-300" aria-hidden="true" />
            <div>
              <h2 className="font-semibold">Free for learners, supported by institutions</h2>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                Our business-model proposal uses college licences and fixed-fee institutional
                partnerships to help fund financial education.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <WalletCards className="mt-1 shrink-0 text-emerald-300" aria-hidden="true" />
            <div>
              <h2 className="font-semibold">No real payment or investment activity</h2>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                TILT is a virtual investment-learning platform. The demo checkout is for
                showing a possible product journey, not receiving payment or activating benefits.
              </p>
            </div>
          </div>
        </section>
        <p className="pb-6 text-xs leading-5 text-slate-500">
          Prices and benefits are assumptions for a hackathon prototype, not live offers.
          Financial education only: no stock tips, execution of real trades or guaranteed returns.
        </p>
      </div>
    </main>
  );
}
