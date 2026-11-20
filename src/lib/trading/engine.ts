import type {
  ChargePolicy,
  MarketOrderCommand,
  MoneyPaise,
  PortfolioSnapshot,
  PortfolioState,
  Transaction,
} from "../domain/types";
import { calculateCharges, DEFAULT_CHARGE_POLICY } from "./charges";
import { TradingError } from "./errors";

const MAX_SAFE = BigInt(Number.MAX_SAFE_INTEGER);

function assertSafePaise(value: number, label: string, allowZero = false): void {
  const valid = Number.isSafeInteger(value) && (allowZero ? value >= 0 : value > 0);
  if (!valid) {
    throw new TradingError("INVALID_AMOUNT", `${label} must be a ${allowZero ? "non-negative" : "positive"} safe integer in paise.`);
  }
}

function safeProduct(a: number, b: number, label: string): MoneyPaise {
  if (!Number.isSafeInteger(a) || !Number.isSafeInteger(b) || a < 0 || b < 0) {
    throw new TradingError("INVALID_AMOUNT", `${label} inputs must be non-negative safe integers.`);
  }
  const result = BigInt(a) * BigInt(b);
  if (result > MAX_SAFE) {
    throw new TradingError("INVALID_AMOUNT", `${label} exceeds the supported monetary range.`);
  }
  return Number(result);
}

function safeSum(values: readonly number[], label: string): number {
  const result = values.reduce((sum, value) => sum + BigInt(value), 0n);
  if (result > MAX_SAFE || result < -MAX_SAFE) {
    throw new TradingError("INVALID_AMOUNT", `${label} exceeds the supported monetary range.`);
  }
  return Number(result);
}

/**
 * Executes a market order against the supplied current-price snapshot.
 * It is pure: it returns a new state and never mutates the input state.
 * The caller must persist the complete result atomically in the database.
 */
export function placeMarketOrder(
  state: PortfolioState,
  command: MarketOrderCommand,
  currentPricesPaise: Readonly<Record<string, MoneyPaise>>,
  chargePolicy: ChargePolicy = DEFAULT_CHARGE_POLICY,
): PortfolioState {
  const price = currentPricesPaise[command.symbol];
  if (price === undefined) {
    throw new TradingError("UNKNOWN_SYMBOL", `Unknown symbol: ${command.symbol}`);
  }
  assertSafePaise(price, "Execution price");

  if (!Number.isSafeInteger(command.quantity) || command.quantity <= 0) {
    throw new TradingError("INVALID_QUANTITY", "Quantity must be a positive integer.");
  }
  if (!command.id || !command.timestamp || !command.symbol) {
    throw new TradingError("INVALID_SESSION", "Order ID, timestamp and symbol are required.");
  }
  if (!Number.isSafeInteger(state.session.cashBalancePaise) || state.session.cashBalancePaise < 0) {
    throw new TradingError("INVALID_SESSION", "Session cash balance is invalid.");
  }

  const grossAmountPaise = safeProduct(price, command.quantity, "Order value");
  const chargesPaise = calculateCharges(grossAmountPaise, chargePolicy);
  const existingHolding = state.holdings[command.symbol];

  let nextCash = state.session.cashBalancePaise;
  const nextHoldings = { ...state.holdings };
  let cashDeltaPaise: number;
  let realisedPnlPaise = 0;

  if (command.side === "BUY") {
    const totalDebit = grossAmountPaise + chargesPaise;
    if (!Number.isSafeInteger(totalDebit)) {
      throw new TradingError("INVALID_AMOUNT", "Total debit exceeds the supported monetary range.");
    }
    if (nextCash < totalDebit) {
      throw new TradingError("INSUFFICIENT_CASH", "Insufficient cash to complete this buy order.");
    }

    const previousQuantity = existingHolding?.quantity ?? 0;
    const previousCost = existingHolding?.totalCostPaise ?? 0;
    const newQuantity = previousQuantity + command.quantity;
    const newCost = previousCost + grossAmountPaise + chargesPaise;
    if (!Number.isSafeInteger(newQuantity) || !Number.isSafeInteger(newCost)) {
      throw new TradingError("INVALID_AMOUNT", "Holding quantity or cost basis exceeds the supported range.");
    }

    nextCash -= totalDebit;
    cashDeltaPaise = -totalDebit;
    nextHoldings[command.symbol] = {
      symbol: command.symbol,
      quantity: newQuantity,
      totalCostPaise: newCost,
    };
  } else if (command.side === "SELL") {
    if (!existingHolding || existingHolding.quantity < command.quantity) {
      throw new TradingError("INSUFFICIENT_HOLDINGS", "You do not own enough shares to complete this sell order.");
    }

    // Allocate all remaining cost basis on a full exit; otherwise use integer paise
    // allocation and leave the rounding remainder with the shares still held.
    const costBasisReleased = command.quantity === existingHolding.quantity
      ? existingHolding.totalCostPaise
      : Number((BigInt(existingHolding.totalCostPaise) * BigInt(command.quantity)) / BigInt(existingHolding.quantity));

    const netCredit = grossAmountPaise - chargesPaise;
    realisedPnlPaise = netCredit - costBasisReleased;
    nextCash += netCredit;
    if (!Number.isSafeInteger(nextCash)) {
      throw new TradingError("INVALID_AMOUNT", "Cash balance exceeds the supported monetary range.");
    }
    cashDeltaPaise = netCredit;

    const remainingQuantity = existingHolding.quantity - command.quantity;
    if (remainingQuantity === 0) {
      delete nextHoldings[command.symbol];
    } else {
      nextHoldings[command.symbol] = {
        ...existingHolding,
        quantity: remainingQuantity,
        totalCostPaise: existingHolding.totalCostPaise - costBasisReleased,
      };
    }
  } else {
    throw new TradingError("INVALID_SESSION", "Unsupported order side.");
  }

  const transaction: Transaction = {
    id: command.id,
    sessionId: state.session.id,
    symbol: command.symbol,
    side: command.side,
    quantity: command.quantity,
    executionPricePaise: price,
    grossAmountPaise,
    chargesPaise,
    cashDeltaPaise,
    realisedPnlPaise,
    marketStep: state.session.marketStep,
    timestamp: command.timestamp,
  };

  return {
    session: { ...state.session, cashBalancePaise: nextCash },
    holdings: nextHoldings,
    transactions: [...state.transactions, transaction],
  };
}

