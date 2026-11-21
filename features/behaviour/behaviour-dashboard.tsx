"use client";

import { useMemo, type ReactNode } from "react";
import Link from "next/link";
import { Activity, AlertTriangle, ArrowRight, Brain, CheckCircle2, RefreshCw, ShieldAlert } from "lucide-react";
import { useTilt } from "@/features/shared/tilt-provider";
import { analyzePortfolioBehaviour } from "@/lib/behavioral-analysis";
import type { BehaviourReport } from "@/lib/behavioral-analysis/types";

const indicatorMeta: Record<string, { title: string; subtitle: string }> = {
  PANIC_SELLING: {
    title: "Post-decline exits",
    subtitle: "Sells executed after sharp short-term price drops",
  },
  FOMO: {
    title: "Rally-following buys",
    subtitle: "Repeated purchases after sharp short-term price rises",
  },
  OVERTRADING: {
    title: "Trading frequency",
    subtitle: "Trade frequency, clustered activity and transaction-cost drag",
  },
  CONCENTRATION: {
    title: "Portfolio concentration",
    subtitle: "Exposure concentrated in a single stock or sector",
  },
};

const statusClass: Record<BehaviourReport["status"], string> = {
  DETECTED: "border-amber-400/30 bg-amber-400/10 text-amber-200",
  NOT_DETECTED: "border-emerald-400/30 bg-emerald-400/10 text-emerald-200",
  INSUFFICIENT_DATA: "border-slate-400/20 bg-slate-400/10 text-slate-300",
};

const severityClass: Record<BehaviourReport["severity"], string> = {
  LOW: "text-slate-400",
  MODERATE: "text-amber-300",
  HIGH: "text-red-300",
};

function labelForStatus(status: BehaviourReport["status"]) {
  if (status === "DETECTED") return "Pattern detected";
  if (status === "NOT_DETECTED") return "Not detected";
  return "Insufficient data";
}

function formatEvidence(value: number | string) {
  if (typeof value === "number") return value.toLocaleString("en-IN", { maximumFractionDigits: 2 });
  return value;
}

