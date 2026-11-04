"""Offline only; no provider, database, fixture creation, or temporary files."""
import importlib.util
import os
from pathlib import Path
import sys
import types
import unittest
from unittest.mock import Mock, patch

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))
from s19_fixture_candidate import install_s19_prep


def load_core():
    harness = types.ModuleType('staging_harness')
    harness.RUN_MARKER = 'S19-OFFLINE'
    for name in ('rpc_process_whatsapp_message', 'call_staging', 'override_header', 'mgmt_sql'):
        setattr(harness, name, Mock(side_effect=AssertionError('Unexpected external call')))
    with patch.dict(sys.modules, staging_harness=harness), patch.dict(
        os.environ, {'BA_BAKEOFF_OUT': str(ROOT)}, clear=True
    ):
        spec = importlib.util.spec_from_file_location('s19_offline_core', ROOT / 'core.py')
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
    return module


class S19FixtureContract(unittest.TestCase):
    def setUp(self):
        self.core = load_core()
        self.core.mgmt_sql = Mock(return_value=[])
        self.service_readback = Mock(return_value=[
            {'id': 'a-knippen', 'calendar_id': 'cal-a', 'user_id': 'owner', 'name': 'Knippen', 'duration': 30, 'price': '40.00', 'is_active': True},
            {'id': 'b-knippen', 'calendar_id': 'cal-b', 'user_id': 'owner', 'name': 'Knippen', 'duration': 30, 'price': '40.00', 'is_active': True},
        ])
        install_s19_prep(self.core, self.service_readback)
        self.fx = {'owner': 'owner', 'svc_knip': 'a-knippen', 'calA': 'cal-a', 'calB': 'cal-b', 'cal_solo': 'solo', 'cal_pay': 'pay',
                   'svc_solo': ['solo-first'], 'svc_pay': ['pay-first'],
                   'services': {'A': ['a-knippen'], 'B': ['b-nagels', 'b-massage', 'b-knippen']},
                   'svc_bram_knippen': 'b-knippen'}
        self.bind = {'cal': 'cal-b', 'cal_bram': 'cal-b', 'cal_iris': 'cal-a',
                     'prep': [('booking', 'cal-b', '2026-11-10', '12:30', 'Klant S19')]}

    def test_s19_seeds_the_equivalent_owned_service_and_truthful_fields(self):
        result = self.core.prep_scenario('S19', self.bind, self.fx, '31600000319')
        sql = self.core.mgmt_sql.call_args.args[0]
        self.assertIn("'b-knippen'::uuid", sql)
        self.assertIn("'Knippen', 30, 40.00", sql)
        self.assertNotIn("'b-nagels'::uuid", sql)
        self.assertEqual(result['bookings'][0]['service_type_id'], 'b-knippen')
        self.assertEqual(result['bookings'][0]['booking_duration'], 30)
        self.assertEqual(result['bookings'][0]['service_name'], 'Knippen')
        self.service_readback.assert_called_once_with('a-knippen', 'b-knippen')

    def test_s19_missing_or_wrong_service_binding_fails_before_database(self):
        for value in (None, '', 'b-nagels', 'a-knippen'):
            with self.subTest(value=value):
                fx = {**self.fx, 'svc_bram_knippen': value}
                with self.assertRaises(ValueError):
                    self.core.prep_scenario('S19', self.bind, fx, '31600000319')
                self.core.mgmt_sql.assert_not_called()

    def test_other_scenario_keeps_existing_bram_first_service(self):
        self.core.prep_scenario('S03', self.bind, self.fx, '31600000303')
        self.assertIn("'b-nagels'::uuid", self.core.mgmt_sql.call_args.args[0])

    def test_inconsistent_calendars_or_multiple_source_bookings_fail_closed(self):
        bad_bindings = [
            {**self.bind, 'cal_bram': 'cal-a'},
            {**self.bind, 'cal_iris': 'cal-b'},
            {**self.bind, 'cal': 'cal-a'},
            {key: value for key, value in self.bind.items() if key != 'cal'},
            {**self.bind, 'prep': []},
            {**self.bind, 'prep': self.bind['prep'] * 2},
            {**self.bind, 'prep': [('booking', 'cal-a', '2026-11-10', '12:30', 'Klant S19')]},
        ]
        for binding in bad_bindings:
            with self.subTest(binding=binding):
                with self.assertRaises(ValueError):
                    self.core.prep_scenario('S19', binding, self.fx, '31600000319')
                self.core.mgmt_sql.assert_not_called()

    def test_cross_midnight_booking_is_refused(self):
        bind = {**self.bind, 'prep': [('booking', 'cal-b', '2026-11-10', '23:45', 'Klant S19')]}
        with self.assertRaises(ValueError):
            self.core.prep_scenario('S19', bind, self.fx, '31600000319')
        self.core.mgmt_sql.assert_not_called()

    def test_duplicate_service_binding_fails_before_database(self):
        fx = {**self.fx, 'services': {'A': ['a-knippen'], 'B': ['b-nagels', 'b-knippen', 'b-knippen']}}
        with self.assertRaises(ValueError):
            self.core.prep_scenario('S19', self.bind, fx, '31600000319')
        self.core.mgmt_sql.assert_not_called()

    def test_other_existing_b_service_and_missing_a_service_fail_before_insert(self):
        fx = {**self.fx, 'svc_bram_knippen': 'b-massage'}
        with self.assertRaises(ValueError):
            self.core.prep_scenario('S19', self.bind, fx, '31600000319')
        self.core.mgmt_sql.assert_not_called()
        self.service_readback.return_value = self.service_readback.return_value[1:]
        with self.assertRaises(ValueError):
            self.core.prep_scenario('S19', self.bind, self.fx, '31600000319')
        self.core.mgmt_sql.assert_not_called()

    def test_inactive_wrong_owner_or_price_fail_before_insert(self):
        original = self.service_readback.return_value
        for field, value in [('is_active', False), ('user_id', 'other'), ('price', '35.00'), ('name', 'Massage'), ('duration', 45)]:
            with self.subTest(field=field):
                self.service_readback.return_value = [original[0], {**original[1], field: value}]
                with self.assertRaises(ValueError):
                    self.core.prep_scenario('S19', self.bind, self.fx, '31600000319')
                self.core.mgmt_sql.assert_not_called()

    def test_service_readback_failure_does_not_insert(self):
        self.service_readback.side_effect = RuntimeError('readback unavailable')
        with self.assertRaisesRegex(RuntimeError, 'readback unavailable'):
            self.core.prep_scenario('S19', self.bind, self.fx, '31600000319')
        self.core.mgmt_sql.assert_not_called()

if __name__ == '__main__':
    unittest.main()
