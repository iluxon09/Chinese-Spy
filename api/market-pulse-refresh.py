from __future__ import annotations

import hmac
import json
import logging
import os
from http.server import BaseHTTPRequestHandler

from market_pulse.service import MarketPulseService

logger = logging.getLogger("tilt.market-pulse")


class handler(BaseHTTPRequestHandler):
    def _respond(self, status: int, payload: dict) -> None:
        body = json.dumps(payload, separators=(",", ":"), ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self) -> None:
        expected = os.environ.get("TILT_MARKET_REFRESH_SECRET", "")
        supplied = self.headers.get("Authorization", "")
        supplied = supplied[7:] if supplied.startswith("Bearer ") else ""
        if not expected or not supplied or not hmac.compare_digest(expected, supplied):
            self._respond(401, {"ok": False, "error": "Unauthorized"})
            return

        try:
            result = MarketPulseService().refresh()
            status = 202 if result.get("status") == "skipped" else 200
            self._respond(status, {"ok": True, "result": result})
        except Exception as exc:
            logger.exception("Nifty 500 market-pulse refresh failed.")
            # The detailed error is kept in server logs and the protected DB
            # state. The public worker response deliberately avoids internals.
            self._respond(502, {
                "ok": False,
                "error": "Market-data refresh failed. The previous successful snapshot was retained.",
                "errorType": type(exc).__name__,
            })

    def do_POST(self) -> None:
        self._respond(405, {"ok": False, "error": "Method not allowed"})

    def do_HEAD(self) -> None:
        self._respond(405, {"ok": False, "error": "Method not allowed"})
