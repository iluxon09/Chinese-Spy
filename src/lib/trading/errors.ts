export type TradingErrorCode =
  | "UNKNOWN_SYMBOL"
  | "INVALID_QUANTITY"
  | "INVALID_PRICE"
  | "INVALID_AMOUNT"
  | "INSUFFICIENT_CASH"
  | "INSUFFICIENT_HOLDINGS"
  | "INVALID_CHARGE_POLICY"
  | "INVALID_SESSION";

export class TradingError extends Error {
  readonly code: TradingErrorCode;

  constructor(code: TradingErrorCode, message: string) {
    super(message);
    this.name = "TradingError";
    this.code = code;
  }
}
