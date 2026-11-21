from __future__ import annotations

import json
import os
import urllib.error
import urllib.request
from typing import Any


class SupabaseRestRepository:
    """Narrow PostgREST RPC adapter; no service-role credential is required."""

    def __init__(self) -> None:
        self.base_url = (os.environ.get("NEXT_PUBLIC_SUPABASE_URL") or "").rstrip("/")
        self.api_key = os.environ.get("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "")
        self.worker_secret = os.environ.get("TILT_MARKET_REFRESH_SECRET", "")
        if not self.base_url or not self.api_key or not self.worker_secret:
            raise RuntimeError("Market-pulse worker environment is incomplete.")

    def _rpc(self, name: str, payload: dict[str, Any], timeout: int = 15) -> Any:
        url = f"{self.base_url}/rest/v1/rpc/{name}"
        body = json.dumps(payload, separators=(",", ":")).encode("utf-8")
        request = urllib.request.Request(
            url,
            data=body,
            method="POST",
            headers={
                "apikey": self.api_key,
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
                "Accept": "application/json",
            },
        )
        try:
            with urllib.request.urlopen(request, timeout=timeout) as response:
                raw = response.read()
        except urllib.error.HTTPError as exc:
            detail = exc.read(1024).decode("utf-8", errors="replace")
            raise RuntimeError(f"Supabase RPC {name} failed (HTTP {exc.code}): {detail}") from exc
        except urllib.error.URLError as exc:
            raise RuntimeError(f"Supabase RPC {name} network failure: {exc.reason}") from exc

        if not raw:
            return None
        try:
            return json.loads(raw.decode("utf-8"))
        except json.JSONDecodeError as exc:
            raise RuntimeError(f"Supabase RPC {name} returned invalid JSON.") from exc

    def claim_refresh(self) -> str | None:
        result = self._rpc("claim_market_pulse_refresh", {
            "p_worker_secret": self.worker_secret,
            "p_lock_seconds": 180,
        })
        if result is None:
            return None
        if isinstance(result, str):
            return result
        if isinstance(result, list) and result and isinstance(result[0], str):
            return result[0]
        raise RuntimeError("Supabase did not return a valid market refresh lock.")

    def get_cached_universe(self) -> dict[str, Any] | None:
        result = self._rpc("get_market_pulse_universe", {
            "p_worker_secret": self.worker_secret,
        })
        return result if isinstance(result, dict) else None

    def publish(self, lock_token: str, snapshot: dict[str, Any]) -> bool:
        result = self._rpc("publish_market_pulse_snapshot", {
            "p_worker_secret": self.worker_secret,
            "p_lock_token": lock_token,
            "p_snapshot": snapshot,
        })
        return result is True

    def record_failure(self, lock_token: str, message: str) -> bool:
        result = self._rpc("record_market_pulse_failure", {
            "p_worker_secret": self.worker_secret,
            "p_lock_token": lock_token,
            "p_error": message[:500],
        })
        return result is True
