import unittest
from datetime import datetime, timezone
from zoneinfo import ZoneInfo

from market_pulse.domain import (
    DailyBar,
    UniverseMember,
    build_snapshot,
    latest_completed_market_date,
)
from market_pulse.universe import parse_nifty500_csv, use_cached_universe


def member(symbol: str) -> UniverseMember:
    return UniverseMember(symbol=symbol, company=f"{symbol} Limited")


def snapshot(universe, prices, *, stale=False, min_session_coverage=None):
    return build_snapshot(
        universe,
        prices,
        source="fake",
        collected_at="2026-11-21T00:00:00Z",
        universe_source_url="https://example.test/nifty500.csv",
        universe_retrieved_at="2026-11-21T00:00:00Z",
        universe_is_stale=stale,
        minimum_session_coverage=(
            min_session_coverage if min_session_coverage is not None
            else min(450, len(universe))
        ),
        eligible_through_date="2026-11-21",
    )


class MarketPulseRankingTests(unittest.TestCase):
    def test_ranks_using_the_same_two_completed_sessions(self):
        universe = [member("AAA"), member("BBB"), member("CCC"), member("DDD")]
        prices = {
            "AAA": [DailyBar("2026-11-19", 100), DailyBar("2026-11-20", 110)],
            "BBB": [DailyBar("2026-11-19", 100), DailyBar("2026-11-20", 90)],
            "CCC": [DailyBar("2026-11-19", 100), DailyBar("2026-11-20", 105)],
            "DDD": [DailyBar("2026-11-19", 100), DailyBar("2026-11-20", 95)],
        }
        result = snapshot(universe, prices)
        self.assertEqual([item["symbol"] for item in result["gainers"]], ["AAA", "CCC"])
        self.assertEqual([item["symbol"] for item in result["losers"]], ["BBB", "DDD"])
        self.assertEqual(result["stocks"][0]["change_pct"], 10.0)
        self.assertEqual(result["latest_market_date"], "2026-11-20")
        self.assertEqual(result["previous_market_date"], "2026-11-19")
        self.assertEqual(result["status"], "partial")
        self.assertEqual(
            {item["market_date"] for item in result["stocks"]},
            {"2026-11-20"},
        )
        self.assertEqual(
            {item["previous_close_date"] for item in result["stocks"]},
            {"2026-11-19"},
        )

    def test_top_five_limit_and_ties_are_deterministic(self):
        universe = [member(f"S{index:02d}") for index in range(12)]
        prices = {}
        for index in range(12):
            latest = 110.0 if index < 7 else 90.0
            prices[f"S{index:02d}"] = [
                DailyBar("2026-11-19", 100.0),
                DailyBar("2026-11-20", latest),
            ]
        result = snapshot(universe, prices)
        self.assertEqual(
            [item["symbol"] for item in result["gainers"]],
            ["S00", "S01", "S02", "S03", "S04"],
        )
        self.assertEqual(
            [item["symbol"] for item in result["losers"]],
            ["S07", "S08", "S09", "S10", "S11"],
        )
        self.assertLessEqual(len(result["gainers"]), 5)
        self.assertLessEqual(len(result["losers"]), 5)

    def test_zero_changes_are_not_gain_or_loss_movers(self):
        result = snapshot(
            [member("AAA")],
            {"AAA": [DailyBar("2026-11-19", 100), DailyBar("2026-11-20", 100)]},
        )
        self.assertEqual(result["gainers"], [])
        self.assertEqual(result["losers"], [])

    def test_unavailable_and_invalid_quotes_are_excluded_and_reported(self):
        universe = [member(symbol) for symbol in ["AAA", "BBB", "CCC", "DDD", "EEE", "FFF", "GGG"]]
        prices = {
            "AAA": [DailyBar("2026-11-19", 100), DailyBar("2026-11-20", 110)],
            "BBB": [DailyBar("2026-11-19", 100), DailyBar("2026-11-20", 0)],
            "DDD": [DailyBar("2026-11-19", 100), DailyBar("2026-11-20", 95)],
            "EEE": [DailyBar("2026-11-19", 100), DailyBar("2026-11-20", 102)],
            "FFF": [DailyBar("2026-11-19", 100), DailyBar("2026-11-20", 103)],
            "GGG": [DailyBar("2026-11-19", 100), DailyBar("2026-11-20", 104)],
        }
        result = snapshot(universe, prices, min_session_coverage=5)
        self.assertEqual(result["coverage"]["available"], 5)
        reasons = {item["symbol"]: item["reason"] for item in result["unavailable_symbols"]}
        self.assertEqual(reasons["BBB"], "invalid_price")
        self.assertEqual(reasons["CCC"], "no_valid_data")

    def test_old_or_partial_dates_are_not_mixed_into_latest_session_rankings(self):
        universe = [member("AAA"), member("BBB"), member("CCC"), member("DDD")]
        prices = {
            "AAA": [
                DailyBar("2026-11-18", 100),
                DailyBar("2026-11-19", 105),
                DailyBar("2026-11-20", 110),
            ],
            "BBB": [
                DailyBar("2026-11-18", 100),
                DailyBar("2026-11-19", 95),
            ],
            "CCC": [
                DailyBar("2026-11-18", 100),
                DailyBar("2026-11-19", 102),
                DailyBar("2026-11-20", 101),
            ],
            "DDD": [
                DailyBar("2026-11-18", 100),
                DailyBar("2026-11-19", 100),
                DailyBar("2026-11-20", 100),
            ],
        }
        result = snapshot(universe, prices, min_session_coverage=3)
        self.assertEqual(result["latest_market_date"], "2026-11-20")
        self.assertEqual(result["previous_market_date"], "2026-11-19")
        self.assertNotIn("BBB", {item["symbol"] for item in result["stocks"]})
        self.assertEqual(
            {item["market_date"] for item in result["stocks"]},
            {"2026-11-20"},
        )

    def test_today_daily_bar_is_excluded_until_four_pm_ist(self):
        india = ZoneInfo("Asia/Kolkata")
        before_close = datetime(2026, 11, 23, 15, 59, tzinfo=india)
        after_close = datetime(2026, 11, 23, 16, 0, tzinfo=india)
        self.assertEqual(latest_completed_market_date(before_close), "2026-11-22")
        self.assertEqual(latest_completed_market_date(after_close), "2026-11-23")

    def test_stale_universe_marks_snapshot_incomplete_even_with_full_price_coverage(self):
        universe = [member("AAA")]
        result = snapshot(
            universe,
            {"AAA": [DailyBar("2026-11-19", 100), DailyBar("2026-11-20", 101)]},
            stale=True,
        )
        self.assertEqual(result["coverage"]["available"], 1)
        self.assertEqual(result["status"], "partial")
        self.assertFalse(result["ranking_complete"])
        self.assertTrue(result["universe"]["is_stale"])

    def test_csv_parser_requires_exactly_500_unique_equity_constituents(self):
        rows = ["Company Name,Industry,Symbol,Series,ISIN Code"]
        rows.extend(
            f"Company {index},Industry {index},S{index:03d},EQ,ISIN{index:03d}"
            for index in range(500)
        )
        result = parse_nifty500_csv("\n".join(rows))
        self.assertEqual(len(result.members), 500)
        self.assertEqual(result.members[0].symbol, "S000")
        with self.assertRaises(ValueError):
            parse_nifty500_csv("\n".join(rows[:-1]))
        with self.assertRaises(ValueError):
            parse_nifty500_csv("\n".join(rows + [rows[-1]]))

    def test_cached_universe_rejects_bad_size_duplicate_symbols_and_naive_times(self):
        self.assertIsNone(use_cached_universe(None))
        bad_date = {
            "members": [{"symbol": "BAD", "company": "Bad"}] * 500,
            "retrieved_at": "2026-11-21T00:00:00",
        }
        self.assertIsNone(use_cached_universe(bad_date))

        valid_members = [
            {
                "symbol": f"S{index:03d}",
                "company": f"Company {index}",
                "series": "EQ",
            }
            for index in range(500)
        ]
        duplicate = valid_members.copy()
        duplicate[-1] = duplicate[0]
        self.assertIsNone(use_cached_universe({
            "members": duplicate,
            "retrieved_at": "2026-11-21T00:00:00Z",
        }))
        current = datetime(2026, 11, 21, tzinfo=timezone.utc)
        fresh = use_cached_universe({
            "members": valid_members,
            "source_url": "https://example.test/nifty500.csv",
            "retrieved_at": "2026-11-21T00:00:00Z",
        }, now=current)
        self.assertIsNotNone(fresh)
        self.assertFalse(fresh.is_stale)


if __name__ == "__main__":
    unittest.main()
