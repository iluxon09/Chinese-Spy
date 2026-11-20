/**
 * Scripted market events for the TILT simulator.
 * Member 1 uses these definitions; price multipliers are deterministic.
 */

import type { MarketEvent } from '../types/shared';

export const MARKET_EVENTS: readonly MarketEvent[] = [
  {
    id: 'evt_quarterly_aquapure',
    marketStep: 5,
    headline: 'AquaPure reports better-than-expected Q3 numbers',
    narrative:
      'AquaPure Technologies beat revenue estimates by 12 % on strong demand for its new IoT filter range. Management raised full-year guidance.',
    impacts: [{ symbol: 'AQUA', priceMultiplier: 1.08 }],
  },
  {
    id: 'evt_regulatory_fincorp',
    marketStep: 8,
    headline: 'RBI tightens norms for microfinance lenders',
    narrative:
      'The central bank announced higher capital requirements and stricter collection practices for the microfinance sector. FinCorp and peers sold off on the news.',
    impacts: [{ symbol: 'FINCORP', priceMultiplier: 0.88 }],
  },
  {
    id: 'evt_raw_material_steelx',
    marketStep: 12,
    headline: 'Coking coal prices surge 18 % on supply disruption',
    narrative:
      'A major export restriction in Australia pushed coking-coal prices higher. SteelX warned of margin pressure in the near term.',
    impacts: [{ symbol: 'STEELX', priceMultiplier: 0.91 }],
  },
  {
    id: 'evt_major_contract_infra',
    marketStep: 15,
    headline: 'InfraBuild wins ₹2,400 Cr metro package',
    narrative:
      'InfraBuild Projects emerged as the lowest bidder for a key metro corridor. The order book now covers more than 3 years of revenue.',
    impacts: [{ symbol: 'INFRA', priceMultiplier: 1.14 }],
  },
  {
    id: 'evt_sector_downturn_tech',
    marketStep: 20,
    headline: 'Global tech sell-off hits Indian IT and SaaS names',
    narrative:
      'A sharp correction in US tech indices spilled into Indian markets. CloudySoft and AquaPure both declined with the sector.',
    impacts: [
      { symbol: 'CLOUDY', priceMultiplier: 0.87 },
      { symbol: 'AQUA', priceMultiplier: 0.92 },
    ],
  },
  {
    id: 'evt_positive_economy',
    marketStep: 25,
    headline: 'GDP growth prints above consensus; markets cheer',
    narrative:
      'India’s quarterly GDP growth surprised on the upside. Cyclical sectors including Industrials, Financials and Consumer Discretionary led the rally.',
    impacts: [
      { symbol: 'INFRA', priceMultiplier: 1.05 },
      { symbol: 'FINCORP', priceMultiplier: 1.06 },
      { symbol: 'RETAIL', priceMultiplier: 1.04 },
      { symbol: 'STEELX', priceMultiplier: 1.03 },
    ],
  },
  {
    id: 'evt_medix_trial',
    marketStep: 10,
    headline: 'MediX receives regulatory clearance for new diagnostic panel',
    narrative:
      'MediX Diagnostics obtained approval for its multi-disease rapid panel, opening a large public-health tender opportunity.',
    impacts: [{ symbol: 'MEDIX', priceMultiplier: 1.11 }],
  },
  {
    id: 'evt_agro_weather',
    marketStep: 18,
    headline: 'Favourable monsoon outlook lifts agri logistics stocks',
    narrative:
      'Meteorological department forecast a normal-to-above-normal monsoon. AgroLink Supply, which benefits from higher produce volumes, advanced.',
    impacts: [{ symbol: 'AGRO', priceMultiplier: 1.07 }],
  },
] as const;

export function getEventById(id: string): MarketEvent | undefined {
  return MARKET_EVENTS.find((e) => e.id === id);
}

export function getEventsUpToStep(marketStep: number): MarketEvent[] {
  return MARKET_EVENTS.filter((e) => e.marketStep <= marketStep);
}
