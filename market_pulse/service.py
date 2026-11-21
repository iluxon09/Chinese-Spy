from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any

from .domain import build_snapshot, utc_now_iso
from .provider import YahooFinanceProvider
from .repository import SupabaseRestRepository
from .universe import (
    UNIVERSE_CACHE_SECONDS,
    UniverseResult,
    fetch_nifty500_universe,
    use_cached_universe,
)

logger = logging.getLogger(__name__)
MINIMUM_COVERAGE = 450


def _age_seconds(value: str) -> float:
    parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    if parsed.tzinfo is None:
        raise ValueError("Cached universe timestamp must include a timezone.")
    return max(0.0, (datetime.now(timezone.utc) - parsed).total_seconds())


class MarketPulseService:
    def __init__(
        self,
        repository: SupabaseRestRepository | None = None,
        provider=None,
    ) -> None:
        self.repository = repository or SupabaseRestRepository()
        self.provider = provider or YahooFinanceProvider()

    def _resolve_universe(self, cached: dict[str, Any] | None) -> UniverseResult:
        cached_result = use_cached_universe(cached)
        if cached_result and _age_seconds(cached_result.retrieved_at) <= UNIVERSE_CACHE_SECONDS:
            return cached_result

        try:
            return fetch_nifty500_universe()
        except Exception:
            if cached_result:
                logger.warning("NSE universe refresh failed; using the last validated list.")
                return UniverseResult(
                    members=cached_result.members,
                    source_url=cached_result.source_url,
                    retrieved_at=cached_result.retrieved_at,
                    is_stale=True,
                )
            raise

    def refresh(self) -> dict[str, Any]:
        lock_token = self.repository.claim_refresh()
        if not lock_token:
            return {"status": "skipped", "reason": "refresh_already_running"}

        try:
            cached = self.repository.get_cached_universe()
            universe = self._resolve_universe(cached)
            market_data = self.provider.fetch_daily_bars(universe.members)
            snapshot = build_snapshot(
                universe.members,
                market_data,
                source=self.provider.name,
                collected_at=utc_now_iso(),
                universe_source_url=universe.source_url,
                universe_retrieved_at=universe.retrieved_at,
                universe_is_stale=universe.is_stale,
                minimum_session_coverage=MINIMUM_COVERAGE,
            )

            available = snapshot["coverage"]["available"]
            if snapshot["coverage"]["requested"] != 500:
                raise RuntimeError("Validated Nifty 500 universe did not contain 500 members.")
            if available < MINIMUM_COVERAGE:
                raise RuntimeError(
                    f"Provider returned {available}/500 valid quotes across two common completed sessions; "
                    f"minimum publication coverage is {MINIMUM_COVERAGE}/500."
                )

            if not self.repository.publish(lock_token, snapshot):
                raise RuntimeError("Market snapshot was not published; refresh lock expired or changed.")

            return {
                "status": snapshot["status"],
                "coverage": snapshot["coverage"],
                "collected_at": snapshot["collected_at"],
                "latest_market_date": snapshot["latest_market_date"],
                "previous_market_date": snapshot["previous_market_date"],
            }
        except Exception as exc:
            message = f"{type(exc).__name__}: {exc}"
            try:
                self.repository.record_failure(lock_token, message)
            except Exception:
                logger.exception("Could not record market-pulse refresh failure.")
            raise
