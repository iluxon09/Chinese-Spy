/**
 * Four repeatable demo scenarios that trigger each Market Mirror indicator.
 * Starting state + action sequence + expected report outcome.
 * Member 2 / 3 can replay these for consistent demos.
 */

import type { DemoScenario } from '../types/shared.js';

export const DEMO_SCENARIOS: readonly DemoScenario[] = [
  {
    id: 'demo_fomo',
    name: 'FOMO / Momentum Chasing',
    description:
      'User repeatedly buys AQUA after a sharp rise, increasing size each time, with no risk plan.',
    targetIndicator: 'fomo',
    startingCash: 1_000_000,
    startingHoldings: [],
    actions: [
      // First buy near the initial price
      { marketStep: 2, side: 'BUY', symbol: 'AQUA', quantity: 100, price: 122 },
      // After positive quarterly event (step 5 → +8 %), chase higher
      { marketStep: 6, side: 'BUY', symbol: 'AQUA', quantity: 150, price: 132 },
      // Still rising — even larger buy
      { marketStep: 7, side: 'BUY', symbol: 'AQUA', quantity: 200, price: 138 },
    ],
    eventIds: ['evt_quarterly_aquapure'],
    expectedReport: {
      indicator: 'fomo',
      status: 'detected',
      lessonId: 'decision_discipline',
    },
  },
  {
    id: 'demo_overtrading',
    name: 'Overtrading / High Turnover',
    description:
      'User places many small round-trips in a short window, generating large cumulative charges.',
    targetIndicator: 'overtrading',
    startingCash: 1_000_000,
    startingHoldings: [],
    actions: [
      { marketStep: 1, side: 'BUY', symbol: 'GREEN', quantity: 50, price: 86 },
      { marketStep: 2, side: 'SELL', symbol: 'GREEN', quantity: 50, price: 87 },
      { marketStep: 3, side: 'BUY', symbol: 'MEDIX', quantity: 30, price: 212 },
      { marketStep: 4, side: 'SELL', symbol: 'MEDIX', quantity: 30, price: 209 },
      { marketStep: 5, side: 'BUY', symbol: 'AGRO', quantity: 80, price: 46 },
      { marketStep: 6, side: 'SELL', symbol: 'AGRO', quantity: 80, price: 45.5 },
      { marketStep: 7, side: 'BUY', symbol: 'RETAIL', quantity: 40, price: 143 },
      { marketStep: 8, side: 'SELL', symbol: 'RETAIL', quantity: 40, price: 141 },
      { marketStep: 9, side: 'BUY', symbol: 'CLOUDY', quantity: 25, price: 176 },
      { marketStep: 10, side: 'SELL', symbol: 'CLOUDY', quantity: 25, price: 174 },
    ],
    eventIds: [],
    expectedReport: {
      indicator: 'overtrading',
      status: 'detected',
      lessonId: 'transaction_costs',
    },
  },
  {
    id: 'demo_concentration',
    name: 'Concentration Risk',
    description:
      'User puts the majority of capital into a single stock (FINCORP), leaving the portfolio exposed to one name.',
    targetIndicator: 'concentration',
    startingCash: 1_000_000,
    startingHoldings: [],
    actions: [
      { marketStep: 1, side: 'BUY', symbol: 'FINCORP', quantity: 10_000, price: 64 },
      // Small diversification attempt that still leaves >60 % in one name
      { marketStep: 3, side: 'BUY', symbol: 'AGRO', quantity: 500, price: 45 },
    ],
    eventIds: [],
    expectedReport: {
      indicator: 'concentration',
      status: 'detected',
      lessonId: 'diversification',
    },
  },
  {
    id: 'demo_panic_selling',
    name: 'Panic Selling after Decline',
    description:
      'User holds AQUA through a sector downturn and then sells the entire position at the low.',
    targetIndicator: 'panic_selling',
    startingCash: 1_000_000,
    startingHoldings: [
      { symbol: 'AQUA', quantity: 400, averagePrice: 125 },
    ],
    actions: [
      // Sector downturn fires at step 20 (AQUA × 0.92)
      // User panics and dumps everything
      { marketStep: 21, side: 'SELL', symbol: 'AQUA', quantity: 400, price: 112 },
    ],
    eventIds: ['evt_sector_downturn_tech'],
    expectedReport: {
      indicator: 'panic_selling',
      status: 'detected',
      lessonId: 'volatility',
    },
  },
] as const;

export function getScenarioById(id: string): DemoScenario | undefined {
  return DEMO_SCENARIOS.find((s) => s.id === id);
}

export function getAllScenarios(): readonly DemoScenario[] {
  return DEMO_SCENARIOS;
}
