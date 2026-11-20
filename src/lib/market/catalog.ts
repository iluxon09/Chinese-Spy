import type { Company, MarketEvent } from "../domain/types";

/** Fictional companies only. These are not listed securities or investment recommendations. */
export const COMPANIES: Company[] = [
  { symbol: "ASTE", name: "Aster Energy", sector: "Energy", description: "Renewable power and grid storage developer.", initialPricePaise: 10_000 },
  { symbol: "NVMT", name: "Nova Motors", sector: "Automobile", description: "Electric two-wheeler and compact mobility manufacturer.", initialPricePaise: 20_000 },
  { symbol: "BGTC", name: "BlueGrid Technologies", sector: "Technology", description: "Cloud infrastructure and enterprise software provider.", initialPricePaise: 15_000 },
  { symbol: "HVFD", name: "Harvest Foods", sector: "FMCG", description: "Packaged foods and everyday consumer products company.", initialPricePaise: 8_500 },
  { symbol: "ZNFC", name: "Zenith Finance", sector: "Financial Services", description: "Digital lending and financial services company.", initialPricePaise: 12_500 },
  { symbol: "MEDX", name: "MedAxis Life", sector: "Healthcare", description: "Diagnostics and medical technology network.", initialPricePaise: 18_000 },
  { symbol: "URBN", name: "UrbanNest Realty", sector: "Real Estate", description: "Residential and commercial property developer.", initialPricePaise: 9_000 },
  { symbol: "LOGX", name: "LogiX Networks", sector: "Industrials", description: "Warehousing and supply-chain logistics operator.", initialPricePaise: 11_000 },
];

/** Scripted demo events. Replaying the same scenario and marketStep gives the same prices. */
export const DEMO_MARKET_EVENTS: MarketEvent[] = [
  {
    id: "evt-001", scenarioId: "tilt-demo-v1", marketStep: 1,
    title: "Strong quarterly results", description: "Aster Energy reports better-than-expected quarterly performance.",
    symbol: "ASTE", effectBps: 800,
  },
  {
    id: "evt-002", scenarioId: "tilt-demo-v1", marketStep: 2,
    title: "Sector-wide funding pressure", description: "A slowdown in new lending affects financial services companies.",
    sector: "Financial Services", effectBps: -500,
  },
  {
    id: "evt-003", scenarioId: "tilt-demo-v1", marketStep: 3,
    title: "Major supply contract", description: "Nova Motors secures a large fleet supply contract.",
    symbol: "NVMT", effectBps: 700,
  },
  {
    id: "evt-004", scenarioId: "tilt-demo-v1", marketStep: 4,
    title: "Technology sector correction", description: "A broad valuation reset affects technology shares.",
    sector: "Technology", effectBps: -600,
  },
  {
    id: "evt-005", scenarioId: "tilt-demo-v1", marketStep: 5,
    title: "Input-cost relief", description: "Lower logistics and packaging costs support consumer companies.",
    sector: "FMCG", effectBps: 350,
  },
];
