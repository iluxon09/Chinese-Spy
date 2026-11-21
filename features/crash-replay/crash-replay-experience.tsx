"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowRight, CheckCircle2, LoaderCircle, ShieldCheck, TrendingDown } from "lucide-react";
import type { RiskQuestionnaireAnswers } from "@/lib/crash-replay/risk-profile";
import {
  hasIdenticalPricePath,
  measureReplayAttempt,
  type ReplayAttemptMetrics,
  type ReplayHistoryPoint,
  type ReplayPortfolio,
} from "@/lib/crash-replay/metrics";

type ReplayRun = {
  id: string;
  scenario_id: string;
  risk_profile: "CONSERVATIVE" | "BALANCED" | "AGGRESSIVE";
  questionnaire: RiskQuestionnaireAnswers;
  max_drawdown_bps: number;
  max_position_bps: number;
  baseline_session_id: string;
  reassessment_session_id: string;
  baseline_completed_at: string | null;
  reassessment_completed_at: string | null;
  created_at: string;
};

type Session = {
  id: string;
  market_step: number;
  cash_balance_paise: number | string;
  starting_capital_paise: number | string;
};

type Company = {
  symbol: string;
  name: string;
  sector: string;
  initialPricePaise: number;
  currentPrice: { pricePaise: number; timestamp: string } | null;
};

type Market = {
  scenario: { id: string; name: string; charge_rate_bps: number; minimum_charge_paise: number };
  marketStep: number;
  companies: Company[];
  events: Array<{
    id: string;
    market_step: number;
    title: string;
    description: string;
    effect_bps: number;
    symbol?: string | null;
    sector?: string | null;
  }>;
};

type Portfolio = ReplayPortfolio & {
  session: Session;
  holdings: Record<string, unknown>;
};

type HistoryResponse = {
  histories: Record<string, ReplayHistoryPoint[]>;
};

type ReplaySnapshot = {
  portfolio: Portfolio;
  market: Market;
  histories: Record<string, ReplayHistoryPoint[]>;
};

type Comparison = {
  baseline: ReplayAttemptMetrics;
  reassessment: ReplayAttemptMetrics;
  identicalPricePath: boolean;
};

type ReplayView = "assessment" | "baseline" | "await-reassessment" | "reassessment" | "compare";
type AttemptName = "baseline" | "reassessment";

const CRASH_STEPS = 5;
const DEFAULT_ANSWERS: RiskQuestionnaireAnswers = {
  investmentHorizon: "one-to-five-years",
  drawdownComfortPct: 10,
  reactionToFall: "review",
  diversificationPreference: "three-five",
  investmentObjective: "balanced",
  maxPositionPct: 15,
};

const currency = (paise: number | string) => new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
}).format(Number(paise) / 100);

const profileLabel: Record<ReplayRun["risk_profile"], string> = {
  CONSERVATIVE: "Conservative",
  BALANCED: "Balanced",
  AGGRESSIVE: "Aggressive",
};

const reactionLabel: Record<RiskQuestionnaireAnswers["reactionToFall"], string> = {
  sell: "Sell to limit further losses",
  review: "Pause and review the original plan",
  hold: "Hold and reassess the available information",
  buy: "Consider adding only if the original thesis remains valid",
};

function errorMessage(value: unknown) {
  return value instanceof Error ? value.message : "Something went wrong. Please try again.";
}

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    credentials: "same-origin",
    cache: "no-store",
    ...init,
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body.error ?? body.message ?? `Request failed (${response.status})`);
  }
  return body as T;
}

async function loadReplaySnapshot(sessionId: string): Promise<ReplaySnapshot> {
  const [portfolio, market, history] = await Promise.all([
    api<Portfolio>(`/api/sessions/${sessionId}/portfolio`),
    api<Market>(`/api/sessions/${sessionId}/market`),
    api<HistoryResponse>(`/api/sessions/${sessionId}/market/history`),
  ]);
  return { portfolio, market, histories: history.histories ?? {} };
}

function uniqueEvents(events: Market["events"]) {
  const unique = new Map<string, Market["events"][number]>();
  for (const event of events) unique.set(event.title + event.description, event);
  return [...unique.values()];
}

