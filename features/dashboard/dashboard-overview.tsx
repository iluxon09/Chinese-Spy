"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Activity,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  BriefcaseBusiness,
  CalendarClock,
  ChartNoAxesCombined,
  Clock3,
  Plus,
  RefreshCw,
  Search,
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
} from "recharts";
import { useTilt } from "@/features/shared/tilt-provider";
import RealMarketIntelligence from "@/features/market/real-market-intelligence";
import {
  calculateLastCandleChange,
  calculatePercentChange,
  calculateSinceStartChange,
} from "@/lib/market/returns";

type TrendPoint = { step: string; value: number | null };

const money = (paise: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(paise / 100);

const percent = (value: number | null) =>
  value === null ? "—" : `${value > 0 ? "+" : ""}${value.toFixed(2)}%`;

const tone = (value: number | null) =>
  value === null ? "terminal-neutral" : value > 0 ? "terminal-up" : value < 0 ? "terminal-down" : "terminal-neutral";

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

function MiniTrend({
  data,
  color,
  area = false,
  label,
}: {
  data: TrendPoint[];
  color: string;
  area?: boolean;
  label: string;
}) {
  const hasData = data.filter((point) => point.value !== null).length > 1;

  if (!hasData) {
    return (
      <div className="terminal-mini-empty">
        <Activity size={14} />
        <span>Waiting for recorded candles</span>
      </div>
    );
  }

  return (
    <div className="terminal-mini-chart" role="img" aria-label={label}>
      <ResponsiveContainer width="100%" height="100%">
        {area ? (
          <AreaChart data={data}>
            <defs>
              <linearGradient id="terminalMiniArea" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.22} />
                <stop offset="100%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <Tooltip
              contentStyle={{
                background: "#101010",
                border: "1px solid #333",
                borderRadius: 6,
                color: "#eee",
                fontSize: 10,
              }}
              labelStyle={{ color: "#888" }}
              formatter={(value) => [value === null ? "No data" : `${Number(value).toFixed(2)}%`, label]}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke={color}
              strokeWidth={1.6}
              fill="url(#terminalMiniArea)"
              connectNulls={false}
              dot={false}
              isAnimationActive={false}
            />
          </AreaChart>
        ) : (
          <LineChart data={data}>
            <Tooltip
              contentStyle={{
                background: "#101010",
                border: "1px solid #333",
                borderRadius: 6,
                color: "#eee",
                fontSize: 10,
              }}
              labelStyle={{ color: "#888" }}
              formatter={(value) => [value === null ? "No data" : `${Number(value).toFixed(2)}%`, label]}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke={color}
              strokeWidth={1.6}
              dot={false}
              connectNulls={false}
              isAnimationActive={false}
            />
          </LineChart>
        )}
      </ResponsiveContainer>
    </div>
  );
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
          step: `#${point.market_step}`,
          value: calculatePercentChange(point.pricePaise, company.initialPricePaise),
        })),
      };
    });
  }, [histories, market]);

  const analytics = useMemo(() => {
    if (marketRows.length === 0) {
      return {
        composite: [] as TrendPoint[],
        breadth: [] as TrendPoint[],
        volatility: [] as TrendPoint[],
        currentAdvances: 0,
        currentDeclines: 0,
        currentUnchanged: 0,
        currentSamples: 0,
      };
    }

    const historyBySymbol = new Map<string, Map<number, number>>();
    const steps = new Set<number>([0]);

    for (const company of marketRows) {
      const byStep = new Map<number, number>();
      for (const point of histories[company.symbol] ?? []) {
        if (
          Number.isSafeInteger(point.market_step) &&
          Number.isFinite(point.pricePaise) &&
          point.pricePaise > 0
        ) {
          byStep.set(point.market_step, point.pricePaise);
          steps.add(point.market_step);
        }
      }
      historyBySymbol.set(company.symbol, byStep);
    }

    const orderedSteps = [...steps].sort((a, b) => a - b);
    const composite: TrendPoint[] = [];
    const breadth: TrendPoint[] = [];
    const volatility: TrendPoint[] = [];
    let currentAdvances = 0;
    let currentDeclines = 0;
    let currentUnchanged = 0;
    let currentSamples = 0;

    for (const step of orderedSteps) {
      if (step === 0) {
        composite.push({ step: "#0", value: 0 });
        continue;
      }

      const totalReturns: number[] = [];
      const candleReturns: number[] = [];
      let advances = 0;
      let declines = 0;
      let unchanged = 0;

      for (const company of marketRows) {
        const byStep = historyBySymbol.get(company.symbol);
        const currentPrice = byStep?.get(step);
        const previousPrice =
          step === 1
            ? company.initialPricePaise
            : byStep?.get(step - 1);

        if (currentPrice === undefined) continue;

        const sinceStart = calculatePercentChange(
          currentPrice,
          company.initialPricePaise,
        );
        if (sinceStart !== null) totalReturns.push(sinceStart);

        if (previousPrice === undefined) continue;
        const candleReturn = calculatePercentChange(currentPrice, previousPrice);
        if (candleReturn === null) continue;

        candleReturns.push(candleReturn);
        if (candleReturn > 0) advances += 1;
        else if (candleReturn < 0) declines += 1;
        else unchanged += 1;
      }

      composite.push({
        step: `#${step}`,
        value: totalReturns.length === marketRows.length
          ? totalReturns.reduce((sum, value) => sum + value, 0) / totalReturns.length
          : null,
      });

      breadth.push({
        step: `#${step}`,
        value: candleReturns.length > 0 ? advances - declines : null,
      });

      // RMS one-candle return is a transparent realised-movement measure,
      // not an implied VIX or a forecast of future volatility.
      volatility.push({
        step: `#${step}`,
        value: candleReturns.length > 0
          ? Math.sqrt(
              candleReturns.reduce((sum, value) => sum + value * value, 0) /
                candleReturns.length,
            )
          : null,
      });

      if (step === orderedSteps[orderedSteps.length - 1]) {
        currentAdvances = advances;
        currentDeclines = declines;
        currentUnchanged = unchanged;
        currentSamples = candleReturns.length;
      }
    }

    return {
      composite,
      breadth,
      volatility,
      currentAdvances,
      currentDeclines,
      currentUnchanged,
      currentSamples,
    };
  }, [histories, marketRows]);

  const sectorStats = useMemo(() => {
    const groups = new Map<string, { total: number; count: number }>();

    for (const company of marketRows) {
      if (company.scenarioChange === null) continue;
      const current = groups.get(company.sector) ?? { total: 0, count: 0 };
      current.total += company.scenarioChange;
      current.count += 1;
      groups.set(company.sector, current);
    }

    return [...groups.entries()]
      .map(([sector, values]) => ({
        sector,
        change: values.count ? values.total / values.count : null,
      }))
      .sort((a, b) => (b.change ?? -Infinity) - (a.change ?? -Infinity));
  }, [marketRows]);

  const movers = useMemo(
    () => [...marketRows].sort(
      (a, b) => (b.scenarioChange ?? -Infinity) - (a.scenarioChange ?? -Infinity),
    ),
    [marketRows],
  );
  const topGainer = movers.find((company) => company.scenarioChange !== null) ?? null;
  const topLaggard = [...movers].reverse().find((company) => company.scenarioChange !== null) ?? null;

  const positionRows = useMemo(() => {
    if (!portfolio) return [];
    return portfolio.snapshot.holdings
      .filter((holding) => holding.quantity > 0)
      .slice()
      .sort((a, b) => b.marketValuePaise - a.marketValuePaise)
      .slice(0, 5);
  }, [portfolio]);

  const mostActive = useMemo(() => {
    if (!portfolio) return [];
    return Object.entries(
      portfolio.transactions.reduce<Record<string, number>>((counts, transaction) => {
        counts[transaction.symbol] = (counts[transaction.symbol] ?? 0) + 1;
        return counts;
      }, {}),
    )
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [portfolio]);

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
  const compositeCurrent = analytics.composite.length
    ? analytics.composite[analytics.composite.length - 1].value
    : null;
  const volatilityCurrent = analytics.volatility.length
    ? analytics.volatility[analytics.volatility.length - 1].value
    : null;
  const largestSectorMove = Math.max(
    0.25,
    ...sectorStats.map((item) => Math.abs(item.change ?? 0)),
  );
  const latestTransactions = [...portfolio.transactions].slice(-6).reverse();
  const marketWatch = marketRows.slice(0, 5);

  const metricCards = [
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
      <div className="terminal-dashboard-inner terminal-dashboard-dense">
        <header className="terminal-page-heading terminal-market-heading">
          <div>
            <p className="terminal-kicker">TILT / FINANCIAL UNIVERSE</p>
            <h1>Welcome, Trader</h1>
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
          <div className="terminal-page-actions terminal-market-actions">
            <Link href="/coach" className="terminal-secondary-button">
              <Plus size={14} /> Create research
            </Link>
            <Link href="/markets" className="terminal-secondary-button">
              <Search size={14} /> Search ticker
            </Link>
            <button
              type="button"
              onClick={startNewSimulation}
              disabled={creating}
              className="terminal-primary-button"
            >
              <Plus size={14} />
              {creating ? "Creating…" : "New simulation"}
            </button>
          </div>
        </header>

        <nav className="terminal-dashboard-tabs" aria-label="Dashboard sections">
          <a className="is-active" href="#terminal-analytics">Overview</a>
          <a href="#terminal-market-overview">Market overview</a>
          <a href="#terminal-market-news">Research & news</a>
          <Link href="/simulator"><CalendarClock size={12} /> Simulator</Link>
        </nav>

        {actionMessage && <p role="status" className="terminal-notice">{actionMessage}</p>}
        {error && <p role="alert" className="terminal-error">{error}</p>}

        <section className="terminal-metric-strip" aria-label="Portfolio summary">
          {metricCards.map((card) => {
            const Icon = card.icon;
            return (
              <article className="terminal-card terminal-metric-chip" key={card.label}>
                <span className="terminal-metric-icon"><Icon size={14} /></span>
                <div className="terminal-metric-copy">
                  <span>{card.label}</span>
                  <strong>{card.value}</strong>
                  <small className={card.pnl ? tone(snapshot.totalPnlPaise) : ""}>{card.detail}</small>
                </div>
              </article>
            );
          })}
        </section>

        <section id="terminal-analytics" className="terminal-six-grid" aria-label="Market analytics">
          <article className="terminal-card terminal-analytics-card">
            <div className="terminal-analytics-heading">
              <div>
                <p className="terminal-analytics-label">TILT COMPOSITE</p>
                <h2 className={tone(compositeCurrent)}>{percent(compositeCurrent)}</h2>
              </div>
              <span className="terminal-analytics-icon"><ChartNoAxesCombined size={15} /></span>
            </div>
            <MiniTrend data={analytics.composite} color="#73a7ff" area label="Equal-weighted TILT composite return" />
            <p className="terminal-analytics-foot">Equal-weighted · Opening level 0%</p>
          </article>

          <article className="terminal-card terminal-analytics-card">
            <div className="terminal-analytics-heading">
              <div>
                <p className="terminal-analytics-label">MARKET BREADTH</p>
                <h2>
                  <span className="terminal-up">{analytics.currentAdvances} ↑</span>
                  <span className="terminal-separator">/</span>
                  <span className="terminal-down">{analytics.currentDeclines} ↓</span>
                </h2>
              </div>
              <span className="terminal-analytics-icon"><Activity size={15} /></span>
            </div>
            <MiniTrend data={analytics.breadth} color="#d7a45c" label="Net advancing versus declining TILT stocks" />
            <p className="terminal-analytics-foot">{analytics.currentSamples} of {marketRows.length} stocks with adjacent candles</p>
          </article>

          <article className="terminal-card terminal-analytics-card">
            <div className="terminal-analytics-heading">
              <div>
                <p className="terminal-analytics-label">REALISED MOVE</p>
                <h2>{volatilityCurrent === null ? "—" : `${volatilityCurrent.toFixed(2)}%`}</h2>
              </div>
              <span className="terminal-analytics-icon"><Activity size={15} /></span>
            </div>
            <MiniTrend data={analytics.volatility} color="#c0c0c0" label="Root mean square one-candle stock return" />
            <p className="terminal-analytics-foot">RMS move per candle · Not a VIX forecast</p>
          </article>

          <article className="terminal-card terminal-analytics-card terminal-sector-card">
            <div className="terminal-analytics-heading">
              <div>
                <p className="terminal-analytics-label">SECTOR PULSE</p>
                <h2>{sectorStats.length} sectors</h2>
              </div>
              <span className="terminal-analytics-icon"><BarChart3 size={15} /></span>
            </div>
            <div className="terminal-sector-bars">
              {sectorStats.slice(0, 4).map((item) => (
                <div className="terminal-sector-row" key={item.sector}>
                  <span title={item.sector}>{item.sector}</span>
                  <div className="terminal-sector-track">
                    <i
                      className={(item.change ?? 0) >= 0 ? "is-up" : "is-down"}
                      style={{ width: `${Math.max(3, Math.min(100, Math.abs(item.change ?? 0) / largestSectorMove * 100))}%` }}
                    />
                  </div>
                  <strong className={tone(item.change)}>{percent(item.change)}</strong>
                </div>
              ))}
              {!sectorStats.length && <p className="terminal-mini-placeholder">Sector data unavailable</p>}
            </div>
            <p className="terminal-analytics-foot">Average return by fictional sector</p>
          </article>

          <article className="terminal-card terminal-analytics-card terminal-mover-card">
            <div className="terminal-analytics-heading">
              <div>
                <p className="terminal-analytics-label">TOP GAINER</p>
                <h2>{topGainer?.symbol ?? "—"}</h2>
              </div>
              <span className="terminal-mover-pill is-up">{percent(topGainer?.scenarioChange ?? null)}</span>
            </div>
            {topGainer ? (
              <>
                <MiniTrend data={topGainer.chart} color="#42d7a4" label={`${topGainer.symbol} price return since scenario start`} />
                <p className="terminal-analytics-foot">{topGainer.name}</p>
              </>
            ) : <p className="terminal-mini-placeholder">Returns appear after price data loads</p>}
          </article>

          <article className="terminal-card terminal-analytics-card terminal-mover-card">
            <div className="terminal-analytics-heading">
              <div>
                <p className="terminal-analytics-label">TOP LAGGARD</p>
                <h2>{topLaggard?.symbol ?? "—"}</h2>
              </div>
              <span className="terminal-mover-pill is-down">{percent(topLaggard?.scenarioChange ?? null)}</span>
            </div>
            {topLaggard ? (
              <>
                <MiniTrend data={topLaggard.chart} color="#ff747e" label={`${topLaggard.symbol} price return since scenario start`} />
                <p className="terminal-analytics-foot">{topLaggard.name}</p>
              </>
            ) : <p className="terminal-mini-placeholder">Returns appear after price data loads</p>}
          </article>
        </section>

        <section id="terminal-market-overview" className="terminal-workspace-grid">
          <article className="terminal-card terminal-market-table-panel">
            <div className="terminal-workspace-heading">
              <div>
                <p className="terminal-analytics-label">EQUITIES / SIMULATION</p>
                <h2>Market overview</h2>
                <p>All fictional instruments · Step {market.marketStep.toLocaleString("en-IN")}</p>
              </div>
              <Link href="/markets" className="terminal-panel-action">Open market <ArrowUpRight size={13} /></Link>
            </div>
            <div className="terminal-overview-table-scroll">
              <table className="terminal-overview-table">
                <thead>
                  <tr>
                    <th>Instrument</th>
                    <th>Price</th>
                    <th>Last candle</th>
                    <th>Since start</th>
                  </tr>
                </thead>
                <tbody>
                  {marketRows.map((company) => (
                    <tr key={company.symbol}>
                      <td>
                        <Link href="/markets" className="terminal-table-instrument">
                          <strong>{company.symbol}</strong>
                          <small>{company.name}</small>
                        </Link>
                      </td>
                      <td className="terminal-table-price">{money(company.currentPrice)}</td>
                      <td className={tone(company.candleChange)}>{percent(company.candleChange)}</td>
                      <td className={tone(company.scenarioChange)}>{percent(company.scenarioChange)}</td>
                    </tr>
                  ))}
                  {marketRows.length === 0 && (
                    <tr><td colSpan={4} className="terminal-table-empty">No market instruments are available.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="terminal-breadth-summary">
              <span><i className="is-up" /> {analytics.currentAdvances} advancing</span>
              <span><i className="is-down" /> {analytics.currentDeclines} declining</span>
              <span><i className="is-flat" /> {analytics.currentUnchanged} unchanged</span>
            </div>
          </article>

          <article className="terminal-card terminal-side-list-panel">
            <div className="terminal-workspace-heading">
              <div>
                <p className="terminal-analytics-label">{positionRows.length ? "PORTFOLIO / POSITIONS" : "EQUITIES / WATCH"}</p>
                <h2>{positionRows.length ? "Your positions" : "Market watch"}</h2>
                <p>{positionRows.length ? "Open virtual holdings" : "Selected TILT instruments"}</p>
              </div>
              <Link href={positionRows.length ? "/portfolio" : "/markets"} className="terminal-small-icon-link" aria-label="Open positions or market">
                <ArrowUpRight size={14} />
              </Link>
            </div>
            <div className="terminal-side-list">
              {positionRows.length ? positionRows.map((holding) => {
                const company = marketRows.find((item) => item.symbol === holding.symbol);
                const change = company?.scenarioChange ?? null;
                return (
                  <div className="terminal-side-row" key={holding.symbol}>
                    <span className="terminal-ticker-avatar">{holding.symbol.slice(0, 2)}</span>
                    <span className="terminal-side-name">
                      <strong>{holding.symbol}</strong>
                      <small>{holding.quantity.toLocaleString("en-IN")} shares</small>
                    </span>
                    <span className={tone(change)}>{percent(change)}</span>
                  </div>
                );
              }) : marketWatch.map((company) => (
                <div className="terminal-side-row" key={company.symbol}>
                  <span className="terminal-ticker-avatar">{company.symbol.slice(0, 2)}</span>
                  <span className="terminal-side-name">
                    <strong>{company.symbol}</strong>
                    <small>{company.name}</small>
                  </span>
                  <span className={tone(company.scenarioChange)}>{percent(company.scenarioChange)}</span>
                </div>
              ))}
              {!positionRows.length && !marketWatch.length && (
                <p className="terminal-mini-placeholder">No instruments to display.</p>
              )}
            </div>
            <Link href={positionRows.length ? "/portfolio" : "/markets"} className="terminal-panel-action">
              {positionRows.length ? "Portfolio details" : "Full watchlist"} <ArrowRight size={12} />
            </Link>
          </article>

          <article className="terminal-card terminal-side-list-panel terminal-most-active-panel">
            <div className="terminal-workspace-heading">
              <div>
                <p className="terminal-analytics-label">TRADING / ACTIVITY</p>
                <h2>Most active</h2>
                <p>Ranked by your executed orders</p>
              </div>
              <Link href="/trading" className="terminal-small-icon-link" aria-label="Open trading">
                <Activity size={14} />
              </Link>
            </div>
            {mostActive.length ? (
              <div className="terminal-side-list">
                {mostActive.map(([symbol, count]) => {
                  const company = marketRows.find((item) => item.symbol === symbol);
                  return (
                    <div className="terminal-side-row" key={symbol}>
                      <span className="terminal-ticker-avatar">{symbol.slice(0, 2)}</span>
                      <span className="terminal-side-name">
                        <strong>{symbol}</strong>
                        <small>{company?.name ?? "TILT instrument"}</small>
                      </span>
                      <span className="terminal-order-count">{count} {count === 1 ? "order" : "orders"}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="terminal-side-empty">
                <Activity size={18} />
                <p>No executed trades yet.</p>
                <Link href="/trading">Place first order <ArrowRight size={12} /></Link>
              </div>
            )}
            <Link href="/portfolio" className="terminal-panel-action">
              Transaction history <ArrowRight size={12} />
            </Link>
          </article>

          <article id="terminal-market-news" className="terminal-card terminal-news-panel">
            <div className="terminal-workspace-heading">
              <div>
                <p className="terminal-analytics-label">RESEARCH / REAL WORLD</p>
                <h2>Market news</h2>
                <p>Verified Indian market briefing</p>
              </div>
              <span className="terminal-news-live"><span /> SOURCED</span>
            </div>
            <RealMarketIntelligence compact />
          </article>
        </section>

        <section className="terminal-bottom-bar">
          <div><span className="terminal-status-dot" /> Shared simulation · Step {market.marketStep}</div>
          <div>Real-market research is informational only · Virtual capital · No real-money trading</div>
          <div className="terminal-bottom-links">
            <Link href="/simulator"><Clock3 size={12} /> Playback</Link>
            <Link href="/coach"><ChartNoAxesCombined size={12} /> Risk coach</Link>
          </div>
        </section>
      </div>
    </main>
  );
}
