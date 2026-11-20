import Link from "next/link";
import DemoCheckoutExperience from "@/features/pricing/demo-checkout-experience";
import { getDemoCheckoutPlan } from "@/lib/pricing/plans";

export const metadata = {
  title: "Demo Checkout | TILT",
  description: "A simulated TILT payment flow. No real money or payment information is collected.",
};

type PageProps = {
  searchParams: Promise<{ plan?: string | string[] }>;
};

export default async function DemoCheckoutPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const selectedId = Array.isArray(params.plan) ? params.plan[0] : params.plan;
  const plan = getDemoCheckoutPlan(selectedId);

  if (!plan) {
    return (
      <main className="min-h-screen bg-[#080d18] p-6 text-slate-100 sm:p-10">
        <div className="mx-auto max-w-xl rounded-2xl border border-white/10 bg-[#101a2b] p-8">
          <h1 className="text-2xl font-bold">Choose a demo plan</h1>
          <p className="mt-3 text-sm leading-6 text-slate-400">
            This checkout preview needs a valid plan. No payment has been initiated.
          </p>
          <Link href="/pricing" className="mt-6 inline-flex rounded-lg bg-emerald-300 px-5 py-3 text-sm font-bold text-slate-950">
            Back to pricing
          </Link>
        </div>
      </main>
    );
  }

  return <DemoCheckoutExperience plan={plan} />;
}
