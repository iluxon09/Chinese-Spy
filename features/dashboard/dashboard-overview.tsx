"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  ArrowRight,
  BriefcaseBusiness,
  ChartNoAxesCombined,
  Clock3,
  Plus,
  RefreshCw,
  Wallet,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useTilt } from "@/features/shared/tilt-provider";
import RealMarketIntelligence from "@/features/market/real-market-intelligence";
import {
  calculateLastCandleChange,
  calculateSinceStartChange,
} from "@/lib/market/returns";

const money = (paise: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(paise / 100);

const percent = (value: number | null) =>
  value === null ? "—" : `${value > 0 ? "+" : ""}${value.toFixed(2)}%`;

const tone = (value: number | null) =>
  value === null ? "text-[#7b8490]" : value > 0 ? "text-[#3dd6a0]" : value < 0 ? "text-[#ff727b]" : "text-[#a1a1aa]";

function LocalDate() {
  const date = new Intl.DateTimeFormat("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  }).format(new Date());

  return <span>{date}</span>;
}

export default function DashboardOverview() {
  const {
    authenticated,
    loading,
    error,
    portfolio,
    market,
    histories,
    sessionId,
    createSession,
    refresh,
  } = useTilt();
  const [creating, setCreating] = useState(false);
  const [actionMessage, setActionMessage] = useState("");

  async function startNewSimulation() {
    if (creating) return;
    setCreating(true);
    setActionMessage("");
    try {
      const id = await createSession();
      setActionMessage("New simulation created: " + id.slice(0, 8));
    } catch (cause) {
      setActionMessage(
        cause instanceof Error ? cause.message : "Could not create simulation.",
      );
    } finally {
      setCreating(false);
    }
  }

  const marketRows = useMemo(() => {
    if (!market) return [];

    return market.companies.map((company) => {
      const points = histories[company.symbol] ?? [];
      const currentPrice =
        company.currentPrice?.pricePaise ?? company.initialPricePaise;

      return {
        ...company,
        currentPrice,
        candleChange: calculateLastCandleChange(
          points,
          market.marketStep,
          currentPrice,
          company.initialPricePaise,
        ),
        scenarioChange: calculateSinceStartChange(
          currentPrice,
          company.initialPricePaise,
        ),
        chart: points.map((point) => ({
          step: point.market_step,
          price: point.pricePaise / 100,
        })),
      };
    });
  }, [histories, market]);

  const composite = useMemo(() => {
    if (!market || marketRows.length === 0) return [];

    const stepSet = new Set<number>([0]);
    const historyMaps = new Map<string, Map<number, number>>();

    for (const company of marketRows) {
      const rows = new Map<number, number>();
      for (const point of histories[company.symbol] ?? []) {
        rows.set(point.market_step, point.pricePaise);
        stepSet.add(point.market_step);
      }
      historyMaps.set(company.symbol, rows);
    }

    return [...stepSet]
      .sort((a, b) => a - b)
      .map((step) => {
        const returns = marketRows.flatMap((company) => {
          const price =
            step === 0
              ? company.initialPricePaise
              : historyMaps.get(company.symbol)?.get(step);
          return price && company.initialPricePaise > 0
            ? [(price / company.initialPricePaise) * 100]
            : [];
        });

        return {
          step: `#${step}`,
          index: returns.length
            ? returns.reduce((sum, value) => sum + value, 0) / returns.length
            : 100,
        };
      });
  }, [histories, market, marketRows]);

  if (loading) {
    return (
      <main className="terminal-dashboard terminal-state">
        <div className="terminal-loading-line" />
        <p>Loading your market workspace…</p>
      </main>
    );
  }

  if (!authenticated) {
    return (
      <main className="terminal-dashboard terminal-state">
        <span className="terminal-kicker">TILT / FINANCIAL UNIVERSE</span>
        <h1>Your market. Your decisions.</h1>
        <p>{error || "Sign in to access your simulation workspace."}</p>
        <Link href="/login" className="terminal-primary-button">Sign in / Create account</Link>
      </main>
    );
  }

  if (!portfolio || !market) {
    return (
      <main className="terminal-dashboard terminal-state">
        <span className="terminal-kicker">WORKSPACE / OVERVIEW</span>
        <p role="alert">{error || "Portfolio unavailable. Refresh the workspace and try again."}</p>
        <button type="button" onClick={() => void refresh()} className="terminal-secondary-button">
          <RefreshCw size={14} /> Refresh workspace
        </button>
      </main>
    );
  }

  const snapshot = portfolio.snapshot;
  const advancing = marketRows.filter((company) => (company.scenarioChange ?? 0) > 0);
  const declining = marketRows.filter((company) => (company.scenarioChange ?? 0) < 0);
  const unchanged = marketRows.filter((company) => company.scenarioChange === 0);
  const gainers = [...marketRows].sort(
    (a, b) => (b.scenarioChange ?? -Infinity) - (a.scenarioChange ?? -Infinity),
  );
  const laggards = [...marketRows].sort(
    (a, b) => (a.scenarioChange ?? Infinity) - (b.scenarioChange ?? Infinity),
  );
  const mostActive = Object.entries(
    portfolio.transactions.reduce<Record<string, number>>((counts, transaction) => {
      counts[transaction.symbol] = (counts[transaction.symbol] ?? 0) + 1;
      return counts;
    }, {}),
  )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  const latestTransactions = [...portfolio.transactions].slice(-6).reverse();
  const valueCards = [
    {
      label: "Portfolio value",
      value: money(snapshot.portfolioValuePaise),
      detail: "Virtual cash + holdings",
      icon: Wallet,
    },
    {
      label: "Available cash",
      value: money(snapshot.cashBalancePaise),
      detail: "Ready to deploy",
      icon: Activity,
    },
    {
      label: "Invested capital",
      value: money(snapshot.investedAmountPaise),
      detail: "Cost of open positions",
      icon: BriefcaseBusiness,
    },
    {
      label: "Total P&L",
      value: money(snapshot.totalPnlPaise),
      detail: `${snapshot.returnPercent >= 0 ? "+" : ""}${snapshot.returnPercent.toFixed(2)}% overall return`,
      icon: ChartNoAxesCombined,
      pnl: true,
    },
  ];

  return (
    <main className="terminal-dashboard">
      <div className="terminal-dashboard-inner">
        <header className="terminal-page-heading">
          <div>
            <p className="terminal-kicker">TILT / MARKET WORKSPACE</p>
            <h1>Welcome back, Trader</h1>
            <p className="terminal-date"><LocalDate /></p>
            <div className="terminal-session-line">
              <span className="terminal-status-dot" />
              <span>SIMULATION ACTIVE</span>
              <span className="terminal-session-divider" />
              <span>SESSION <strong>{sessionId?.slice(0, 8) ?? "—"}</strong></span>
              <span className="terminal-session-divider" />
              <span>MARKET STEP <strong>{market.marketStep.toLocaleString("en-IN")}</strong></span>
            </div>
          </div>
          <div className="terminal-page-actions">
            <button
              type="button"
              onClick={startNewSimulation}
              disabled={creating}
              className="terminal-primary-button"
            >
              <Plus size={15} />
              {creating ? "Creating…" : "New simulation"}
            </button>
            <Link href="/trading" className="terminal-secondary-button">
              Open trading <ArrowRight size={14} />
            </Link>
          </div>
        </header>

        {actionMessage && (
          <p role="status" className="terminal-notice">{actionMessage}</p>
        )}
        {error && (
          <p role="alert" className="terminal-error">{error}</p>
        )}

        <section className="terminal-kpi-grid" aria-label="Portfolio metrics">
          {valueCards.map((card) => {
            const Icon = card.icon;
            return (
              <article className="terminal-card terminal-kpi" key={card.label}>
                <div className="terminal-card-label">
                  <span>{card.label}</span>
                  <Icon size={15} />
                </div>
                <p className="terminal-kpi-value">{card.value}</p>
                <p className={card.pnl ? `terminal-kpi-detail ${tone(snapshot.totalPnlPaise)}` : "terminal-kpi-detail"}>
                  {card.pnl && (snapshot.totalPnlPaise >= 0
                    ? <ArrowUpRight size={13} />
                    : <ArrowDownRight size={13} />)}
                  {card.detail}
                </p>
              </article>
            );
          })}
        </section>

        <section className="terminal-section">
          <div className="terminal-section-heading">
            <div>
              <p className="terminal-kicker">EQUITIES / TILT DEMO UNIVERSE</p>
              <h2>Company performance</h2>
              <p>Current simulated quotes · All eight fictional instruments</p>
            </div>
            <Link href="/markets" className="terminal-inline-link">
              Full market <ArrowUpRight size={14} />
            </Link>
          </div>

          <div className="terminal-stock-grid">
            {marketRows.map((company) => {
              const positive = (company.scenarioChange ?? 0) >= 0;
              const stroke = positive ? "#42d7a4" : "#ff747e";
              return (
                <Link
                  href="/markets"
                  key={company.symbol}
                  className="terminal-card terminal-stock-card"
                >
                  <div className="terminal-stock-heading">
                    <div>
                      <strong>{company.symbol}</strong>
                      <span>{company.name}</span>
                    </div>
                    <span className={positive ? "terminal-direction is-up" : "terminal-direction is-down"}>
                      {positive ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
                    </span>
                  </div>
                  <p className="terminal-stock-price">{money(company.currentPrice)}</p>
                  <div className="terminal-sparkline">
                    {company.chart.length > 1 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={company.chart}>
                          <Line
                            type="monotone"
                            dataKey="price"
                            stroke={stroke}
                            strokeWidth={1.7}
                            dot={false}
                            isAnimationActive={false}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="terminal-sparkline-empty">Waiting for market history</div>
                    )}
                  </div>
                  <div className="terminal-stock-returns">
                    <span className={tone(company.candleChange)}>
                      {percent(company.candleChange)} <small>last candle</small>
                    </span>
                    <span className={tone(company.scenarioChange)}>
                      {percent(company.scenarioChange)} <small>since start</small>
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        <section className="terminal-lower-grid">
          <article className="terminal-card terminal-composite-panel">
            <div className="terminal-section-heading compact">
              <div>
                <p className="terminal-kicker">BREADTH / SIMULATED</p>
                <h2>TILT market composite</h2>
                <p>Equal-weighted index · Opening value = 100</p>
              </div>
              <span className="terminal-neutral-tag">STEP {market.marketStep}</span>
            </div>
            <div className="terminal-breadth-row">
              <div>
                <strong className="is-up-text">{advancing.length}</strong>
                <span>Advancing</span>
              </div>
              <div>
                <strong className="is-down-text">{declining.length}</strong>
                <span>Declining</span>
              </div>
              <div>
                <strong>{unchanged.length}</strong>
                <span>Unchanged</span>
              </div>
            </div>
            <div className="terminal-composite-chart">
              {composite.length > 1 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={composite} margin={{ top: 8, right: 4, left: -22, bottom: 0 }}>
                    <defs>
                      <linearGradient id="tiltCompositeFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#39d5a1" stopOpacity={0.2} />
                        <stop offset="100%" stopColor="#39d5a1" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="#242424" strokeDasharray="3 5" vertical={false} />
                    <XAxis dataKey="step" tick={{ fill: "#777", fontSize: 10 }} tickLine={false} axisLine={false} minTickGap={32} />
                    <YAxis tick={{ fill: "#777", fontSize: 10 }} tickLine={false} axisLine={false} width={38} domain={["auto", "auto"]} />
                    <Tooltip
                      contentStyle={{ background: "#0c0c0c", border: "1px solid #292929", borderRadius: 8, color: "#f5f5f5", fontSize: 11 }}
                      formatter={(value) => [`${Number(value).toFixed(2)}`, "TILT composite"]}
                    />
                    <Area type="monotone" dataKey="index" stroke="#42d7a4" strokeWidth={2} fill="url(#tiltCompositeFill)" isAnimationActive={false} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="terminal-chart-empty">
                  <Activity size={19} />
                  <span>Composite history appears as market candles are recorded.</span>
                </div>
              )}
            </div>
            <p className="terminal-footnote">Derived only from TILT&apos;s persisted fictional prices. Not an NSE/BSE index.</p>
          </article>

          <article className="terminal-card terminal-list-panel">
            <div className="terminal-section-heading compact">
              <div>
                <p className="terminal-kicker">LEADERS / LAGGARDS</p>
                <h2>Top movers</h2>
                <p>Return since simulation start</p>
              </div>
              <Link href="/markets" className="terminal-icon-link" aria-label="View full market">
                <ArrowUpRight size={16} />
              </Link>
            </div>
            <div className="terminal-mover-list">
              {[...gainers.slice(0, 3), ...laggards.slice(0, 2)].map((company, index) => {
                const isUp = (company.scenarioChange ?? 0) >= 0;
                return (
                  <div className="terminal-mover-row" key={`${company.symbol}-${index}`}>
                    <span className="terminal-mover-symbol">{company.symbol.slice(0, 2)}</span>
                    <span className="terminal-mover-name">
                      <strong>{company.symbol}</strong>
                      <small>{company.name}</small>
                    </span>
                    <span className={isUp ? "terminal-mover-change is-up-text" : "terminal-mover-change is-down-text"}>
                      {percent(company.scenarioChange)}
                    </span>
                  </div>
                );
              })}
            </div>
            <Link href="/markets" className="terminal-panel-link">
              All instruments <ArrowRight size={13} />
            </Link>
          </article>

          <article className="terminal-card terminal-list-panel">
            <div className="terminal-section-heading compact">
              <div>
                <p className="terminal-kicker">ACTIVITY / EXECUTION</p>
                <h2>Most active</h2>
                <p>Based on your executed virtual orders</p>
              </div>
              <Link href="/portfolio" className="terminal-icon-link" aria-label="View portfolio">
                <BriefcaseBusiness size={15} />
              </Link>
            </div>
            {mostActive.length ? (
              <div className="terminal-mover-list">
                {mostActive.map(([symbol, count]) => (
                  <div className="terminal-mover-row" key={symbol}>
                    <span className="terminal-mover-symbol">{symbol.slice(0, 2)}</span>
                    <span className="terminal-mover-name">
                      <strong>{symbol}</strong>
                      <small>Executed orders</small>
                    </span>
                    <span className="terminal-activity-count">{count} {count === 1 ? "order" : "orders"}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="terminal-empty-note">
                <Activity size={18} />
                <p>Your executed trades will appear here.</p>
                <Link href="/trading">Place your first order <ArrowRight size={13} /></Link>
              </div>
            )}
            <Link href="/portfolio" className="terminal-panel-link">
              Transaction history <ArrowRight size={13} />
            </Link>
          </article>
        </section>

        <section className="terminal-news-section">
          <div className="terminal-section-heading">
            <div>
              <p className="terminal-kicker">RESEARCH / REAL WORLD</p>
              <h2>Market news & intelligence</h2>
              <p>Source-grounded Indian market news · Kept separate from fictional TILT prices</p>
            </div>
            <span className="terminal-neutral-tag"><Clock3 size={12} /> SOURCED BRIEFING</span>
          </div>
          <RealMarketIntelligence />
        </section>

        <section className="terminal-card terminal-transactions-panel">
          <div className="terminal-section-heading compact">
            <div>
              <p className="terminal-kicker">ACCOUNT / RECENT EXECUTIONS</p>
              <h2>Recent transactions</h2>
              <p>Your most recent completed virtual orders</p>
            </div>
            <Link href="/portfolio" className="terminal-inline-link">
              View portfolio <ArrowRight size={13} />
            </Link>
          </div>
          {latestTransactions.length ? (
            <div className="terminal-table-scroll">
              <table className="terminal-table">
                <thead>
                  <tr>
                    <th>Instrument</th>
                    <th>Side</th>
                    <th>Quantity</th>
                    <th>Execution price</th>
                    <th>Charges</th>
                    <th>Market step</th>
                  </tr>
                </thead>
                <tbody>
                  {latestTransactions.map((transaction) => (
                    <tr key={transaction.id}>
                      <td className="font-semibold text-white">{transaction.symbol}</td>
                      <td>
                        <span className={transaction.side === "BUY" ? "terminal-side is-buy" : "terminal-side is-sell"}>
                          {transaction.side}
                        </span>
                      </td>
                      <td>{transaction.quantity.toLocaleString("en-IN")}</td>
                      <td>{money(transaction.executionPricePaise)}</td>
                      <td>{money(transaction.chargesPaise)}</td>
                      <td>#{transaction.marketStep}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="terminal-empty-transactions">
              <p>No trades yet.</p>
              <span>Make your first virtual trade to populate your execution blotter.</span>
              <Link href="/trading">Open trading <ArrowRight size={13} /></Link>
            </div>
          )}
        </section>

        <footer className="terminal-footer">
          <span>TILT FINANCIAL UNIVERSE</span>
          <span>Virtual capital only · Simulated prices · No real-money trading</span>
        </footer>
      </div>
    </main>
  );
}