export default function BehaviourDashboard() {
  const { portfolio, market, histories, loading, error, refresh } = useTilt();

  const reports = useMemo(() => {
    if (!portfolio || !market) return [];
    return analyzePortfolioBehaviour({
      transactions: portfolio.transactions,
      holdings: portfolio.snapshot.holdings,
      companies: market.companies,
      histories,
      currentMarketStep: market.marketStep,
    });
  }, [portfolio, market, histories]);

  const detectedCount = reports.filter((report) => report.status === "DETECTED").length;
  const insufficientCount = reports.filter((report) => report.status === "INSUFFICIENT_DATA").length;
  const completedTradeCount = portfolio?.transactions.length ?? 0;
  const openPositionCount = portfolio?.snapshot.holdings.filter((holding) => holding.quantity > 0).length ?? 0;
  const profileSummary = useMemo(() => {
    if (reports.length === 0) {
      return "Your profile will appear once the signed-in simulation data has loaded.";
    }

    const detected = reports.filter((report) => report.status === "DETECTED");
    if (detected.length > 0) {
      const names = detected.map((report) => indicatorMeta[report.indicator]?.title ?? report.indicator);
      return `Your current simulation shows ${detected.length} observable pattern signal(s): ${names.join(", ")}. Review the evidence and context for each signal before interpreting it.`;
    }

    if (reports.every((report) => report.status === "INSUFFICIENT_DATA")) {
      return "There is not enough transaction, price-history or holdings data to build a reliable picture yet. Complete more simulation activity and review the analysis again.";
    }

    if (reports.some((report) => report.status === "INSUFFICIENT_DATA")) {
      return "No assessed pattern crossed its selected threshold, but some areas still need more history. The available results are not a complete assessment of your activity.";
    }

    return "The patterns assessed in your current simulation remain below the selected thresholds. This describes only the available simulation history, not your overall financial behaviour.";
  }, [reports]);

  return (
    <main className="terminal-subpage min-h-screen bg-[#080d18] px-4 py-8 text-white sm:px-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm text-cyan-400">TILT · BEHAVIORAL ANALYSIS</p>
            <h1 className="mt-2 text-3xl font-bold">Behavioral Analysis</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
              A personal review of the trading patterns visible in your current TILT simulation.
              It examines completed trades, price movements around entries and exits, trading frequency, and open positions. These signals describe activity—not personality or intent.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void refresh()}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2.5 text-sm text-slate-200 hover:bg-white/5 disabled:cursor-wait disabled:opacity-50"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            Refresh analysis
          </button>
        </header>

        {error && (
          <div role="alert" className="rounded-xl border border-red-400/20 bg-red-400/5 p-4 text-sm text-red-200">
            {error}
          </div>
        )}

        <section className="grid gap-4 sm:grid-cols-3">
          <SummaryCard icon={<Brain size={19} />} label="Patterns detected" value={loading ? "—" : detectedCount} />
          <SummaryCard icon={<CheckCircle2 size={19} />} label="Indicators assessed" value={loading ? "—" : reports.filter((r) => r.status !== "INSUFFICIENT_DATA").length} />
          <SummaryCard icon={<Activity size={19} />} label="Need more data" value={loading ? "—" : insufficientCount} />
        </section>

        <section className="rounded-2xl border border-white/10 bg-[#111a2b] p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-4xl">
              <p className="text-xs font-semibold tracking-[0.18em] text-cyan-300">PERSONAL TRADING PROFILE</p>
              <h2 className="mt-2 text-xl font-semibold">Your observed patterns</h2>
              <p className="mt-2 text-sm leading-6 text-slate-300">{loading ? "Reviewing your simulation activity…" : profileSummary}</p>
            </div>
            <div className="grid min-w-[220px] grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl bg-white/[0.04] p-3">
                <p className="text-xs text-slate-500">Trades reviewed</p>
                <p className="mt-1 text-lg font-semibold">{loading ? "—" : completedTradeCount}</p>
              </div>
              <div className="rounded-xl bg-white/[0.04] p-3">
                <p className="text-xs text-slate-500">Open positions</p>
                <p className="mt-1 text-lg font-semibold">{loading ? "—" : openPositionCount}</p>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-cyan-400/20 bg-cyan-400/5 p-5">
          <div className="flex items-start gap-3">
            <ShieldAlert size={22} className="mt-0.5 shrink-0 text-cyan-300" />
            <div>
              <h2 className="font-semibold">How to read these signals</h2>
              <p className="mt-1 text-sm leading-6 text-slate-300">
                Each detector applies explicit thresholds to completed transactions, market-step price history
                or current invested holdings. A detected pattern can have a non-emotional explanation,
                such as a planned stop-loss or intentional short-term strategy. Insufficient data is not
                treated as a clean bill of health.
              </p>
            </div>
          </div>
        </section>

        {loading && reports.length === 0 ? (
          <section className="rounded-2xl border border-white/10 bg-[#111a2b] p-8 text-center">
            <RefreshCw className="mx-auto animate-spin text-cyan-300" size={24} />
            <p className="mt-3 text-sm text-slate-400">Loading your simulation data…</p>
          </section>
        ) : reports.length === 0 ? (
          <section className="rounded-2xl border border-white/10 bg-[#111a2b] p-8 text-center">
            <p className="font-semibold">Analysis is not available yet</p>
            <p className="mt-2 text-sm text-slate-400">
              Create or load a simulation, then refresh this page to analyse its trades and holdings.
            </p>
          </section>
        ) : (
          <section className="grid gap-5 lg:grid-cols-2">
            {reports.map((report) => {
              const meta = indicatorMeta[report.indicator];
              return (
                <article key={report.indicator} className="rounded-2xl border border-white/10 bg-[#111a2b] p-6">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold tracking-widest text-slate-500">PATTERN MEASURED</p>
                      <h2 className="mt-2 text-xl font-semibold">{meta?.title ?? report.indicator}</h2>
                      <p className="mt-1 text-sm text-slate-400">{meta?.subtitle}</p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className={`rounded-full border px-3 py-1 text-xs font-medium ${statusClass[report.status]}`}>
                        {labelForStatus(report.status)}
                      </span>
                      <span className={`text-xs font-semibold ${severityClass[report.severity]}`}>
                        {report.severity} severity
                      </span>
                    </div>
                  </div>

                  <p className="mt-5 text-sm leading-6 text-slate-200">{report.explanation}</p>
                  <div className="mt-4 rounded-xl bg-white/[0.04] p-4">
                    <p className="text-xs font-semibold tracking-widest text-slate-500">EVIDENCE</p>
                    <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3">
                      {Object.entries(report.evidence).map(([key, value]) => (
                        <div key={key} className="min-w-0">
                          <dt className="text-xs text-slate-500">{key.replace(/([A-Z])/g, " $1").replaceAll("_", " ")}</dt>
                          <dd className="mt-1 break-words text-sm font-medium text-slate-200">{formatEvidence(value)}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                  <div className="mt-4">
                    <p className="text-xs font-semibold tracking-widest text-cyan-300">POTENTIAL IMPLICATION</p>
                    <p className="mt-1 text-sm leading-6 text-slate-300">{report.implication}</p>
                  </div>
                  <div className="mt-4 border-t border-white/10 pt-4">
                    <p className="text-xs leading-5 text-slate-500">
                      <strong className="font-semibold text-slate-400">Limitations: </strong>
                      {report.limitations}
                    </p>
                    <Link
                      href={`/academy/${report.lessonId}`}
                      className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-cyan-300 hover:text-cyan-200"
                    >
                      Recommended lesson <ArrowRight size={15} />
                    </Link>
                  </div>
                </article>
              );
            })}
          </section>
        )}

        <section className="rounded-2xl border border-white/10 bg-[#111a2b] p-5">
          <div className="flex items-start gap-3">
            <AlertTriangle size={19} className="mt-0.5 text-amber-300" />
            <div>
              <h2 className="font-semibold">Educational use only</h2>
              <p className="mt-1 text-sm leading-6 text-slate-400">
                Thresholds are configurable heuristics. These indicators do not diagnose a trader,
                infer intent, predict prices or recommend specific securities. Review the underlying
                trades and context before drawing conclusions.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function SummaryCard({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: number | string;
}) {
  return (
    <article className="rounded-2xl border border-white/10 bg-[#111a2b] p-5">
      <div className="flex items-center gap-2 text-cyan-300">{icon}<span className="text-sm text-slate-400">{label}</span></div>
      <p className="mt-3 text-2xl font-bold">{value}</p>
    </article>
  );
}
