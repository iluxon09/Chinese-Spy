"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowDownRight,
  ArrowUpRight,
  Activity,
  BriefcaseBusiness,
  ChartNoAxesCombined,
  Plus,
  Wallet,
} from "lucide-react";
import { useTilt } from "@/features/shared/tilt-provider";

const money = (paise: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(paise / 100);

const compactMoney = (rupees: number) =>
  new Intl.NumberFormat("en-IN", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(rupees);

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
  } = useTilt();
  const [creating, setCreating] = useState(false);
  const [actionMessage, setActionMessage] = useState("");

  async function startNewSimulation() {
    setCreating(true);
    setActionMessage("");
    try {
      const id = await createSession();
      setActionMessage("New simulation created: " + id.slice(0, 8));
    } catch (e) {
      setActionMessage(e instanceof Error ? e.message : "Could not create simulation.");
    } finally {
      setCreating(false);
    }
  }

  if (loading) {
    return (
      <main className="dashboard-state">
        <span className="dashboard-state-kicker">TILT / FINANCIAL UNIVERSE</span>
        <p>Loading your portfolio…</p>
      </main>
    );
  }

  if (!authenticated) {
    return (
      <main className="dashboard-state">
        <span className="dashboard-state-kicker">TILT / FINANCIAL UNIVERSE</span>
        <h1>Make your next move count.</h1>
        <p>{error || "Sign in to begin your simulation."}</p>
        <Link className="dashboard-primary-link" href="/login">Sign in / Create account</Link>
      </main>
    );
  }

  if (!portfolio || !market) {
    return (
      <main className="dashboard-state">
        <span className="dashboard-state-kicker">TILT / FINANCIAL UNIVERSE</span>
        <p role="alert">{error || "Portfolio unavailable"}</p>
      </main>
    );
  }

  const snapshot = portfolio.snapshot;
  const lead = market.companies[0];
  const chart = (lead ? histories[lead.symbol] ?? [] : []).map((point) => ({
    step: `Step ${point.market_step}`,
    price: point.pricePaise / 100,
  }));
  const cards = [
    { label: "Portfolio value", value: money(snapshot.portfolioValuePaise), icon: Wallet, detail: "Cash + holdings" },
    { label: "Invested capital", value: money(snapshot.investedAmountPaise), icon: BriefcaseBusiness, detail: "Total cost of open positions" },
    { label: "Available cash", value: money(snapshot.cashBalancePaise), icon: Activity, detail: "Ready to deploy" },
    { label: "Total P&L", value: money(snapshot.totalPnlPaise), icon: ChartNoAxesCombined, detail: `${snapshot.returnPercent >= 0 ? "+" : ""}${snapshot.returnPercent.toFixed(2)}% overall return`, pnl: true },
  ];

  return (
    <main className="dashboard-page">
      <header className="dashboard-topbar">
        <div>
          <div className="dashboard-breadcrumb">Workspace <span>/</span> Overview</div>
          <h1>Dashboard</h1>
          <p className="dashboard-session-meta">
            <span className="dashboard-live-dot" />
            Simulation <strong>{sessionId?.slice(0, 8) ?? "—"}</strong>
            <span className="dashboard-meta-divider" />
            Market step <strong>{market.marketStep}</strong>
          </p>
        </div>
        <button
          type="button"
          onClick={startNewSimulation}
          disabled={creating}
          className="dashboard-primary-button"
        >
          <Plus size={16} strokeWidth={2.4} />
          {creating ? "Creating…" : "New simulation"}
        </button>
      </header>

      {actionMessage && <p role="status" className="dashboard-notice">{actionMessage}</p>}

      <div className="dashboard-content">
        <section className="dashboard-intro">
          <div>
            <p className="dashboard-eyebrow">YOUR MONEY, IN MOTION</p>
            <h2>Good to see you back.</h2>
            <p>A clear view of your virtual portfolio, market activity and investment decisions.</p>
          </div>
          <Link href="/markets" className="dashboard-text-link">
            Explore markets <ArrowUpRight size={15} />
          </Link>
        </section>

        <section className="dashboard-metrics" aria-label="Portfolio summary">
          {cards.map((card) => {
            const Icon = card.icon;
            return (
              <article className="dashboard-metric" key={card.label}>
                <div className="dashboard-metric-top">
                  <span>{card.label}</span>
                  <Icon size={17} aria-hidden="true" />
                </div>
                <p className="dashboard-metric-value">{card.value}</p>
                <p className={card.pnl ? `dashboard-metric-detail ${snapshot.totalPnlPaise >= 0 ? "is-positive" : "is-negative"}` : "dashboard-metric-detail"}>
                  {card.pnl && (snapshot.totalPnlPaise >= 0 ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />)}
                  {card.detail}
                </p>
              </article>
            );
          })}
        </section>

        <section className="dashboard-main-grid">
          <article className="dashboard-panel dashboard-chart-panel">
            <div className="dashboard-panel-heading">
              <div>
                <p className="dashboard-section-label">MARKET ACTIVITY</p>
                <h3>Price history <span>{lead ? lead.symbol : ""}</span></h3>
                <p>Recorded simulated market prices by market step.</p>
              </div>
              <span className="dashboard-panel-tag">HISTORY</span>
            </div>
            <div className="dashboard-chart">
              {chart.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chart} margin={{ top: 12, right: 8, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="tiltPriceFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#42c9a0" stopOpacity={0.22} />
                        <stop offset="95%" stopColor="#42c9a0" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="#243143" strokeDasharray="3 5" vertical={false} />
                    <XAxis dataKey="step" axisLine={false} tickLine={false} tick={{ fill: "#78879a", fontSize: 11 }} minTickGap={28} />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      width={58}
                      tick={{ fill: "#78879a", fontSize: 11 }}
                      tickFormatter={(value: number) => `₹${compactMoney(value)}`}
                      domain={["auto", "auto"]}
                    />
                    <Tooltip
                      contentStyle={{ background: "#111d2b", border: "1px solid #2a3a4d", borderRadius: 8, color: "#edf4f7", fontSize: 12 }}
                      labelStyle={{ color: "#93a3b5", marginBottom: 4 }}
                      formatter={(value) => [money(Number(value) * 100), "Price"]}
                    />
                    <Area type="monotone" dataKey="price" stroke="#42c9a0" strokeWidth={2} fill="url(#tiltPriceFill)" activeDot={{ r: 4, fill: "#42c9a0", stroke: "#0d1724", strokeWidth: 2 }} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="dashboard-empty-chart">
                  <Activity size={22} />
                  <span>Price history will appear after market activity.</span>
                </div>
              )}
            </div>
            <p className="dashboard-chart-footnote">Source: persisted simulation price history · Not live exchange data</p>
          </article>

          <article className="dashboard-panel dashboard-watch-panel">
            <div className="dashboard-panel-heading">
              <div>
                <p className="dashboard-section-label">KEEP AN EYE ON</p>
                <h3>Market watch</h3>
                <p>Selected companies in your universe.</p>
              </div>
              <Link href="/markets" className="dashboard-icon-link" aria-label="View all markets">
                <ArrowUpRight size={17} />
              </Link>
            </div>
            <div className="dashboard-watch-list">
              {market.companies.slice(0, 5).map((company) => (
                <div className="dashboard-watch-row" key={company.symbol}>
                  <div className="dashboard-company-symbol">{company.symbol.slice(0, 2)}</div>
                  <div className="dashboard-company-name">
                    <strong>{company.symbol}</strong>
                    <span>{company.name}</span>
                  </div>
                  <div className="dashboard-company-price">
                    <strong>{money(company.currentPrice?.pricePaise ?? company.initialPricePaise)}</strong>
                    <span>{company.sector}</span>
                  </div>
                </div>
              ))}
            </div>
            <Link href="/markets" className="dashboard-panel-footer-link">
              View all companies <ArrowUpRight size={14} />
            </Link>
          </article>
        </section>

        <section className="dashboard-panel dashboard-transactions">
          <div className="dashboard-panel-heading dashboard-transactions-heading">
            <div>
              <p className="dashboard-section-label">ACCOUNT ACTIVITY</p>
              <h3>Recent transactions</h3>
              <p>Your latest executed virtual orders.</p>
            </div>
            <Link href="/portfolio" className="dashboard-text-link">
              Full portfolio <ArrowUpRight size={15} />
            </Link>
          </div>
          {portfolio.transactions.length === 0 ? (
            <div className="dashboard-empty-transactions">
              <p>No transactions yet.</p>
              <span>When you place your first virtual order, it will appear here.</span>
              <Link href="/trading">Go to trading <ArrowUpRight size={14} /></Link>
            </div>
          ) : (
            <div className="dashboard-table-wrap">
              <table className="dashboard-table">
                <thead>
                  <tr>
                    <th>Company</th>
                    <th>Side</th>
                    <th>Quantity</th>
                    <th>Execution price</th>
                    <th>Charges</th>
                    <th>Market step</th>
                  </tr>
                </thead>
                <tbody>
                  {portfolio.transactions.slice(-5).reverse().map((transaction) => (
                    <tr key={transaction.id}>
                      <td className="dashboard-table-symbol">{transaction.symbol}</td>
                      <td><span className={transaction.side === "BUY" ? "dashboard-side is-buy" : "dashboard-side is-sell"}>{transaction.side}</span></td>
                      <td>{transaction.quantity}</td>
                      <td>{money(transaction.executionPricePaise)}</td>
                      <td>{money(transaction.chargesPaise)}</td>
                      <td>#{transaction.marketStep}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <footer className="dashboard-disclaimer">
          <span>SIMULATION ENVIRONMENT</span>
          <span>Virtual capital only · No real-money trading</span>
        </footer>
      </div>
    </main>
  );
}
