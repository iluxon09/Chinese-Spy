from __future__ import annotations

import logging
import time
from typing import Mapping, Sequence

from .domain import DailyBar, UniverseMember

logger = logging.getLogger(__name__)


class MarketDataProvider:
    """Replaceable market-data adapter contract."""

    name = "abstract"

    def fetch_daily_bars(
        self, members: Sequence[UniverseMember]
    ) -> Mapping[str, Sequence[DailyBar]]:
        raise NotImplementedError


class YahooFinanceProvider(MarketDataProvider):
    """Prototype adapter using Yahoo Finance daily history through yfinance."""

    name = "yfinance"

    def __init__(
        self,
        *,
        timeout_seconds: int = 18,
        threads: int = 8,
        batch_size: int = 100,
        retry_delay_seconds: float = 2.0,
    ) -> None:
        if batch_size < 1 or threads < 1:
            raise ValueError("batch_size and threads must be positive.")
        self.timeout_seconds = timeout_seconds
        self.threads = threads
        self.batch_size = batch_size
        self.retry_delay_seconds = retry_delay_seconds

    @staticmethod
    def _ticker_frame(data, ticker: str):
        import pandas as pd

        if data is None or data.empty:
            return None
        columns = data.columns
        if isinstance(columns, pd.MultiIndex):
            for level in range(columns.nlevels):
                values = columns.get_level_values(level)
                if ticker in values:
                    return data.xs(ticker, axis=1, level=level, drop_level=True)
            return None
        if "Close" in columns:
            return data
        return None

    def _download_batch(self, yf, tickers: list[str]):
        last_error: Exception | None = None
        for attempt in range(2):
            try:
                frame = yf.download(
                    tickers=tickers,
                    period="1mo",
                    interval="1d",
                    group_by="ticker",
                    auto_adjust=False,
                    actions=False,
                    prepost=False,
                    repair=False,
                    threads=self.threads,
                    progress=False,
                    timeout=self.timeout_seconds,
                    multi_level_index=True,
                )
                if frame is not None and not frame.empty:
                    return frame
                logger.warning(
                    "Yahoo Finance returned no daily bars for a batch of %d symbols (attempt %d).",
                    len(tickers),
                    attempt + 1,
                )
            except Exception as exc:
                last_error = exc
                logger.warning(
                    "Yahoo Finance batch failed for %d symbols (attempt %d): %s",
                    len(tickers),
                    attempt + 1,
                    type(exc).__name__,
                )
            if attempt == 0:
                time.sleep(self.retry_delay_seconds)
        if last_error:
            logger.error("Yahoo Finance batch exhausted retries: %s", type(last_error).__name__)
        return None

    def fetch_daily_bars(
        self, members: Sequence[UniverseMember]
    ) -> Mapping[str, Sequence[DailyBar]]:
        import yfinance as yf

        output: dict[str, list[DailyBar]] = {}
        for start in range(0, len(members), self.batch_size):
            batch = members[start : start + self.batch_size]
            tickers = [f"{member.symbol}.NS" for member in batch]
            downloaded = self._download_batch(yf, tickers)
            if downloaded is None:
                # A failed chunk does not prevent other chunks from being
                # collected. Publication is rejected if combined valid coverage
                # falls below the service's explicit minimum.
                continue

            for member, ticker in zip(batch, tickers):
                frame = self._ticker_frame(downloaded, ticker)
                if frame is None or "Close" not in frame.columns:
                    continue
                closes = frame["Close"].dropna()
                bars: list[DailyBar] = []
                for index, value in closes.items():
                    try:
                        price = float(value)
                    except (TypeError, ValueError):
                        continue
                    date_value = index.date().isoformat() if hasattr(index, "date") else str(index)[:10]
                    bars.append(DailyBar(date=date_value, close=price))
                if bars:
                    output[member.symbol] = sorted(bars, key=lambda item: item.date)
        return output
