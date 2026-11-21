from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime, time, timedelta, timezone
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP
from typing import Mapping, Sequence
from zoneinfo import ZoneInfo


INDIA_TZ = ZoneInfo("Asia/Kolkata")
DAILY_BAR_CUTOFF = time(16, 0)


@dataclass(frozen=True)
class DailyBar:
    date: str
    close: float


@dataclass(frozen=True)
class UniverseMember:
    symbol: str
    company: str
    industry: str = ""
    series: str = "EQ"
    isin: str = ""


def _decimal_price(value: object) -> Decimal | None:
    try:
        number = Decimal(str(value))
    except (InvalidOperation, TypeError, ValueError):
        return None
    if not number.is_finite() or number <= 0:
        return None
    return number


def _rounded(value: Decimal, places: str = "0.01") -> float:
    return float(value.quantize(Decimal(places), rounding=ROUND_HALF_UP))


def latest_completed_market_date(now: datetime | None = None) -> str:
    """Exclude today's daily candle until after the NSE cash-session close buffer."""
    current = now or datetime.now(INDIA_TZ)
    if current.tzinfo is None:
        current = current.replace(tzinfo=INDIA_TZ)
    local = current.astimezone(INDIA_TZ)
    cutoff = local.date() if local.time() >= DAILY_BAR_CUTOFF else local.date() - timedelta(days=1)
    return cutoff.isoformat()


def build_snapshot(
    universe: Sequence[UniverseMember],
    market_data: Mapping[str, Sequence[DailyBar]],
    *,
    source: str,
    collected_at: str,
    universe_source_url: str,
    universe_retrieved_at: str,
    universe_is_stale: bool = False,
    minimum_session_coverage: int = 450,
    eligible_through_date: str | None = None,
) -> dict:
    """Rank all constituents against one common pair of completed daily sessions.

    The latest eligible session must have at least minimum_session_coverage valid
    closes. The preceding eligible session must also meet that threshold.
    Stocks without both closes are not ranked. Sorting uses unrounded returns;
    output numbers are rounded only after ranking.
    """
    cutoff = eligible_through_date or latest_completed_market_date()
    valid_bars: dict[str, dict[str, Decimal]] = {}
    invalid_dates: dict[str, set[str]] = {}
    session_coverage: dict[str, int] = {}

    for member in universe:
        by_date: dict[str, Decimal] = {}
        invalid: set[str] = set()
        for bar in market_data.get(member.symbol, ()):
            if bar.date > cutoff:
                continue
            price = _decimal_price(bar.close)
            if price is None:
                invalid.add(bar.date)
            else:
                by_date[bar.date] = price
        valid_bars[member.symbol] = by_date
        invalid_dates[member.symbol] = invalid
        for session_date in by_date:
            session_coverage[session_date] = session_coverage.get(session_date, 0) + 1

    required_coverage = min(max(1, minimum_session_coverage), len(universe))
    qualified_dates = sorted(
        session_date
        for session_date, count in session_coverage.items()
        if count >= required_coverage
    )
    latest_date = qualified_dates[-1] if len(qualified_dates) >= 2 else None
    previous_date = qualified_dates[-2] if len(qualified_dates) >= 2 else None

    stocks: list[dict] = []
    unavailable: list[dict] = []
    sort_values: dict[str, Decimal] = {}

    for member in universe:
        by_date = valid_bars[member.symbol]
        if not by_date:
            unavailable.append({
                "symbol": member.symbol,
                "company": member.company,
                "reason": "no_valid_data",
            })
            continue

        if latest_date is None or previous_date is None:
            unavailable.append({
                "symbol": member.symbol,
                "company": member.company,
                "reason": "insufficient_common_session_history",
            })
            continue

        if latest_date not in by_date:
            reason = "invalid_price" if latest_date in invalid_dates[member.symbol] else "missing_latest_session"
            unavailable.append({
                "symbol": member.symbol,
                "company": member.company,
                "reason": reason,
            })
            continue

        if previous_date not in by_date:
            reason = "invalid_price" if previous_date in invalid_dates[member.symbol] else "missing_previous_session"
            unavailable.append({
                "symbol": member.symbol,
                "company": member.company,
                "reason": reason,
            })
            continue

        previous = by_date[previous_date]
        latest = by_date[latest_date]
        change = ((latest - previous) / previous) * Decimal("100")
        sort_values[member.symbol] = change
        stocks.append({
            "symbol": member.symbol,
            "company": member.company,
            "industry": member.industry,
            "latest_price": _rounded(latest),
            "previous_close": _rounded(previous),
            "change_pct": _rounded(change),
            "market_date": latest_date,
            "previous_close_date": previous_date,
        })

    stocks.sort(key=lambda item: item["symbol"])
    by_symbol = {item["symbol"]: item for item in stocks}
    gainers = sorted(
        (symbol for symbol, value in sort_values.items() if value > 0),
        key=lambda symbol: (-sort_values[symbol], symbol),
    )[:5]
    losers = sorted(
        (symbol for symbol, value in sort_values.items() if value < 0),
        key=lambda symbol: (sort_values[symbol], symbol),
    )[:5]

    requested = len(universe)
    available = len(stocks)
    coverage_pct = (available / requested * 100) if requested else 0.0
    is_complete = (
        requested == 500
        and available == 500
        and not unavailable
        and not universe_is_stale
    )

    return {
        "universe": {
            "name": "NIFTY 500",
            "expected_constituents": 500,
            "member_count": requested,
            "source_url": universe_source_url,
            "retrieved_at": universe_retrieved_at,
            "is_stale": universe_is_stale,
            "members": [
                {
                    "symbol": member.symbol,
                    "company": member.company,
                    "industry": member.industry,
                    "series": member.series,
                    "isin": member.isin,
                }
                for member in universe
            ],
        },
        "source": source,
        "data_type": "daily_historical_or_delayed",
        "bar_interval": "1d",
        "refresh_interval_minutes": 15,
        "collected_at": collected_at,
        "latest_market_date": latest_date,
        "previous_market_date": previous_date,
        "status": "ok" if is_complete else "partial",
        "ranking_complete": is_complete,
        "coverage": {
            "requested": requested,
            "available": available,
            "unavailable": len(unavailable),
            "percent": round(coverage_pct, 2),
            "minimum_session_coverage": required_coverage,
        },
        "gainers": [by_symbol[symbol] for symbol in gainers],
        "losers": [by_symbol[symbol] for symbol in losers],
        "stocks": stocks,
        "unavailable_symbols": unavailable,
    }


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
