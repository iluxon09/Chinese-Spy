from __future__ import annotations

import csv
import io
import urllib.error
import urllib.request
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any

from .domain import UniverseMember, utc_now_iso


NIFTY_500_CSV_URL = "https://www.niftyindices.com/IndexConstituent/ind_nifty500list.csv"
NIFTY_500_CSV_FALLBACK_URL = "https://nsearchives.nseindia.com/content/indices/ind_nifty500list.csv"
NIFTY_500_PAGE_URL = "https://www.niftyindices.com/indices/equity/broad-based-indices/nifty-500"
UNIVERSE_CACHE_SECONDS = 24 * 60 * 60
UNIVERSE_STALE_MAX_SECONDS = 7 * 24 * 60 * 60


@dataclass(frozen=True)
class UniverseResult:
    members: list[UniverseMember]
    source_url: str
    retrieved_at: str
    is_stale: bool = False


def _parse_timestamp(value: str) -> datetime | None:
    try:
        timestamp = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except (TypeError, ValueError):
        return None
    # Do not compare naive timestamps with UTC-aware datetimes.
    if timestamp.tzinfo is None:
        return None
    return timestamp.astimezone(timezone.utc)


def parse_nifty500_csv(
    content: str,
    *,
    retrieved_at: str | None = None,
    source_url: str = NIFTY_500_CSV_URL,
) -> UniverseResult:
    reader = csv.DictReader(io.StringIO(content.lstrip("\ufeff")))
    if not reader.fieldnames:
        raise ValueError("The NSE constituent CSV has no header.")

    normalized = {name.strip().lower(): name for name in reader.fieldnames if name}
    symbol_key = normalized.get("symbol")
    company_key = normalized.get("company name") or normalized.get("company")
    series_key = normalized.get("series")
    industry_key = normalized.get("industry")
    isin_key = normalized.get("isin code") or normalized.get("isin")
    if not symbol_key or not company_key:
        raise ValueError("The NSE constituent CSV is missing Symbol or Company Name.")

    members: list[UniverseMember] = []
    seen: set[str] = set()
    for row in reader:
        symbol = (row.get(symbol_key) or "").strip().upper()
        if not symbol:
            continue
        series = (row.get(series_key) or "EQ").strip().upper() if series_key else "EQ"
        if series and series != "EQ":
            continue
        if symbol in seen:
            raise ValueError(f"Duplicate symbol in Nifty 500 universe: {symbol}")
        seen.add(symbol)
        members.append(UniverseMember(
            symbol=symbol,
            company=(row.get(company_key) or symbol).strip(),
            industry=(row.get(industry_key) or "").strip() if industry_key else "",
            series=series or "EQ",
            isin=(row.get(isin_key) or "").strip() if isin_key else "",
        ))

    if len(members) != 500:
        raise ValueError(
            f"Expected exactly 500 Nifty 500 equity constituents; received {len(members)}."
        )

    return UniverseResult(
        members=members,
        source_url=source_url,
        retrieved_at=retrieved_at or utc_now_iso(),
        is_stale=False,
    )


def _download_csv(url: str, timeout_seconds: int) -> str:
    request = urllib.request.Request(
        url,
        headers={
            "User-Agent": "Mozilla/5.0 (compatible; TILT-MarketPulse/1.0)",
            "Accept": "text/csv,text/plain,*/*",
            "Referer": NIFTY_500_PAGE_URL,
        },
    )
    with urllib.request.urlopen(request, timeout=timeout_seconds) as response:
        status = getattr(response, "status", 200)
        if status != 200:
            raise RuntimeError(f"NSE constituent download returned HTTP {status}.")
        payload = response.read()
    try:
        return payload.decode("utf-8-sig")
    except UnicodeDecodeError as exc:
        raise ValueError("NSE constituent CSV was not valid UTF-8.") from exc


def fetch_nifty500_universe(timeout_seconds: int = 15) -> UniverseResult:
    errors: list[str] = []
    for url in (NIFTY_500_CSV_URL, NIFTY_500_CSV_FALLBACK_URL):
        try:
            content = _download_csv(url, timeout_seconds)
            # A successful HTTP response is not enough: the content must parse
            # into exactly 500 unique EQ constituents before it can be cached.
            return parse_nifty500_csv(content, source_url=url)
        except (urllib.error.URLError, TimeoutError, ValueError, RuntimeError) as exc:
            errors.append(f"{url}: {type(exc).__name__}: {exc}")
    raise RuntimeError("Both NSE constituent endpoints failed validation: " + " | ".join(errors))


def use_cached_universe(
    cache: dict[str, Any] | None,
    *,
    now: datetime | None = None,
) -> UniverseResult | None:
    if not isinstance(cache, dict):
        return None
    members_raw = cache.get("members")
    retrieved_at = cache.get("retrieved_at")
    if not isinstance(members_raw, list) or not isinstance(retrieved_at, str):
        return None

    timestamp = _parse_timestamp(retrieved_at)
    if timestamp is None:
        return None
    current = now or datetime.now(timezone.utc)
    if current.tzinfo is None:
        current = current.replace(tzinfo=timezone.utc)
    age = max(0.0, (current.astimezone(timezone.utc) - timestamp).total_seconds())
    if age > UNIVERSE_STALE_MAX_SECONDS:
        return None

    members: list[UniverseMember] = []
    for item in members_raw:
        if not isinstance(item, dict):
            return None
        symbol = item.get("symbol")
        company = item.get("company")
        if not isinstance(symbol, str) or not isinstance(company, str):
            return None
        members.append(UniverseMember(
            symbol=symbol,
            company=company,
            industry=str(item.get("industry") or ""),
            series=str(item.get("series") or "EQ"),
            isin=str(item.get("isin") or ""),
        ))
    if (
        len(members) != 500
        or len({member.symbol for member in members}) != 500
        or any(member.series != "EQ" for member in members)
    ):
        return None

    return UniverseResult(
        members=members,
        source_url=str(cache.get("source_url") or NIFTY_500_CSV_URL),
        retrieved_at=retrieved_at,
        is_stale=age > UNIVERSE_CACHE_SECONDS,
    )
