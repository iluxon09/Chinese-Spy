export type MarketStock = {
  symbol: string;
  name: string;
  sector: string;
  price: number;
  change: number;
  volume: string;
  history: number[];
};

// Prototype-only prices. These are deterministic demo values, not live quotes.
export const marketStocks: MarketStock[] = [
  { symbol: "RELIANCE", name: "Reliance Industries", sector: "Energy", price: 2846.5, change: 1.82, volume: "2.4M", history: [2760, 2785, 2770, 2810, 2795, 2820, 2804, 2846] },
  { symbol: "TCS", name: "Tata Consultancy Services", sector: "Technology", price: 3921.2, change: -0.64, volume: "1.1M", history: [3970, 3955, 3968, 3940, 3950, 3932, 3945, 3921] },
  { symbol: "HDFCBANK", name: "HDFC Bank", sector: "Banking", price: 1764.8, change: 0.93, volume: "3.2M", history: [1728, 1738, 1730, 1745, 1752, 1748, 1756, 1764] },
  { symbol: "INFY", name: "Infosys", sector: "Technology", price: 1488.35, change: 2.14, volume: "1.8M", history: [1435, 1448, 1440, 1460, 1455, 1470, 1478, 1488] },
  { symbol: "ICICIBANK", name: "ICICI Bank", sector: "Banking", price: 1298.6, change: -1.12, volume: "2.7M", history: [1325, 1318, 1322, 1310, 1308, 1315, 1304, 1298] },
  { symbol: "ITC", name: "ITC", sector: "Consumer", price: 436.9, change: 0.48, volume: "980K", history: [430, 432, 431, 434, 433, 435, 434, 436] },
  { symbol: "LT", name: "Larsen & Toubro", sector: "Industrials", price: 3628.0, change: 1.26, volume: "760K", history: [3550, 3570, 3562, 3590, 3585, 3602, 3610, 3628] },
  { symbol: "BHARTIARTL", name: "Bharti Airtel", sector: "Telecom", price: 1682.4, change: -0.28, volume: "1.3M", history: [1698, 1692, 1695, 1688, 1690, 1685, 1687, 1682] },
];

export const marketIndices = [
  { name: "NIFTY 50", value: "24,812.35", change: "+0.72%", positive: true },
  { name: "SENSEX", value: "81,330.20", change: "+0.65%", positive: true },
  { name: "NIFTY BANK", value: "52,416.80", change: "−0.18%", positive: false },
];
