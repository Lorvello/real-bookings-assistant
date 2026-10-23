"""Offline R84 regressions for the bake-off cost report. No harness, secrets, network or real evidence.

Run: python3 -m unittest bakeoff/test_report_prices.py
"""
import json
import os
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parent))
import core  # noqa: E402
import report  # noqa: E402


def call(label, prompt, completion, cached=None, write=None):
    return {"label": label, "prompt_tokens": prompt, "completion_tokens": completion,
            "cached_tokens": cached, "cache_write_tokens": write}


class KostenTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        patcher = patch.object(core, "R05", self.tmp.name)
        patcher.start()
        self.addCleanup(patcher.stop)

    def run_kosten(self, tag, model, calls):
        os.makedirs(os.path.join(self.tmp.name, "runs", tag))
        with open(os.path.join(self.tmp.name, "runs", tag, "S01.json"), "w", encoding="utf-8") as fh:
            json.dump({"turns": [{"llm_usage": {"per_call": calls}}]}, fh)
        score = {"meta": {"model": model}, "tokens": {"per_scenario": {"S01": {"type": "book"}}}}
        return report.kosten(tag, score)

    def test_claude_prices_fresh_cache_read_and_cache_write_apart(self):
        # 20_000-token prompt: 1_000 fresh, 15_000 read from cache, 4_000 written to cache.
        out = self.run_kosten("R84_H", "claude-haiku-5-5", [
            call("llm.agent", 20_000, 300, cached=15_000, write=4_000),
            call("clf.owner", 1_000, 10),
        ])
        agent = (1_000 * 0.10 + 15_000 * 0.01 + 4_000 * 0.125) / 1e6 + 300 * 0.50 / 1e6
        clf = 1_000 * 0.075 / 1e6 + 10 * 0.30 / 1e6
        self.assertAlmostEqual(out["usd_agent_per_conversatie"], round(agent, 6))
        self.assertAlmostEqual(out["usd_classifiers_per_conversatie"], round(clf, 6))
        self.assertEqual(out["agent_cache_read_tokens_per_conversatie"], 15_000)
        self.assertEqual(out["agent_cache_write_tokens_per_conversatie"], 4_000)

    def test_groq_keeps_the_full_rate_count(self):
        # Groq rows can carry cached_tokens too; the existing cautious count prices every token in full.
        out = self.run_kosten("R84_G", "openai/gpt-oss-20b", [call("llm.agent", 20_000, 300, cached=15_000)])
        self.assertAlmostEqual(out["usd_agent_per_conversatie"], round(20_000 * 0.075 / 1e6 + 300 * 0.30 / 1e6, 6))
        self.assertNotIn("agent_cache_read_tokens_per_conversatie", out)

    def test_unknown_model_is_never_priced(self):
        out = self.run_kosten("R84_X", "some-unpriced-model", [call("llm.agent", 1_000, 10)])
        self.assertIsNone(out["usd_totaal_per_conversatie"])


if __name__ == "__main__":
    unittest.main()