/** Derive the dashboard/analytics snapshot from state and current market prices. */
export function calculatePortfolioSnapshot(
  state: PortfolioState,
  currentPricesPaise: Readonly<Record<string, MoneyPaise>>,
  sectorsBySymbol: Readonly<Record<string, string>> = {},
): PortfolioSnapshot {
  const holdings = Object.values(state.holdings).map((holding) => {
    const currentPricePaise = currentPricesPaise[holding.symbol];
    if (currentPricePaise === undefined) {
      throw new TradingError("UNKNOWN_SYMBOL", `Missing current price for held symbol: ${holding.symbol}`);
    }
    assertSafePaise(currentPricePaise, `Current price for ${holding.symbol}`);

    const marketValuePaise = safeProduct(currentPricePaise, holding.quantity, "Holding market value");
    return {
      symbol: holding.symbol,
      quantity: holding.quantity,
      currentPricePaise,
      averagePurchasePricePaise: holding.totalCostPaise / holding.quantity,
      totalCostPaise: holding.totalCostPaise,
      marketValuePaise,
      unrealisedPnlPaise: marketValuePaise - holding.totalCostPaise,
    };
  });

  const investedAmountPaise = safeSum(holdings.map((holding) => holding.totalCostPaise), "Invested amount");
  const holdingsValuePaise = safeSum(holdings.map((holding) => holding.marketValuePaise), "Holdings market value");
  const portfolioValuePaise = safeSum([state.session.cashBalancePaise, holdingsValuePaise], "Portfolio value");
  const realisedPnlPaise = safeSum(state.transactions.map((transaction) => transaction.realisedPnlPaise), "Realised P&L");
  const unrealisedPnlPaise = safeSum(holdings.map((holding) => holding.unrealisedPnlPaise), "Unrealised P&L");
  const totalPnlPaise = portfolioValuePaise - state.session.startingCapitalPaise;
  const returnPercent = state.session.startingCapitalPaise > 0
    ? (totalPnlPaise / state.session.startingCapitalPaise) * 100
    : 0;

  const sectorValues = new Map<string, number>();
  for (const holding of holdings) {
    const sector = sectorsBySymbol[holding.symbol] ?? "Unclassified";
    sectorValues.set(sector, (sectorValues.get(sector) ?? 0) + holding.marketValuePaise);
  }
  const sectorAllocation = Array.from(sectorValues.entries()).map(([sector, marketValuePaise]) => ({
    sector,
    marketValuePaise,
    weightBps: holdingsValuePaise > 0 ? Math.round((marketValuePaise / holdingsValuePaise) * 10_000) : 0,
  })).sort((a, b) => b.marketValuePaise - a.marketValuePaise);

  return {
    cashBalancePaise: state.session.cashBalancePaise,
    investedAmountPaise,
    holdingsValuePaise,
    portfolioValuePaise,
    realisedPnlPaise,
    unrealisedPnlPaise,
    totalPnlPaise,
    returnPercent,
    holdings,
    allocation: holdings.map((holding) => ({
      symbol: holding.symbol,
      marketValuePaise: holding.marketValuePaise,
      weightBps: holdingsValuePaise > 0
        ? Math.round((holding.marketValuePaise / holdingsValuePaise) * 10_000)
        : 0,
    })),
    sectorAllocation,
  };
}
