
import { MarketStock } from "@/features/market/market-data";

export type Holding = {
  symbol: string;
  name: string;
  quantity: number;
  averagePrice: number;
};

export type TradeOrder = {
  id: string;
  symbol: string;
  side: "BUY" | "SELL";
  quantity: number;
  price: number;
  total: number;
  status: "EXECUTED" | "REJECTED";
  timestamp: string;
};

export type TradingState = {
  cashBalance: number;
  holdings: Holding[];
  orders: TradeOrder[];
};

export const INITIAL_TRADING_STATE: TradingState = {
  cashBalance: 375000,
  holdings: [],
  orders: [],
};

export function executeTrade(
  state: TradingState,
  stock: MarketStock,
  side: "BUY" | "SELL",
  quantity: number
): TradingState {
  if (!Number.isInteger(quantity) || quantity <= 0) {
    throw new Error("Enter a valid quantity.");
  }

  const total = stock.price * quantity;

  if (side === "BUY") {
    if (total > state.cashBalance) {
      throw new Error("Insufficient cash balance.");
    }

    const existing = state.holdings.find(
      (item) => item.symbol === stock.symbol
    );

    const newHoldings = existing
      ? state.holdings.map((item) =>
          item.symbol === stock.symbol
            ? {
                ...item,
                quantity: item.quantity + quantity,
                averagePrice:
                  (item.averagePrice * item.quantity + total) /
                  (item.quantity + quantity),
              }
            : item
        )
      : [
          ...state.holdings,
          {
            symbol: stock.symbol,
            name: stock.name,
            quantity,
            averagePrice: stock.price,
          },
        ];

    return {
      ...state,
      cashBalance: state.cashBalance - total,
      holdings: newHoldings,
      orders: [
        {
          id: crypto.randomUUID(),
          symbol: stock.symbol,
          side,
          quantity,
          price: stock.price,
          total,
          status: "EXECUTED",
          timestamp: new Date().toISOString(),
        },
        ...state.orders,
      ],
    };
  }

  const holding = state.holdings.find(
    (item) => item.symbol === stock.symbol
  );

  if (!holding || holding.quantity < quantity) {
    throw new Error("Insufficient shares to sell.");
  }

  const newHoldings = state.holdings
    .map((item) =>
      item.symbol === stock.symbol
        ? { ...item, quantity: item.quantity - quantity }
        : item
    )
    .filter((item) => item.quantity > 0);

  return {
    ...state,
    cashBalance: state.cashBalance + total,
    holdings: newHoldings,
    orders: [
      {
        id: crypto.randomUUID(),
        symbol: stock.symbol,
        side,
        quantity,
        price: stock.price,
        total,
        status: "EXECUTED",
        timestamp: new Date().toISOString(),
      },
      ...state.orders,
    ],
  };
}
