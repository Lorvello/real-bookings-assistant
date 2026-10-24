"""Offline R84 regression for core.ts(): the fixture timestamps follow Europe/Amsterdam per date.

Run from bakeoff/: python3 -m unittest test_core_time.py
"""
from pathlib import Path
import sys
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parent))
import core  # noqa: E402


class TsTests(unittest.TestCase):
    def test_summer_dates_keep_plus_two(self):
        # The September 2026 measurement must read exactly as it did.
        self.assertEqual(core.ts("2026-09-15", "10:00"), "2026-09-15 10:00:00+02")
        self.assertEqual(core.ts("2026-10-24", "23:30"), "2026-10-24 23:30:00+02")

    def test_winter_dates_use_plus_one(self):
        # From 25 October 2026 Amsterdam is on CET; a fixed +02 put 10:00 at 09:00 local.
        self.assertEqual(core.ts("2026-11-03", "10:00"), "2026-11-03 10:00:00+01")
        self.assertEqual(core.ts("2026-10-27", "22:00"), "2026-10-27 22:00:00+01")

    def test_the_switch_day_itself(self):
        # 25 October: 01:30 is still summer time, 12:00 is already winter time.
        self.assertEqual(core.ts("2026-10-25", "01:30"), "2026-10-25 01:30:00+02")
        self.assertEqual(core.ts("2026-10-25", "12:00"), "2026-10-25 12:00:00+01")


if __name__ == "__main__":
    unittest.main()
