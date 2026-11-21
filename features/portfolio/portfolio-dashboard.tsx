"use client";

import Link from "next/link";
import { ArrowRight, BriefcaseBusiness, Wallet } from "lucide-react";
import { useTilt } from "@/features/shared/tilt-provider";
import PageState from "@/components/ui/page-state";

const money = (paise: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(paise / 100);

function signedMoney(paise: number) {
  return `${paise > 0 ? "+" : ""}${money(paise)}`;
}

function percentage(value: number) {
  return `${value > 0 ? "+" : ""}${value.toFixed(2)}%`;
}

type PortfolioMetric = { label: string; value: string; detail: string; tone?: "positive" | "negative" };

export default function PortfolioDashboard() {
  const { loading, error, authenticated, portfolio } = useTilt();

  if (loading) return <PageState variant="loading" title="Loading your portfolio" description="Reconciling cash, holdings and simulated market values." />;

  if (!authenticated) {
    return (
      <PageState variant="empty" title="Sign in to view your portfolio"
        description="Your holdings, balances and realised performance are scoped to your simulation account."
        action={<Link href="/login" className="tilt-state-action">Sign in / Create account</Link>} />
    );
  }

  if (!portfolio) return <PageState variant="error" title="Portfolio data is unavailable" description={error || "TILT could not retrieve your portfolio. Refresh the page to try again."} />;

  const snapshot = portfolio.snapshot;
  const allocations = [...snapshot.allocation].filter((item) => item.marketValuePaise > 0).sort((a, b) => b.weightBps - a.weightBps);
  const metrics: PortfolioMetric[] = [
    { label: "Portfolio value", value: money(snapshot.portfolioValuePaise), detail: "Cash + current holdings" },
    { label: "Invested capital", value: money(snapshot.investedAmountPaise), detail: "Cost of open positions" },
    { label: "Available cash", value: money(snapshot.cashBalancePaise), detail: "Ready for virtual orders" },
    { label: "Total P&L", value: signedMoney(snapshot.totalPnlPaise), detail: percentage(snapshot.returnPercent), tone: snapshot.totalPnlPaise >= 0 ? "positive" : "negative" },
  ];

  return (
    <main className="portfolio-page min-h-screen bg-[#080D19] p-5 text-slate-100 md:p-8">
      <div className="mx-auto max-w-7xl space-y-7">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold tracking-[.22em] text-emerald-400">TILT / YOUR CAPITAL</p>
            <h1 className="mt-2 text-3xl font-bold">Portfolio</h1>
            <p className="mt-2 text-sm text-slate-400">Server-calculated balances, positions and performance for this simulation.</p>
          </div>
          <nav aria-label="Portfolio tools" className="flex flex-wrap gap-2">
            <Link href="/portfolio/architect" className="portfolio-tool-link portfolio-tool-link--primary">Investment Architect <ArrowRight size={15} aria-hidden="true" /></Link>
            <Link href="/portfolio/architect/sip" className="portfolio-tool-link">SIP &amp; Goal Calculator <ArrowRight size={15} aria-hidden="true" /></Link>
          </nav>
        </header>

        <section className="portfolio-metrics" aria-label="Portfolio summary">
          {metrics.map((metric) => (
            <article className="portfolio-metric" key={metric.label}>
              <p>{metric.label}</p>
              <strong className={metric.tone ? `portfolio-metric-value is-${metric.tone}` : "portfolio-metric-value"}>{metric.value}</strong>
              <span>{metric.detail}</span>
            </article>
          ))}
        </section>

        <div className="portfolio-analysis-grid">
          <section className="portfolio-section" aria-labelledby="allocation-heading">
            <div className="portfolio-section-heading">
              <div><p className="portfolio-section-kicker">EXPOSURE</p><h2 id="allocation-heading">Company allocation</h2></div>
              <span>{allocations.length} {allocations.length === 1 ? "position" : "positions"}</span>
            </div>
            {allocations.length > 0 ? (
              <ol className="portfolio-allocation-list">
                {allocations.map((item) => {
                  const weight = Math.min(100, Math.max(0, item.weightBps / 100));
                  return (
                    <li className="portfolio-allocation-row" key={item.symbol}>
                      <div className="portfolio-allocation-meta"><strong>{item.symbol}</strong><span>{money(item.marketValuePaise)}</span><b>{weight.toFixed(1)}%</b></div>
                      <div className="portfolio-allocation-track" role="img" aria-label={`${item.symbol}: ${weight.toFixed(1)} percent of portfolio holdings`}>
                        <span style={{ width: `${weight}%` }} />
                      </div>
                    </li>
                  );
                })}
              </ol>
            ) : (
              <div className="portfolio-empty-state">
                <BriefcaseBusiness size={20} aria-hidden="true" />
                <div><strong>No invested positions yet</strong><p>Buy a company in the simulated market to see how your capital is allocated.</p><Link href="/markets">Explore companies <ArrowRight size={14} aria-hidden="true" /></Link></div>
              </div>
            )}
          </section>

          <section className="portfolio-section" aria-labelledby="returns-heading">
            <div className="portfolio-section-heading">
              <div><p className="portfolio-section-kicker">PERFORMANCE</p><h2 id="returns-heading">Return breakdown</h2></div>
              <span>Since session start</span>
            </div>
            <dl className="portfolio-return-list">
              {[
                { label: "Realised P&L", value: snapshot.realisedPnlPaise },
                { label: "Unrealised P&L", value: snapshot.unrealisedPnlPaise },
                { label: "Total P&L", value: snapshot.totalPnlPaise },
              ].map((item) => (
                <div key={item.label} className="portfolio-return-row"><dt>{item.label}</dt><dd className={item.value >= 0 ? "is-positive" : "is-negative"}>{signedMoney(item.value)}</dd></div>
              ))}
              <div className="portfolio-return-row portfolio-return-row--total"><dt>Total return</dt><dd className={snapshot.returnPercent >= 0 ? "is-positive" : "is-negative"}>{percentage(snapshot.returnPercent)}</dd></div>
            </dl>
          </section>
        </div>

        <section className="portfolio-section portfolio-holdings" aria-labelledby="holdings-heading">
          <div className="portfolio-section-heading">
            <div><p className="portfolio-section-kicker">POSITIONS</p><h2 id="holdings-heading">Open holdings</h2></div>
            <Link href="/trading">Open trading terminal <ArrowRight size={14} aria-hidden="true" /></Link>
          </div>
          {snapshot.holdings.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead><tr><th scope="col">Company</th><th scope="col">Quantity</th><th scope="col">Average cost</th><th scope="col">Last price</th><th scope="col">Market value</th><th scope="col">Unrealised P&amp;L</th></tr></thead>
                <tbody>
                  {snapshot.holdings.map((holding) => (
                    <tr key={holding.symbol}>
                      <td className="font-semibold">{holding.symbol}</td><td>{holding.quantity.toLocaleString("en-IN")}</td>
                      <td>{money(holding.averagePurchasePricePaise)}</td><td>{money(holding.currentPricePaise)}</td>
                      <td>{money(holding.marketValuePaise)}</td>
                      <td className={holding.unrealisedPnlPaise >= 0 ? "is-positive" : "is-negative"}>{signedMoney(holding.unrealisedPnlPaise)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="portfolio-holdings-empty"><Wallet size={19} aria-hidden="true" /><p>Your portfolio is currently in cash. <Link href="/markets">Browse the market</Link> to place your first virtual order.</p></div>
          )}
        </section>

        <p className="portfolio-disclaimer">All values are simulated. Prices and portfolio totals reflect the latest persisted market step, not live exchange data.</p>
      </div>
    </main>
  );
}
