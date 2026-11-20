export type MarketStock = {
  symbol:string; name:string; sector:string; price:number; pricePaise:number;
  change:number; description:string; history:number[];
};
// Live company, price and history data are supplied by useTilt() from authenticated API routes.
// Keep only UI-level types here; do not add hardcoded securities or prices.
