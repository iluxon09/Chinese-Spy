/**
 * Fictional companies for the TILT simulator.
 * Coordinate with Member 1 — these are the seed data they can import.
 */

import type { FictionalCompany } from '../types/shared';

export const FICTIONAL_COMPANIES: readonly FictionalCompany[] = [
  {
    symbol: 'AQUA',
    name: 'AquaPure Technologies',
    sector: 'Technology',
    description: 'Water-purification IoT devices and smart filters for urban households.',
    initialPrice: 120.0,
  },
  {
    symbol: 'GREEN',
    name: 'GreenVolt Energy',
    sector: 'Energy',
    description: 'Rooftop solar panels and small-scale battery storage systems.',
    initialPrice: 85.5,
  },
  {
    symbol: 'MEDIX',
    name: 'MediX Diagnostics',
    sector: 'Healthcare',
    description: 'Affordable diagnostic kits and tele-medicine platform for tier-2 cities.',
    initialPrice: 210.0,
  },
  {
    symbol: 'FINCORP',
    name: 'FinCorp Microfinance',
    sector: 'Financials',
    description: 'Micro-lending and digital payments for under-banked segments.',
    initialPrice: 64.25,
  },
  {
    symbol: 'AGRO',
    name: 'AgroLink Supply',
    sector: 'Consumer Staples',
    description: 'Farm-to-retail logistics and cold-chain for perishable produce.',
    initialPrice: 45.0,
  },
  {
    symbol: 'STEELX',
    name: 'SteelX Industries',
    sector: 'Materials',
    description: 'Specialty steel and alloy products for infrastructure projects.',
    initialPrice: 320.0,
  },
  {
    symbol: 'CLOUDY',
    name: 'CloudySoft Solutions',
    sector: 'Technology',
    description: 'SaaS collaboration tools for remote and hybrid teams.',
    initialPrice: 175.0,
  },
  {
    symbol: 'PHARMA',
    name: 'PharmaNova Labs',
    sector: 'Healthcare',
    description: 'Generic formulations and contract research organisation services.',
    initialPrice: 98.75,
  },
  {
    symbol: 'RETAIL',
    name: 'RetailSphere India',
    sector: 'Consumer Discretionary',
    description: 'Omnichannel fashion and lifestyle retail chain.',
    initialPrice: 142.0,
  },
  {
    symbol: 'INFRA',
    name: 'InfraBuild Projects',
    sector: 'Industrials',
    description: 'Highway, metro and urban infrastructure EPC contractor.',
    initialPrice: 55.5,
  },
] as const;

export function getCompanyBySymbol(symbol: string): FictionalCompany | undefined {
  return FICTIONAL_COMPANIES.find((c) => c.symbol === symbol.toUpperCase());
}

export function getCompaniesBySector(sector: string): FictionalCompany[] {
  return FICTIONAL_COMPANIES.filter(
    (c) => c.sector.toLowerCase() === sector.toLowerCase(),
  );
}