export default function CrashReplayExperience() {
  const [view, setView] = useState<ReplayView>("assessment");
  const [run, setRun] = useState<ReplayRun | null>(null);
  const [answers, setAnswers] = useState<RiskQuestionnaireAnswers>(DEFAULT_ANSWERS);
  const [snapshot, setSnapshot] = useState<ReplaySnapshot | null>(null);
  const [comparison, setComparison] = useState<Comparison | null>(null);
  const [selectedSymbol, setSelectedSymbol] = useState("ASTE");
  const [side, setSide] = useState<"BUY" | "SELL">("BUY");
  const [quantity, setQuantity] = useState("10");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const activeAttempt: AttemptName | null = view === "baseline"
    ? "baseline"
    : view === "reassessment"
      ? "reassessment"
      : null;

  const activeSessionId = useMemo(() => {
    if (!run || !activeAttempt) return null;
    return activeAttempt === "baseline" ? run.baseline_session_id : run.reassessment_session_id;
  }, [run, activeAttempt]);

  const loadComparison = useCallback(async (selectedRun: ReplayRun) => {
    const [baselinePortfolio, reassessmentPortfolio, baselineHistory, reassessmentHistory] = await Promise.all([
      api<Portfolio>(`/api/sessions/${selectedRun.baseline_session_id}/portfolio`),
      api<Portfolio>(`/api/sessions/${selectedRun.reassessment_session_id}/portfolio`),
      api<HistoryResponse>(`/api/sessions/${selectedRun.baseline_session_id}/market/history`),
      api<HistoryResponse>(`/api/sessions/${selectedRun.reassessment_session_id}/market/history`),
    ]);

    const firstHistory = baselineHistory.histories ?? {};
    const secondHistory = reassessmentHistory.histories ?? {};
    setComparison({
      baseline: measureReplayAttempt(baselinePortfolio, firstHistory),
      reassessment: measureReplayAttempt(reassessmentPortfolio, secondHistory),
      identicalPricePath: hasIdenticalPricePath(firstHistory, secondHistory),
    });
    setView("compare");
  }, []);

  const finishAttempt = useCallback(async (selectedRun: ReplayRun, attempt: AttemptName) => {
    const result = await api<{ run: ReplayRun }>(`/api/crash-replay/${selectedRun.id}/complete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ attempt }),
    });
    setRun(result.run);
    setSnapshot(null);

    if (attempt === "baseline") {
      setView("await-reassessment");
      setNotice("First attempt saved. Start the reassessment when you are ready.");
    } else {
      setNotice("Both attempts are saved. Your comparison is ready.");
      await loadComparison(result.run);
    }
  }, [loadComparison]);

  const initialize = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await api<{ run: ReplayRun | null }>("/api/crash-replay");
      if (!result.run) {
        setView("assessment");
        return;
      }

      setRun(result.run);
      if (result.run.baseline_completed_at && result.run.reassessment_completed_at) {
        await loadComparison(result.run);
      } else if (result.run.baseline_completed_at) {
        const secondAttempt = await loadReplaySnapshot(result.run.reassessment_session_id);
        if (secondAttempt.market.marketStep > 0) {
          setSnapshot(secondAttempt);
          setView("reassessment");
          if (secondAttempt.market.marketStep >= CRASH_STEPS) {
            await finishAttempt(result.run, "reassessment");
          }
        } else {
          setView("await-reassessment");
        }
      } else {
        const active = await loadReplaySnapshot(result.run.baseline_session_id);
        setSnapshot(active);
        setView("baseline");
        if (active.market.marketStep >= CRASH_STEPS) {
          await finishAttempt(result.run, "baseline");
        }
      }
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [finishAttempt, loadComparison]);

  useEffect(() => {
    let cancelled = false;
    void Promise.resolve().then(() => {
      if (!cancelled) void initialize();
    });
    return () => {
      cancelled = true;
    };
  }, [initialize]);

  function updateAnswer<K extends keyof RiskQuestionnaireAnswers>(
    key: K,
    value: RiskQuestionnaireAnswers[K],
  ) {
    setAnswers((current) => ({ ...current, [key]: value }));
  }

  async function startReplay(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const result = await api<{ run: ReplayRun }>("/api/crash-replay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionnaire: answers }),
      });
      setRun(result.run);
      setComparison(null);
      const first = await loadReplaySnapshot(result.run.baseline_session_id);
      setSnapshot(first);
      setView("baseline");
      setNotice("Your baseline attempt has started. The five-step crash is identical in the reassessment.");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function startReassessment() {
    if (!run) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const second = await loadReplaySnapshot(run.reassessment_session_id);
      setSnapshot(second);
      setView("reassessment");
      setSelectedSymbol(second.market.companies[0]?.symbol ?? "ASTE");
      if (second.market.marketStep >= CRASH_STEPS) {
        await finishAttempt(run, "reassessment");
      } else {
        setNotice("Reassessment started. The market follows the same saved five-step price path.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function advanceMarket() {
    if (!run || !activeSessionId || !activeAttempt || !snapshot || busy) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const result = await api<{ result: { marketStep: number } }>(
        `/api/sessions/${activeSessionId}/market/advance`,
        { method: "POST" },
      );
      const updated = await loadReplaySnapshot(activeSessionId);
      setSnapshot(updated);

      if (result.result.marketStep >= CRASH_STEPS) {
        await finishAttempt(run, activeAttempt);
      } else {
        setNotice(`Market step ${result.result.marketStep} of ${CRASH_STEPS} completed.`);
      }
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function placeOrder() {
    if (!run || !activeSessionId || !snapshot || busy) return;
    const quantityValue = Number(quantity);
    if (!Number.isSafeInteger(quantityValue) || quantityValue <= 0) {
      setError("Enter a positive whole-number quantity.");
      return;
    }

    setBusy(true);
    setError("");
    setNotice("");
    try {
      await api<{ result: unknown }>(`/api/sessions/${activeSessionId}/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientOrderId: crypto.randomUUID(),
          symbol: selectedSymbol,
          side,
          quantity: quantityValue,
        }),
      });

      try {
        const portfolio = await api<Portfolio>(`/api/sessions/${activeSessionId}/portfolio`);
        setSnapshot((current) => current ? { ...current, portfolio } : current);
        setNotice(`${side} order completed.`);
      } catch {
        setNotice(`${side} order was accepted. Refresh the page if the portfolio display has not updated.`);
      }
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  function startNewAssessment() {
    setRun(null);
    setSnapshot(null);
    setComparison(null);
    setAnswers(DEFAULT_ANSWERS);
    setError("");
    setNotice("");
    setView("assessment");
  }

  const currentEvents = snapshot ? uniqueEvents(snapshot.market.events) : [];
  const currentCompany = snapshot?.market.companies.find((company) => company.symbol === selectedSymbol);
  const statedReaction = run ? reactionLabel[run.questionnaire.reactionToFall] : "";

  if (loading) {
    return (
      <main className="min-h-[70vh] p-8 text-slate-300">
        <LoaderCircle className="mb-3 animate-spin text-emerald-300" />
        Loading your crash replay…
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#080d18] px-4 py-8 text-slate-100 sm:px-8">
      <div className="mx-auto max-w-6xl space-y-7">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold tracking-[.22em] text-emerald-300">TILT / DECISION LAB</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight">Risk Assessment & Crash Replay</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
              Run two separate virtual portfolios through the same fixed five-step market shock. The first captures your baseline decisions; the second lets you test whether your approach changes.
            </p>
          </div>
          <Link href="/behaviour" className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-sm text-slate-300 hover:bg-white/5">
            Behavioral Analysis <ArrowRight size={15} />
          </Link>
        </header>

        {error && <p role="alert" className="rounded-xl border border-red-400/25 bg-red-400/5 p-4 text-sm text-red-200">{error}</p>}
        {notice && <p role="status" className="rounded-xl border border-emerald-400/20 bg-emerald-400/5 p-4 text-sm text-emerald-100">{notice}</p>}

        {view === "assessment" && (
          <section className="rounded-2xl border border-white/10 bg-[#101a2b] p-5 sm:p-7">
            <div className="mb-6 flex items-start gap-3">
              <ShieldCheck className="mt-1 text-emerald-300" />
              <div>
                <h2 className="text-xl font-semibold">Your stated risk profile</h2>
                <p className="mt-1 text-sm leading-6 text-slate-400">
                  Answer based on your own preferences. TILT uses a transparent educational classification, not a regulated suitability or psychological test.
                </p>
              </div>
            </div>

            <form onSubmit={startReplay} className="space-y-5">
              <Question
                label="1. How long would you normally stay invested?"
                value={answers.investmentHorizon}
                onChange={(value) => updateAnswer("investmentHorizon", value as RiskQuestionnaireAnswers["investmentHorizon"])}
                options={[
                  ["under-one-year", "Less than one year"],
                  ["one-to-five-years", "One to five years"],
                  ["over-five-years", "More than five years"],
                ]}
              />
              <Question
                label="2. What temporary portfolio decline could you tolerate before reconsidering your plan?"
                value={String(answers.drawdownComfortPct)}
                onChange={(value) => updateAnswer("drawdownComfortPct", Number(value) as RiskQuestionnaireAnswers["drawdownComfortPct"])}
                options={[["5", "5%"], ["10", "10%"], ["15", "15%"], ["20", "20%"]]}
              />
              <Question
                label="3. If the market fell sharply in one day, what would you most likely do first?"
                value={answers.reactionToFall}
                onChange={(value) => updateAnswer("reactionToFall", value as RiskQuestionnaireAnswers["reactionToFall"])}
                options={[
                  ["sell", "Sell to limit further losses"],
                  ["review", "Pause and review my original plan"],
                  ["hold", "Hold and reassess the available information"],
                  ["buy", "Consider adding only if my original thesis remains valid"],
                ]}
              />
              <Question
                label="4. How many different companies would you prefer to hold?"
                value={answers.diversificationPreference}
                onChange={(value) => updateAnswer("diversificationPreference", value as RiskQuestionnaireAnswers["diversificationPreference"])}
                options={[
                  ["one-two", "1–2 companies"],
                  ["three-five", "3–5 companies"],
                  ["six-ten", "6–10 companies"],
                  ["more-than-ten", "More than 10 companies"],
                ]}
              />
              <Question
                label="5. Which objective best describes your preference?"
                value={answers.investmentObjective}
                onChange={(value) => updateAnswer("investmentObjective", value as RiskQuestionnaireAnswers["investmentObjective"])}
                options={[
                  ["preserve", "Preserve capital"],
                  ["balanced", "Balance growth and risk"],
                  ["growth", "Pursue long-term growth while accepting volatility"],
                ]}
              />
              <Question
                label="6. What is your intended maximum allocation to a single company?"
                value={String(answers.maxPositionPct)}
                onChange={(value) => updateAnswer("maxPositionPct", Number(value) as RiskQuestionnaireAnswers["maxPositionPct"])}
                options={[["10", "10%"], ["15", "15%"], ["20", "20%"], ["25", "25%"]]}
              />

              <div className="flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-5">
                <p className="max-w-2xl text-xs leading-5 text-slate-500">
                  Your answers and both isolated attempts are saved to your account. The simulator uses virtual money only.
                </p>
                <button type="submit" disabled={busy} className="inline-flex items-center gap-2 rounded-lg bg-emerald-300 px-5 py-3 text-sm font-bold text-slate-950 disabled:opacity-50">
                  {busy ? <LoaderCircle className="animate-spin" size={16} /> : <ArrowRight size={16} />}
                  Start baseline attempt
                </button>
              </div>
            </form>
          </section>
        )}

        {(view === "baseline" || view === "reassessment") && snapshot && run && (
          <>
            <section className="grid gap-3 sm:grid-cols-3">
              <InfoCard label="Declared profile" value={profileLabel[run.risk_profile]} detail={statedReaction} />
              <InfoCard label="Portfolio value" value={currency(snapshot.portfolio.snapshot.portfolioValuePaise)} detail="Virtual portfolio value" />
              <InfoCard label="Market progression" value={`Step ${snapshot.market.marketStep} / ${CRASH_STEPS}`} detail="Same scripted crash for both attempts" />
            </section>

            <section className="rounded-2xl border border-white/10 bg-[#101a2b] p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold tracking-[.18em] text-emerald-300">
                    {view === "baseline" ? "ATTEMPT 1 / BASELINE" : "ATTEMPT 2 / REASSESSMENT"}
                  </p>
                  <h2 className="mt-2 text-xl font-semibold">
                    {view === "baseline" ? "Make decisions as you normally would" : "Apply what you learned"}
                  </h2>
                  <p className="mt-1 text-sm text-slate-400">
                    Advance one market step at a time. You can trade before each step advances.
                  </p>
                </div>
                <span className="rounded-full border border-amber-300/20 bg-amber-300/5 px-3 py-1 text-xs text-amber-200">
                  Scripted volatility scenario
                </span>
              </div>

              <div className="mt-5 grid gap-4 lg:grid-cols-[1.3fr_.7fr]">
                <div className="rounded-xl border border-white/10 bg-[#0b1422] p-4">
                  <div className="flex items-center gap-2 text-sm text-slate-300">
                    <TrendingDown size={17} className="text-red-300" />
                    Current market events
                  </div>
                  {currentEvents.length ? currentEvents.map((event) => (
                    <div key={event.id} className="mt-3 border-l-2 border-red-300/50 pl-3">
                      <p className="text-sm font-semibold">{event.title}</p>
                      <p className="mt-1 text-xs leading-5 text-slate-400">{event.description}</p>
                    </div>
                  )) : (
                    <p className="mt-3 text-sm text-slate-500">The market shock begins when you advance the first step.</p>
                  )}
                  <p className="mt-4 text-xs text-slate-500">
                    This five-step educational scenario is fixed and repeatable; it is not a forecast of actual markets.
                  </p>
                </div>

                <div className="rounded-xl border border-white/10 bg-[#0b1422] p-4">
                  <h3 className="text-sm font-semibold">Your personal guardrails</h3>
                  <div className="mt-3 flex justify-between gap-3 text-sm">
                    <span className="text-slate-400">Drawdown comfort</span>
                    <strong>{run.max_drawdown_bps / 100}%</strong>
                  </div>
                  <div className="mt-3 flex justify-between gap-3 text-sm">
                    <span className="text-slate-400">Maximum single position</span>
                    <strong>{run.max_position_bps / 100}%</strong>
                  </div>
                  <p className="mt-3 text-xs leading-5 text-slate-500">
                    These are your declared limits. The current replay records decisions; it does not block orders automatically.
                  </p>
                </div>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {snapshot.market.companies.map((company) => (
                  <article key={company.symbol} className="rounded-xl border border-white/10 bg-[#0b1422] p-3">
                    <p className="font-semibold">{company.symbol}</p>
                    <p className="mt-1 text-xs text-slate-500">{company.name} · {company.sector}</p>
                    <p className="mt-3 text-lg font-bold">{currency(company.currentPrice?.pricePaise ?? company.initialPricePaise)}</p>
                  </article>
                ))}
              </div>
            </section>

            <section className="grid gap-4 lg:grid-cols-[1fr_1fr]">
              <div className="rounded-2xl border border-white/10 bg-[#101a2b] p-5">
                <h2 className="font-semibold">Place a virtual market order</h2>
                <p className="mt-1 text-xs text-slate-400">Orders are isolated to this replay attempt.</p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <label className="grid gap-2 text-xs text-slate-400">
                    Company
                    <select value={selectedSymbol} onChange={(event) => setSelectedSymbol(event.target.value)} className="min-h-11 rounded-lg border border-white/10 bg-[#0b1422] px-3 text-sm text-white">
                      {snapshot.market.companies.map((company) => <option key={company.symbol} value={company.symbol}>{company.symbol} — {company.name}</option>)}
                    </select>
                  </label>
                  <label className="grid gap-2 text-xs text-slate-400">
                    Quantity
                    <input type="number" min="1" step="1" value={quantity} onChange={(event) => setQuantity(event.target.value)} className="min-h-11 rounded-lg border border-white/10 bg-[#0b1422] px-3 text-sm text-white" />
                  </label>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => setSide("BUY")} className={side === "BUY" ? "rounded-lg bg-emerald-300 px-3 py-2.5 text-sm font-bold text-slate-950" : "rounded-lg border border-white/10 px-3 py-2.5 text-sm text-slate-300"}>BUY</button>
                  <button type="button" onClick={() => setSide("SELL")} className={side === "SELL" ? "rounded-lg bg-red-300 px-3 py-2.5 text-sm font-bold text-slate-950" : "rounded-lg border border-white/10 px-3 py-2.5 text-sm text-slate-300"}>SELL</button>
                </div>
                <button type="button" onClick={() => void placeOrder()} disabled={busy || snapshot.market.marketStep >= CRASH_STEPS} className="mt-3 w-full rounded-lg bg-white px-4 py-3 text-sm font-bold text-slate-950 disabled:opacity-40">
                  {busy ? "Processing…" : `Submit ${side} order`}
                </button>
                <p className="mt-3 text-xs text-slate-500">Cash available: {currency(snapshot.portfolio.session.cash_balance_paise)}</p>
                {currentCompany && <p className="mt-1 text-xs text-slate-500">Selected price: {currency(currentCompany.currentPrice?.pricePaise ?? currentCompany.initialPricePaise)}</p>}
              </div>

              <div className="flex flex-col justify-between rounded-2xl border border-white/10 bg-[#101a2b] p-5">
                <div>
                  <h2 className="font-semibold">Advance the market</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-400">
                    The next step applies the next event in the fixed crash sequence. Your orders remain attached to this attempt.
                  </p>
                  <div className="mt-5 flex items-center gap-2">
                    {Array.from({ length: CRASH_STEPS }, (_, index) => (
                      <span key={index} className={index < snapshot.market.marketStep ? "h-2 flex-1 rounded-full bg-emerald-300" : "h-2 flex-1 rounded-full bg-white/10"} />
                    ))}
                  </div>
                  <p className="mt-2 text-xs text-slate-500">{snapshot.market.marketStep} of {CRASH_STEPS} steps completed</p>
                </div>
                <button type="button" onClick={() => void advanceMarket()} disabled={busy || snapshot.market.marketStep >= CRASH_STEPS} className="mt-6 inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-300 px-4 py-3 text-sm font-bold text-slate-950 disabled:opacity-40">
                  {busy ? <LoaderCircle className="animate-spin" size={16} /> : <ArrowRight size={16} />}
                  {snapshot.market.marketStep >= CRASH_STEPS ? "Attempt completed" : "Advance one step"}
                </button>
              </div>
            </section>
          </>
        )}

        {view === "await-reassessment" && run && (
          <section className="rounded-2xl border border-emerald-300/20 bg-[#101a2b] p-6 sm:p-8">
            <CheckCircle2 className="text-emerald-300" size={28} />
            <h2 className="mt-4 text-2xl font-semibold">Baseline attempt saved</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
              Your first portfolio and transactions are preserved. The next attempt starts with a fresh portfolio and the exact same scenario prices and events.
            </p>
            <button type="button" onClick={() => void startReassessment()} disabled={busy} className="mt-6 rounded-lg bg-emerald-300 px-5 py-3 text-sm font-bold text-slate-950 disabled:opacity-50">
              {busy ? "Loading…" : "Start reassessment"}
            </button>
          </section>
        )}

        {view === "compare" && run && comparison && (
          <>
            <section className="rounded-2xl border border-white/10 bg-[#101a2b] p-5 sm:p-7">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold tracking-[.18em] text-emerald-300">REASSESSMENT COMPLETE</p>
                  <h2 className="mt-2 text-2xl font-semibold">What changed in your decisions?</h2>
                  <p className="mt-1 text-sm text-slate-400">Declared profile: {profileLabel[run.risk_profile]}</p>
                </div>
                <span className={comparison.identicalPricePath ? "inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-300/5 px-3 py-2 text-xs text-emerald-200" : "inline-flex items-center gap-2 rounded-full border border-amber-300/20 bg-amber-300/5 px-3 py-2 text-xs text-amber-200"}>
                  <CheckCircle2 size={14} /> {comparison.identicalPricePath ? "Identical price path verified" : "Price path verification failed"}
                </span>
              </div>

              <div className="mt-6 overflow-x-auto">
                <table className="w-full min-w-[560px] border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-white/10 text-xs text-slate-500">
                      <th className="py-3 pr-4 font-medium">Measure</th>
                      <th className="px-4 py-3 font-medium">Baseline</th>
                      <th className="px-4 py-3 font-medium">Reassessment</th>
                    </tr>
                  </thead>
                  <tbody>
                    <ComparisonRow label="Trades completed" first={comparison.baseline.tradeCount} second={comparison.reassessment.tradeCount} />
                    <ComparisonRow label="Sells after ≥8% decline" first={comparison.baseline.sellsAfterEightPercentDecline} second={comparison.reassessment.sellsAfterEightPercentDecline} />
                    <ComparisonRow label="Transaction charges" first={currency(comparison.baseline.totalChargesPaise)} second={currency(comparison.reassessment.totalChargesPaise)} />
                    <ComparisonRow label="Final portfolio value" first={currency(comparison.baseline.portfolioValuePaise)} second={currency(comparison.reassessment.portfolioValuePaise)} />
                    <ComparisonRow label="Simulated return" first={`${comparison.baseline.returnPercent.toFixed(2)}%`} second={`${comparison.reassessment.returnPercent.toFixed(2)}%`} />
                  </tbody>
                </table>
              </div>

              <div className="mt-6 rounded-xl border border-white/10 bg-[#0b1422] p-4">
                <p className="text-xs font-semibold tracking-[.16em] text-emerald-300">STATED VS REVEALED</p>
                <p className="mt-2 text-sm leading-6 text-slate-200">
                  You said your first response to a sharp fall would be: <strong>{statedReaction}</strong>.
                  The baseline attempt recorded <strong> {comparison.baseline.sellsAfterEightPercentDecline} </strong>
                  sale(s) after a decline of at least 8%; the reassessment recorded
                  <strong> {comparison.reassessment.sellsAfterEightPercentDecline} </strong>.
                  These are observed simulated decisions, not a diagnosis of intent.
                </p>
              </div>

              <p className="mt-4 text-xs leading-5 text-slate-500">
                TILT scores this exercise on observable decisions and process evidence, not on which attempt generated the highest return. The two attempts use separate portfolios and a shared deterministic price path.
              </p>
            </section>

            <div className="flex flex-wrap items-center gap-3">
              <button type="button" onClick={startNewAssessment} className="rounded-lg bg-emerald-300 px-5 py-3 text-sm font-bold text-slate-950">Run another assessment</button>
              <Link href="/behaviour" className="rounded-lg border border-white/10 px-5 py-3 text-sm text-slate-200">Open Behavioral Analysis</Link>
            </div>
          </>
        )}

        <section className="flex items-start gap-3 rounded-xl border border-amber-300/15 bg-amber-300/[.035] p-4">
          <AlertTriangle size={17} className="mt-0.5 shrink-0 text-amber-200" />
          <p className="text-xs leading-5 text-slate-400">
            Educational simulation only. This questionnaire is self-reported and is not a regulated investment suitability assessment. Virtual outcomes do not establish how a person would behave with real money or predict future investment returns.
          </p>
        </section>
      </div>
    </main>
  );
}

function Question({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: Array<[string, string]>;
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid gap-2 text-sm">
      <span className="font-medium text-slate-200">{label}</span>
      <select
        required
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-12 rounded-lg border border-white/10 bg-[#0b1422] px-3 text-sm text-white"
      >
        {options.map(([optionValue, optionLabel]) => (
          <option key={optionValue} value={optionValue}>{optionLabel}</option>
        ))}
      </select>
    </label>
  );
}

function InfoCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <article className="rounded-xl border border-white/10 bg-[#101a2b] p-4">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-2 text-xl font-bold">{value}</p>
      <p className="mt-1 text-xs text-slate-400">{detail}</p>
    </article>
  );
}

function ComparisonRow({ label, first, second }: { label: string; first: string | number; second: string | number }) {
  return (
    <tr className="border-b border-white/5">
      <th scope="row" className="py-3 pr-4 font-medium text-slate-300">{label}</th>
      <td className="px-4 py-3 text-slate-400">{first}</td>
      <td className="px-4 py-3 font-semibold text-slate-100">{second}</td>
    </tr>
  );
}
