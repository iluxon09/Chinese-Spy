"use client";

import Link from "next/link";
import {
  Brain,
  TrendingUp,
  AlertTriangle,
  ShieldCheck,
  BookOpen,
  ArrowRight,
} from "lucide-react";

const insights = [
  {
    title: "Overtrading",
    status: "Needs attention",
    description:
      "Frequent trading can increase transaction costs and lead to impulsive decisions.",
    evidence: "Demo indicator: trade frequency",
    recommendation: "Focus on fewer, better-researched trades.",
    icon: TrendingUp,
    color: "text-amber-400",
  },
  {
    title: "Portfolio Concentration",
    status: "Monitor",
    description:
      "Holding too much of your portfolio in one asset can increase overall risk.",
    evidence: "Demo indicator: asset allocation",
    recommendation: "Explore diversification across sectors.",
    icon: AlertTriangle,
    color: "text-orange-400",
  },
  {
    title: "Risk Management",
    status: "Good practice",
    description:
      "A clear risk limit can help you make more consistent investment decisions.",
    evidence: "Demo indicator: risk planning",
    recommendation: "Define your risk before entering a trade.",
    icon: ShieldCheck,
    color: "text-emerald-400",
  },
];

export default function BehaviourDashboard() {
  return (
    <main className="min-h-screen bg-[#080d18] px-4 py-8 text-white sm:px-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <div>
          <p className="text-sm text-cyan-400">MARKET MIRROR</p>
          <h1 className="mt-2 text-3xl font-bold">Behaviour Analysis</h1>
          <p className="mt-2 text-sm text-slate-400">
            Understand your trading habits and learn to make more informed decisions.
          </p>
        </div>

        <section className="rounded-2xl border border-cyan-400/20 bg-gradient-to-r from-cyan-500/10 to-blue-500/5 p-6">
          <div className="flex items-start gap-4">
            <div className="rounded-xl bg-cyan-400/10 p-3">
              <Brain className="h-7 w-7 text-cyan-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">Your Behaviour Snapshot</h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
                This prototype demonstrates how TILT can identify trading
                patterns, explain potential risks, and recommend relevant
                learning resources. Actual insights will use your trading data
                after backend integration.
              </p>
            </div>
          </div>
        </section>

        <div className="grid gap-5 lg:grid-cols-3">
          {insights.map((item) => {
            const Icon = item.icon;

            return (
              <section
                key={item.title}
                className="rounded-2xl border border-white/10 bg-[#111a2b] p-6"
              >
                <div className="flex items-center justify-between">
                  <Icon className={`h-6 w-6 ${item.color}`} />
                  <span className={`text-xs font-medium ${item.color}`}>
                    {item.status}
                  </span>
                </div>

                <h3 className="mt-5 text-lg font-semibold">{item.title}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-400">
                  {item.description}
                </p>

                <div className="mt-5 rounded-xl bg-white/5 p-4">
                  <p className="text-xs text-slate-500">EVIDENCE</p>
                  <p className="mt-1 text-sm text-slate-300">{item.evidence}</p>
                </div>

                <div className="mt-4">
                  <p className="text-xs text-cyan-400">RECOMMENDATION</p>
                  <p className="mt-1 text-sm text-slate-300">
                    {item.recommendation}
                  </p>
                </div>
              </section>
            );
          })}
        </div>

        <section className="rounded-2xl border border-white/10 bg-[#111a2b] p-6">
          <h2 className="text-xl font-semibold">Improve Your Strategy</h2>
          <p className="mt-2 text-sm text-slate-400">
            Turn your insights into practical learning.
          </p>

          <Link
            href="/academy"
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950 hover:bg-cyan-300"
          >
            Explore Finance Academy
            <ArrowRight className="h-4 w-4" />
          </Link>
        </section>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/portfolio"
            className="rounded-lg border border-white/10 px-4 py-2 text-sm text-slate-300 hover:bg-white/5"
          >
            View Portfolio
          </Link>
          <Link
            href="/trading"
            className="rounded-lg border border-white/10 px-4 py-2 text-sm text-slate-300 hover:bg-white/5"
          >
            Return to Trading
          </Link>
        </div>
      </div>
    </main>
  );
}