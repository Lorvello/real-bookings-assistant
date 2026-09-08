"""Offline R20 regressions. No real harness, secrets, provider calls or historical writes."""
import contextlib
import importlib.util
import io
import json
import os
from pathlib import Path
import sys
import tempfile
import types
import unittest
from types import SimpleNamespace
from unittest.mock import Mock, patch

ROOT = Path(__file__).resolve().parents[1]
STAGING = ROOT / "supabase/functions/whatsapp-agent-staging"
BUILD_ID = "sha256:" + "a" * 64


def load(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class CollectorTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        harness = types.ModuleType("staging_harness")
        harness.RUN_MARKER = "LOCAL-R20"
        for name in ("rpc_process_whatsapp_message", "call_staging", "override_header", "mgmt_sql"):
            setattr(harness, name, Mock(side_effect=AssertionError("Unexpected transport")))
        with patch.dict(sys.modules, staging_harness=harness), patch.dict(
            os.environ, {"BA_BAKEOFF_OUT": self.tmp.name}, clear=True
        ):
            self.core = load("r20_core", ROOT / "bakeoff/core.py")
        self.core.rpc_process_whatsapp_message.side_effect = None
        self.core.rpc_process_whatsapp_message.return_value = (200, "{}", 3)
        self.core.call_staging.side_effect = None
        self.staging = {"staging_build": True, "staging_build_id": BUILD_ID,
                        "slug": "whatsapp-agent-staging", "record_only": True,
                        "run_marker": "LOCAL-R20", "duration_ms": 12,
                        "meta_send_attempts_this_request": 0, "meta_send_allowed_total": 0}

    def turn(self, staging=None, **kwargs):
        body = {"reply": "Hoi", "staging": self.staging if staging is None else staging}
        self.core.call_staging.return_value = (200, json.dumps(body), 20)
        with patch.dict(os.environ, {}, clear=True):
            return self.core.run_turn("cal", "phone", "Hoi", "tag", "signed", **kwargs)

    def test_preserves_complete_staging_metadata(self):
        result = self.turn()
        self.assertEqual(result["staging"], self.staging)
        self.assertEqual(result["staging_build_id"], BUILD_ID)

    def test_expected_identity_matches(self):
        result = self.turn(expected_build_id=BUILD_ID)
        self.assertTrue(result["ok"])
        self.assertEqual(result["build_identity_check"], "matched")

    def test_missing_mismatched_and_boolean_identity_rejected(self):
        for value in (None, True, "sha256:" + "b" * 64):
            with self.subTest(value=value):
                result = self.turn({**self.staging, "staging_build_id": value}, expected_build_id=BUILD_ID)
                self.assertFalse(result["ok"])
                self.assertEqual(result["stage"], "measurement")
                self.assertTrue(result["measurement_error"])
                self.assertEqual(result["staging"]["staging_build_id"], value)

    def test_required_identity_missing_rejected_before_rpc(self):
        result = self.turn(require_build_identity=True)
        self.assertFalse(result["ok"])
        self.assertEqual(result["measurement_error"], "expected_build_id_missing")
        self.core.rpc_process_whatsapp_message.assert_not_called()

    def test_invalid_expected_identity_rejected_before_rpc(self):
        result = self.turn(expected_build_id=True)
        self.assertEqual(result["measurement_error"], "expected_build_id_invalid")
        self.core.rpc_process_whatsapp_message.assert_not_called()

    def test_non_json_response_cannot_evade_controlled_identity_check(self):
        self.core.call_staging.return_value = (200, "warm", 20)
        result = self.core.run_turn("cal", "phone", "Hoi", "tag", None, expected_build_id=BUILD_ID)
        self.assertFalse(result["ok"])
        self.assertEqual(result["measurement_error"], "staging_response_not_json")

    def test_environment_reaches_existing_callsite(self):
        self.core.call_staging.return_value = (200, json.dumps({"staging": self.staging}), 20)
        with patch.dict(os.environ, {"BA_BAKEOFF_EXPECTED_BUILD_ID": BUILD_ID}, clear=True):
            result = self.core.run_turn("cal", "phone", "Hoi", "tag", None)
        self.assertEqual(result["build_identity_check"], "matched")

    def runner(self):
        with patch.dict(sys.modules, core=self.core):
            return load("r20_runner", ROOT / "bakeoff/runner.py")

    def prepare_runner(self):
        self.core.load_suite = Mock(return_value={"scenarios": [{"id": "S01", "type": "info",
            "telefoon": "local", "beurten": [{"n": 1, "inbound": "Hoi"}]}]})
        self.core.load_fixtures = Mock(return_value={"calA": "A", "calB": "B"})
        self.core.bindings = Mock(return_value={"S01": {"cal": "A"}})
        self.core.facts_cached = Mock(return_value={})
        self.core.teardown_phone = Mock()
        self.core.prep_scenario = Mock(return_value={})
        self.core.snapshot = Mock(return_value={})
        self.core.call_staging.return_value = (200, json.dumps({"staging": self.staging}), 20)
        return SimpleNamespace(candidate="LOCAL", provider=None, model=None,
                               scenarios=None, token_floor=0)

    def test_runner_preflight_missing_expected_before_database(self):
        args = self.prepare_runner()
        with patch.dict(os.environ, {"BA_BAKEOFF_REQUIRE_BUILD_ID": "1"}, clear=True):
            self.assertEqual(self.runner().run_candidate(args), 2)
        self.core.prep_scenario.assert_not_called()
        self.core.facts_cached.assert_not_called()

    def test_runner_persists_rejected_turn_and_cleans_up(self):
        args = self.prepare_runner()
        with patch.dict(os.environ, {"BA_BAKEOFF_EXPECTED_BUILD_ID": "sha256:" + "b" * 64}, clear=True):
            self.assertEqual(self.runner().run_candidate(args), 2)
        output = Path(self.tmp.name) / "runs/LOCAL/S01.json"
        bundle = json.loads(output.read_text())
        self.assertEqual(bundle["turns"][0]["staging"], self.staging)
        self.assertTrue(bundle["turns"][0]["measurement_error"])
        self.assertEqual(self.core.teardown_phone.call_count, 2)
        self.assertFalse((output.parent / "_meta.json").exists())
        # The actual scorer rejects the persisted invalid bundle before semantic scoring.
        with patch.dict(sys.modules, core=self.core):
            scorer = load("r20_score", ROOT / "bakeoff/score.py")
        with self.assertRaisesRegex(SystemExit, "MEETFOUT"):
            scorer.score_candidate("LOCAL")

    def test_rejected_build_skips_fallible_post_turn_snapshot(self):
        args = self.prepare_runner()
        self.core.snapshot.side_effect = [{}, RuntimeError("snapshot unavailable")]
        with patch.dict(os.environ, {"BA_BAKEOFF_EXPECTED_BUILD_ID": "sha256:" + "b" * 64}, clear=True):
            self.assertEqual(self.runner().run_candidate(args), 2)
        output = Path(self.tmp.name) / "runs/LOCAL/S01.json"
        turn = json.loads(output.read_text())["turns"][0]
        self.assertEqual(turn["staging"], self.staging)
        self.assertTrue(turn["measurement_error"])
        self.assertIsNone(turn["snap"])
        self.assertEqual(turn["snapshot_status"], "skipped_measurement_error")
        self.assertEqual(self.core.snapshot.call_count, 1)
        self.assertEqual(self.core.teardown_phone.call_count, 2)
        self.assertFalse((output.parent / "_meta.json").exists())

    def test_runner_refuses_existing_bundle_before_database(self):
        args = self.prepare_runner()
        output = Path(self.tmp.name) / "runs/LOCAL/S01.json"
        output.parent.mkdir(parents=True)
        output.write_text("historic evidence")
        with patch.dict(os.environ, {}, clear=True):
            self.assertEqual(self.runner().run_candidate(args), 2)
        self.core.facts_cached.assert_not_called()
        self.assertEqual(output.read_text(), "historic evidence")

    def test_runner_success_persists_matched_identity(self):
        args = self.prepare_runner()
        with patch.dict(os.environ, {"BA_BAKEOFF_EXPECTED_BUILD_ID": BUILD_ID}, clear=True):
            self.assertEqual(self.runner().run_candidate(args), 0)
        output = Path(self.tmp.name) / "runs/LOCAL/S01.json"
        turn = json.loads(output.read_text())["turns"][0]
        self.assertEqual(turn["staging"], self.staging)
        self.assertEqual(turn["build_identity_check"], "matched")
        self.assertTrue((output.parent / "_meta.json").exists())

    def test_persistence_failure_still_cleans_up(self):
        args = self.prepare_runner()
        real_open = open
        def fail_bundle(path, *args, **kwargs):
            if str(path).endswith("S01.json"):
                raise OSError("intentional local persistence failure")
            return real_open(path, *args, **kwargs)
        with patch.dict(os.environ, {}, clear=True), patch("builtins.open", side_effect=fail_bundle):
            with self.assertRaisesRegex(OSError, "intentional"):
                self.runner().run_candidate(args)
        self.assertEqual(self.core.teardown_phone.call_count, 2)


class BuilderTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        root = Path(self.tmp.name)
        self.here = root / "whatsapp-agent-staging"
        self.here.mkdir()
        self.agent = root / "whatsapp-agent"
        self.agent.mkdir()
        (root / "_shared").mkdir()
        for name in ("stagingFlag.ts", "recorderSend.ts", "overrideLlm.ts", "stagingServe.ts", "netGuard.ts"):
            (self.here / name).write_bytes((STAGING / name).read_bytes())
        (self.agent / "index.ts").write_text(
            'import { sendWhatsAppText } from "../_shared/whatsappSend.ts";\n'
            'import { runAgent } from "./llm.ts";\n'
            'import { helper } from "./helper.ts";\n'
            'Deno.serve(async (req) => { return new Response("ok"); });\n')
        (self.agent / "helper.ts").write_text('export const helper = 1;\n')
        self.builder = load("r20_builder", STAGING / "build_staging.py")
        self.builder.HERE = str(self.here)
        self.builder.SRC = str(self.agent / "index.ts")
        self.builder.DST = str(self.here / "index.ts")

    def main(self, *args):
        with patch.object(sys, "argv", ["build_staging.py", *args]), contextlib.redirect_stdout(io.StringIO()):
            return self.builder.main()

    def test_stamp_written_and_checked_by_real_builder(self):
        self.assertEqual(self.main(), 0)
        flag = (self.here / "stagingFlag.ts").read_text()
        self.assertRegex(flag, r'STAGING_BUILD_ID: string \| null = "sha256:[a-f0-9]{64}"')
        self.assertEqual(self.main("--check"), 0)

    def test_indirect_runtime_change_invalidates_check(self):
        self.main()
        before = (self.here / "stagingFlag.ts").read_bytes()
        (self.agent / "helper.ts").write_text('export const helper = 2;\n')
        self.assertEqual(self.main("--check"), 1)
        self.assertEqual((self.here / "stagingFlag.ts").read_bytes(), before)
        self.main()
        self.assertNotEqual((self.here / "stagingFlag.ts").read_bytes(), before)

    def test_test_file_does_not_change_runtime_identity(self):
        self.main()
        (self.agent / "helper.test.ts").write_text("// test only\n")
        self.assertEqual(self.main("--check"), 0)

    def test_manual_stamp_tampering_is_rejected(self):
        self.main()
        path = self.here / "stagingFlag.ts"
        path.write_text(path.read_text().replace('"sha256:', '"sha256:BAD'))
        self.assertEqual(self.main("--check"), 1)


if __name__ == "__main__":
    unittest.main()
