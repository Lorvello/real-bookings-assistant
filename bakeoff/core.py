#!/usr/bin/env python3
"""
LAUNCH-RUN 2026-09 / R5-A. DE BAKE-OFF, KERN.

Bindingen, DB-momentopnamen, feiten en de bewijsbundel. Alles wat de scorer en de
rode-proef nodig hebben komt hier vandaan; niemand schrijft een query nog een keer
met de hand (de latency blijft volledig bij `_automation/latency_meter.py`).

De bewijsbundel per scenario:
  {
    "scenario": "S05", "candidate": "...", "phone": "...", "calendar": "...",
    "conv_id": "...", "t0": "...",
    "prep": {...}            # wat er VOOR het scenario is klaargezet (booking-ids enz.)
    "facts": {...}           # DB-waarheid: diensten, weekuren, slots, beleid, betaalinstellingen
    "snap0": {...}           # momentopname VOOR beurt 1
    "turns": [ {n, inbound, reply, toolCalls, http, wall_ms, staging, snap} ]
  }
Elke `snap` is de momentopname NA die beurt. De scorer leest alleen deze bundel, nooit
de live database; daardoor kan de rode proef exact dezelfde scorer op een GEWIJZIGDE
kopie draaien.
"""
from __future__ import annotations

import datetime as dt
import json
import os
import re
import sys
import uuid

# R36 opt-in validation before staging_harness import or output mkdir.
import gates as _contract_gates
_R36 = _contract_gates.r36_bootstrap(execution=True) if os.environ.get('BA_BAKEOFF_SUITE') else None

AUTOM = os.path.expanduser("~/Bookings Assistant/_automation")
sys.path.insert(0, AUTOM)
from staging_harness import (  # noqa: E402
    RUN_MARKER, rpc_process_whatsapp_message, call_staging, override_header,
)
from staging_harness import mgmt_sql as _mgmt_sql_raw  # noqa: E402


def mgmt_sql(sql: str, tries: int = 9):
    """De Mgmt-API knijpt af (HTTP 429 ThrottlerException). Een meting die daarop stukloopt is
    geen resultaat, dus hier wordt gewacht en opnieuw geprobeerd, met een zichtbare grens."""
    import time as _t
    last = None
    for i in range(tries):
        try:
            return _mgmt_sql_raw(sql)
        except SystemExit as e:
            last = e
            if "429" not in str(e):
                raise
            _t.sleep(3 + 4 * i)
    raise SystemExit(f"Mgmt-API bleef afknijpen na {tries} pogingen: {last}")

BA = os.path.expanduser("~/Bookings Assistant")
SUITE_PATH = os.path.join(BA, ".reliability/launch_run_2026_09/R00/scenario_suite_30_v2.json")
# R6-PRE: de uitvoermap is instelbaar. prep2.py schreef zijn bindingen HARD naar R05 en heeft
# daarmee een R05-bewijsbestand overschreven (zie R06PRE/INCIDENT_overschreven_R05_fixtures.md).
# Zonder terugval verandert er niets aan R5-gedrag: zonder env is dit exact R05.
R05 = os.environ.get("BA_BAKEOFF_OUT") or os.path.join(BA, ".reliability/launch_run_2026_09/R05")
os.makedirs(R05, exist_ok=True)
# De bindingen (drie tenants) staan in <OUT>/fixtures_r5.json; valt terug op de R-STAGING-basis.
FIXTURES_PATH = os.environ.get("BA_BAKEOFF_FIXTURES") or os.path.join(R05, "fixtures_r5.json")
if not os.path.exists(FIXTURES_PATH):
    FIXTURES_PATH = os.path.join(BA, ".reliability/launch_run_2026_09/RSTG/fixtures.json")

TZ = "+02"  # Europe/Amsterdam in september


def q(s) -> str:
    return "'" + str(s).replace("'", "''") + "'"


def load_suite() -> dict:
    if _R36 is not None:
        return _R36['suite']
    with open(SUITE_PATH, "r", encoding="utf-8") as fh:
        return json.load(fh)


def load_fixtures() -> dict:
    with open(FIXTURES_PATH, "r", encoding="utf-8") as fh:
        return json.load(fh)


# ==========================================================================================
# DE DATUMS. Vandaag is 2026-09-06 (zondag). day_of_week: 0=zo .. 6=za (Postgres).
# CAL-A (Iris) open di t/m za; CAL-B (Bram) open ma, di, do.
# ==========================================================================================
MON = "2026-09-07"   # maandag  -> A DICHT (weekregel + override)  : S27, S22
TUE = "2026-09-08"   # dinsdag  -> A 09:00-19:30                   : S09, S12, S20
WED = "2026-09-09"   # woensdag -> A 09:00-17:00                   : S10, S19
THU = "2026-09-10"   # donderdag-> A 09:00-17:00                   : S05, S06, S08, S11, S23, S24, S26
FRI = "2026-09-11"   # vrijdag  -> A 09:00-19:30 (LANGE DAG)       : S07, S17, S28
SAT = "2026-09-12"   # zaterdag -> A 10:00-16:00                   : S29, S30
FRI2 = "2026-09-18"  # vrijdag volgende week                       : S13


def ts(date: str, hhmm: str) -> str:
    return f"{date} {hhmm}:00{TZ}"


# ==========================================================================================
# DE BINDINGEN PER SCENARIO.
#   cal        : de INSTAP-kalender waarmee de beurt binnenkomt
#   prep       : welke rijen er VOOR het scenario moeten staan
#   verwacht   : de waarden waar de poorten op scoren (tijden, namen, diensten)
# ==========================================================================================
def bindings(fx: dict) -> dict:
    # DRIE tenants (zie bakeoff/prep2.py): SOLO voor elke enkele-kalender-fixture, PAY voor
    # FX-PAY, en de MULTI-tenant (Iris/Bram) alleen voor FX-MULTI.
    A, B = fx["cal_solo"], fx["cal_solo"]
    IRIS, BRAM = fx["calA"], fx["calB"]
    PAYCAL = fx["cal_pay"]
    b = {
        "S01": {"cal": A, "dow": 4, "date": THU},
        "S02": {"cal": A},
        "S03": {"cal": IRIS, "booking_cal": BRAM,
                "prep": [("booking", BRAM, THU, "10:00", "Klant S03")]},
        "S04": {"cal": A},
        "S05": {"cal": A, "date": THU, "time": "14:00", "name": "Sanne", "svc": "knip", "locale": "nl"},
        "S06": {"cal": A, "date": THU, "time": "14:00"},
        "S07": {"cal": A, "date": FRI, "time": "11:00", "name": "Privé", "svc": "knip"},
        "S08": {"cal": A, "date": THU, "time": "14:00", "alt": "15:00"},
        "S09": {"cal": A, "date": TUE, "time": "10:00", "svc": "knip"},
        "S10": {"cal": A, "date": WED, "time": "16:00",
                "prep": [("booking", A, THU, "11:00", "Klant S10")]},
        "S11": {"cal": A, "date": THU, "time": "16:30",
                "prep": [("booking", A, THU, "10:00", "Klant S11")]},
        "S12": {"cal": A, "date": TUE, "time": "10:00",
                "prep": [("booking", A, WED, "11:00", "Klant S12")]},
        "S13": {"cal": A, "date": FRI2, "time": "13:00",
                "prep": [("booking", A, THU, "10:00", "Nadia Bakker"),
                         ("booking", A, THU, "12:00", "Youssef El Amrani")]},
        "S14": {"cal": A, "prep": [("booking", A, THU, "13:00", "Klant S14")]},
        "S15": {"cal": A, "prep": [("booking", A, TUE, "11:00", "Anna de Vries"),
                                   ("booking", A, TUE, "12:30", "Bram Jansen")]},
        "S16": {"cal": A, "prep": [("booking", A, THU, "15:00", "Klant S16")]},
        "S17": {"cal": IRIS, "cal_iris": IRIS, "date": FRI, "svc": "knip"},
        "S18": {"cal": IRIS},
        "S19": {"cal": BRAM, "cal_iris": IRIS, "cal_bram": BRAM, "date": WED, "time": "15:00",
                "prep": [("booking", BRAM, WED, "10:00", "Klant S19")]},
        "S20": {"cal": A, "date": TUE, "time": None, "svc": "kleur", "name": "Lotte"},
        "S21": {"cal": A, "date": WED},
        "S22": {"cal": A, "date": MON},
        "S23": {"cal": A, "date": THU, "time": "14:00", "name": "Eve Janssen"},
        "S24": {"cal": A, "date": THU, "time": "14:00", "name": "Emma Visser", "svc": "balayage",
                "locale": "en"},
        "S25": {"cal": A, "prep": [("booking", A, TUE, "14:00", "Anna de Vries"),
                                   ("booking", A, TUE, "15:00", "Bram Jansen")]},
        "S26": {"cal": A, "date": THU, "time": "14:00", "name": "Sophie", "old_name": "Daan Peters"},
        "S27": {"cal": A, "closed_date": MON, "svc": "knip"},
        "S28": {"cal": A, "long_date": FRI, "svc": "knip"},
        "S29": {"cal": PAYCAL, "date": SAT, "time": "10:00", "name": "Youssef"},
        "S30": {"cal": PAYCAL, "date": SAT, "time": "10:00"},
    }
    return b


# ==========================================================================================
# PREP. De rijen die een scenario nodig heeft VOORDAT de agent iets doet.
# Alles op 316000003NN, dus het opruimcommando van de suite dekt het volledig.
# ==========================================================================================
def scenario_phone(sc_id: str, suite: dict) -> str:
    for s in suite["scenarios"]:
        if s["id"] == sc_id:
            return s["telefoon"]
    raise KeyError(sc_id)


def _first_service(fx: dict, cal: str) -> str:
    if cal == fx["cal_solo"]:
        return fx["svc_solo"][0]
    if cal == fx["cal_pay"]:
        return fx["svc_pay"][0]
    if cal == fx["calA"]:
        return fx["services"]["A"][0]
    return fx["services"]["B"][0]


def prep_scenario(sc_id: str, bind: dict, fx: dict, phone: str) -> dict:
    """Zet de vereiste bestaande rijen klaar, in EEN insert. Geeft de booking-ids terug."""
    made, vals = [], []
    for item in bind.get("prep", []):
        if item[0] != "booking":
            continue
        _, cal, date, time_, name = item
        svc = _first_service(fx, cal)
        dur = 45 if cal == fx["calB"] else 30
        bid = str(uuid.uuid4())
        end = add_minutes(time_, dur)
        vals.append(
            f"({q(bid)}::uuid, {q(cal)}::uuid, {q(svc)}::uuid, {q(name)}, {q(phone)}, "
            f"{q(ts(date, time_))}::timestamptz, {q(ts(date, end))}::timestamptz, 'confirmed', "
            f"{q(RUN_MARKER + ' prep ' + sc_id)}, 'Knippen', {dur}, 40.00, 'nl')")
        made.append({"id": bid, "calendar_id": cal, "start_time": ts(date, time_),
                     "customer_name": name})
    if vals:
        mgmt_sql("insert into public.bookings (id, calendar_id, service_type_id, customer_name, "
                 "customer_phone, start_time, end_time, status, internal_notes, service_name, "
                 "booking_duration, total_price, customer_locale) values " + ", ".join(vals))
    return {"bookings": made}


def add_minutes(hhmm: str, mins: int) -> str:
    h, m = (int(x) for x in hhmm.split(":"))
    t = dt.datetime(2000, 1, 1, h, m) + dt.timedelta(minutes=mins)
    return t.strftime("%H:%M")


# ==========================================================================================
# DE MOMENTOPNAME. Alles wat een poort van dit scenario kan lezen, in EEN query.
# ==========================================================================================
SNAP_SQL = """
select json_build_object(
  'at', now(),
  'bookings', coalesce((select json_agg(row_to_json(x)) from (
      select id, calendar_id, service_type_id, customer_name, customer_phone,
             (start_time at time zone 'Europe/Amsterdam')::text as start_time,
             (end_time at time zone 'Europe/Amsterdam')::text as end_time,
             status, cancelled_at, cancellation_reason, updated_at, customer_locale,
             payment_status, payment_required, payment_timing, total_price
      from public.bookings where customer_phone = {phone} order by start_time) x), '[]'::json),
  'cal_bookings', coalesce((select json_agg(row_to_json(y)) from (
      select id, customer_name, customer_phone,
             (start_time at time zone 'Europe/Amsterdam')::text as start_time,
             (end_time at time zone 'Europe/Amsterdam')::text as end_time,
             status, cancelled_at, updated_at
      from public.bookings
      where calendar_id in ({cals}) and start_time > now() - interval '1 day'
      order by start_time) y), '[]'::json),
  'agent_actions', coalesce((select json_agg(row_to_json(z)) from (
      select a.id, a.booking_id, a.calendar_id, a.action_type, a.actor, a.channel,
             a.old_value, a.new_value, a.created_at
      from public.agent_actions a
      where a.booking_id in (select id from public.bookings where customer_phone = {phone})
         or (a.calendar_id in ({cals}) and a.created_at >= {t0}::timestamptz)
      order by a.created_at) z), '[]'::json),
  'conversations', coalesce((select json_agg(row_to_json(c)) from (
      -- R6-PRE INSTRUMENTREPARATIE. `whatsapp_conversations.phone_number` is op ELKE rij in dit
      -- project NULL (gemeten 2026-09-06: 9 rijen, 0 met een waarde); de agent legt het gesprek
      -- vast via `contact_id` -> `whatsapp_contacts.phone_number`. Filteren op phone_number gaf
      -- dus ALTIJD nul rijen, waardoor elke marker-poort (pending_booking, pending_cancel,
      -- pending_cancel_verification, pending_book_takeover_verification) per constructie rood
      -- was, ongeacht wat de agent deed. Bewezen met een live proef: na S14 draagt het gesprek
      -- wel degelijk `pending_cancel_verification`, terwijl de momentopname leeg bleef.
      select c.id, c.calendar_id, k.phone_number, c.context, c.last_message_at
      from public.whatsapp_conversations c
      join public.whatsapp_contacts k on k.id = c.contact_id
      where k.phone_number = {phone}) c), '[]'::json),
  'contacts', coalesce((select json_agg(row_to_json(k)) from (
      select id, phone_number, first_name, last_name, display_name, name_asked
      from public.whatsapp_contacts where phone_number = {phone}) k), '[]'::json),
  'payment_sessions', coalesce((select json_agg(row_to_json(p)) from (
      select s.id, s.conversation_id, s.payment_status, s.payment_url, s.created_at
      from public.whatsapp_payment_sessions s
      where s.conversation_id in (select c.id from public.whatsapp_conversations c
                                  join public.whatsapp_contacts k on k.id = c.contact_id
                                  where k.phone_number = {phone})) p), '[]'::json),
  'booking_payments_after_t0', (select count(*) from public.booking_payments
      where created_at >= {t0}::timestamptz or updated_at >= {t0}::timestamptz),
  'monitoring_alerts', (select count(*) from public.monitoring_alerts
      where created_at >= {t0}::timestamptz and contact_phone = {phone})
) as snap
"""


def snapshot(phone: str, cals: list[str], t0: str) -> dict:
    template = SNAP_SQL
    if _R36 is not None:
        template = template.replace('s.payment_url, s.created_at',
                                    's.payment_url, s.created_at, s.booking_id, s.stripe_session_id')
    sql = template.format(phone=q(phone), cals=", ".join(q(c) + "::uuid" for c in cals), t0=q(t0))
    return mgmt_sql(sql)[0]["snap"]


# ==========================================================================================
# DE FEITEN. De DB-waarheid waar `reply_vs_db`-poorten tegen scoren.
# ==========================================================================================
_FACTS_CACHE: dict = {}


def facts_cached(bind: dict, fx: dict, dates: list[str], cache_path: str | None = None) -> dict:
    """De feiten veranderen tijdens een run niet (de fixture staat vast). Ze een keer ophalen
    scheelt acht Mgmt-calls per kandidaat, en die API knijpt af zodra drie subagents hem delen."""
    key = "|".join(sorted(dates))
    if key in _FACTS_CACHE:
        return _FACTS_CACHE[key]
    if cache_path and os.path.exists(cache_path):
        with open(cache_path, "r", encoding="utf-8") as fh:
            _FACTS_CACHE[key] = json.load(fh)
            return _FACTS_CACHE[key]
    f = facts(bind, fx, dates)
    _FACTS_CACHE[key] = f
    if cache_path:
        os.makedirs(os.path.dirname(cache_path), exist_ok=True)
        with open(cache_path, "w", encoding="utf-8") as fh:
            json.dump(f, fh, indent=1, ensure_ascii=False, default=str)
    return f


def all_calendars(fx: dict) -> list[str]:
    return sorted({fx["cal_solo"], fx["cal_pay"], fx["calA"], fx["calB"]})


def facts(bind: dict, fx: dict, dates: list[str]) -> dict:
    cal_list = all_calendars(fx)
    inlist = ", ".join(q(c) + "::uuid" for c in cal_list)
    out: dict = {}
    out["services"] = mgmt_sql(
        f"select id, calendar_id, name, duration, price, is_active from public.service_types "
        f"where calendar_id in ({inlist}) and is_active order by calendar_id, name")
    out["weekhours"] = mgmt_sql(
        f"select c.id as calendar_id, c.name as calendar_name, r.day_of_week, "
        f"       to_char(r.start_time,'HH24:MI') as start_time, to_char(r.end_time,'HH24:MI') as end_time, "
        f"       r.is_available "
        f"from public.availability_rules r "
        f"join public.availability_schedules s on s.id = r.schedule_id "
        f"join public.calendars c on c.id = s.calendar_id "
        f"where c.id in ({inlist}) order by c.id, r.day_of_week")
    out["overrides"] = mgmt_sql(
        f"select calendar_id, date::text as date, is_available, "
        f"       to_char(start_time,'HH24:MI') as start_time, to_char(end_time,'HH24:MI') as end_time "
        f"from public.availability_overrides where calendar_id in ({inlist})")
    out["calendar_settings"] = mgmt_sql(
        f"select calendar_id, cancellation_deadline_hours, slot_duration, minimum_notice_hours "
        f"from public.calendar_settings where calendar_id in ({inlist})")
    out["payment_settings"] = mgmt_sql(
        f"select calendar_id, payment_required_for_booking, payment_optional, "
        f"       allowed_payment_timing, payment_deadline_hours "
        f"from public.payment_settings where calendar_id in ({inlist})")
    out["business_overview"] = mgmt_sql(
        f"select calendar_id, business_phone, business_email, business_whatsapp, "
        f"       business_description, cancellation_policy, payment_info, preparation_info, "
        f"       other_info, refund_policy_text "
        f"from public.business_overview where calendar_id in ({inlist})")
    out["calendars"] = mgmt_sql(
        f"select id, name, user_id from public.calendars where id in ({inlist})")
    # Slots per (kalender, dienst, datum) in EEN query. Los per combinatie zou 100+ calls
    # kosten en de Mgmt-API knijpt dan af; wat je daarna meet is de rem, niet de agenda.
    cals = cal_list
    combos = []
    for d in dates:
        for cal in cals:
            for s in out["services"]:
                combos.append((cal, s["id"], d))
    slots: dict = {f"{c}|{s}|{d}": [] for c, s, d in combos}
    if combos:
        vals = ", ".join(f"({q(c)},{q(s)},{q(d)})" for c, s, d in combos)
        rows = mgmt_sql(
            f"select k.cal, k.svc, k.d, "
            f"to_char(g.slot_start at time zone 'Europe/Amsterdam','HH24:MI') as t "
            f"from (values {vals}) as k(cal,svc,d) "
            f"cross join lateral get_available_slots(k.cal::uuid, k.svc::uuid, k.d::date, "
            f"'Europe/Amsterdam') g where g.is_available order by 1,2,3,4")
        for r in rows:
            slots[f"{r['cal']}|{r['svc']}|{r['d']}"].append(r["t"])
    out["slots"] = slots
    out["dates"] = dates
    return out


def scenario_dates(sc_id: str, bind: dict) -> list[str]:
    d = set()
    for k in ("date", "closed_date", "long_date"):
        if bind.get(k):
            d.add(bind[k])
    # De omliggende dagen erbij: een reply mag een alternatief op een andere dag noemen en dat
    # moet dan OOK tegen de echte slots getoetst kunnen worden.
    for extra in (MON, TUE, WED, THU, FRI, SAT):
        d.add(extra)
    return sorted(d)


# ==========================================================================================
# EEN BEURT DRAAIEN via het veilige testpad.
# ==========================================================================================
def build_identity_expectation(expected_build_id=None, require_build_identity=False) -> tuple[str | None, str | None]:
    """Set BA_BAKEOFF_EXPECTED_BUILD_ID to bind existing runner calls to frozen sources.
    BA_BAKEOFF_REQUIRE_BUILD_ID=1 additionally rejects missing configuration before DB work.
    Never infer an expected ID from the response being measured.
    """
    expected = expected_build_id if expected_build_id is not None else os.environ.get("BA_BAKEOFF_EXPECTED_BUILD_ID")
    required = require_build_identity or os.environ.get("BA_BAKEOFF_REQUIRE_BUILD_ID") == "1"
    if expected is None:
        return None, "expected_build_id_missing" if required else None
    if not isinstance(expected, str) or not re.fullmatch(r"sha256:[a-f0-9]{64}", expected):
        return None, "expected_build_id_invalid"
    return expected, None


def run_turn(calendar: str, phone: str, text: str, tag: str, ov: str | None, timeout: int = 240,
             *, expected_build_id: str | None = None, require_build_identity: bool = False) -> dict:
    expected, config_error = build_identity_expectation(expected_build_id, require_build_identity)
    if config_error:
        return {"ok": False, "stage": "measurement", "measurement_error": config_error}
    message_id = f"{RUN_MARKER}-{tag}-{uuid.uuid4().hex[:10]}"
    code, body, rpc_ms = rpc_process_whatsapp_message(phone, message_id, text, calendar)
    if code >= 300:
        return {"ok": False, "stage": "rpc", "http": code, "body": body[:300],
                "message_id": message_id}
    code, text_resp, wall_ms = call_staging(
        {"phone": phone, "calendar_id": calendar, "message": text, "contact_name": None},
        ov=ov, timeout=timeout)
    try:
        parsed = json.loads(text_resp)
    except Exception:
        return {"ok": False, "stage": "agent", "http": code, "body": text_resp[:400],
                "message_id": message_id,
                **({"stage": "measurement", "measurement_error": "staging_response_not_json",
                    "expected_build_id": expected, "build_identity_check": "rejected"}
                   if expected is not None else {})}
    if not isinstance(parsed, dict):
        parsed = {"error": "invalid_agent_response"}
    st = parsed.get("staging") if isinstance(parsed.get("staging"), dict) else {}
    actual = st.get("staging_build_id")
    identity_error = None
    if expected is not None:
        if not isinstance(actual, str) or not re.fullmatch(r"sha256:[a-f0-9]{64}", actual):
            identity_error = "staging_build_id_missing_or_invalid"
        elif actual != expected:
            identity_error = "staging_build_id_mismatch"
    return {
        "ok": code < 300 and identity_error is None,
        **({"stage": "measurement", "measurement_error": identity_error} if identity_error else {}),
        "staging": st,
        "staging_build": st.get("staging_build"),
        "staging_build_id": actual,
        "expected_build_id": expected,
        "build_identity_check": "rejected" if identity_error else "matched" if expected else "unbound",
        "message_id": message_id,
        "http": code,
        "rpc_ms": rpc_ms,
        "client_wall_ms": wall_ms,
        "fn_duration_ms": st.get("duration_ms"),
        "reply": parsed.get("reply"),
        "toolCalls": parsed.get("toolCalls") or [],
        "sent": parsed.get("sent"),
        "meta_attempts": st.get("meta_send_attempts_this_request"),
        "meta_allowed": st.get("meta_send_allowed_total"),
        "llm_effective": st.get("llm_effective"),
        "llm_models": st.get("llm_models_on_the_wire"),
        "llm_agent_model": st.get("llm_agent_model_on_the_wire"),
        "llm_usage": st.get("llm_usage"),
        "phases": st.get("phases"),
        "error": parsed.get("error"),
    }


def now_utc() -> str:
    return dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%d %H:%M:%S+00")


# ==========================================================================================
# TEARDOWN PER SCENARIO.
# WAAROM PER SCENARIO EN NIET PAS AAN HET EIND: vijf scenario's boeken allemaal donderdag
# 14:00 (S05, S06, S08, S23, S26) en S24 wil daar een balayage. Zou S05's boeking blijven
# staan, dan meten de vier scenario's daarna niet meer het model maar een bezet slot dat
# de vorige beurt zelf heeft gemaakt. Elke scenario begint dus schoon, ook wat betreft de
# gesprekscontext (anders erft kandidaat 2 de `pending_booking` van kandidaat 1).
# ==========================================================================================
def teardown_phone(phone: str, keep_messages: bool = False) -> dict:
    """Alles van EEN scenario-nummer weg, in EEN enkele query. Los per tabel zou 11 calls
    kosten en de Mgmt-API knijpt af zodra drie subagents hem tegelijk gebruiken; wat je daarna
    meet is de rem op het meetinstrument.

    `keep_messages=True` LAAT `whatsapp_messages` en `whatsapp_conversations` STAAN.
    GEMETEN WAAROM DIT ER MOET ZIJN: de eerste C1-run ruimde na elk scenario ook de berichten
    op, en `latency_meter.py --marker BA-LR-2026-09-C1` gaf daarna **MEETFOUT, 0 inbound-rijen
    met de marker**. De meter ankert op `whatsapp_messages.message_id`; wie die rijen weggooit,
    gooit de meting weg. De boekingen MOETEN wel weg na elk scenario (vijf scenario's boeken
    allemaal donderdag 14:00), de berichten juist niet. Volle opruiming volgt NA de
    latency-meting van die kandidaat."""
    p = q(phone)
    berichten = "" if keep_messages else f"""
         d4 as (delete from public.whatsapp_messages where conversation_id in (select id from conv)),
         d7 as (delete from public.whatsapp_conversations where id in (select id from conv)),
         d8 as (delete from public.whatsapp_contacts where phone_number = {p}),"""
    sql = f"""
    with conv as (select c.id from public.whatsapp_conversations c
                  join public.whatsapp_contacts k on k.id = c.contact_id
                  where k.phone_number = {p}),
         bk as (select id from public.bookings where customer_phone = {p}),
         d1 as (delete from public.agent_actions where booking_id in (select id from bk)),
         d2 as (delete from public.whatsapp_payment_sessions
                where conversation_id in (select id from conv)),
         d3 as (delete from public.booking_payments where booking_id in (select id from bk)),
         {berichten}
         d5 as (delete from public.monitoring_alerts where contact_phone = {p}),
         d9 as (delete from public.whatsapp_contact_overview where phone_number = {p}),
         d6 as (delete from public.bookings where customer_phone = {p})
    select (select count(*) from bk) as bookings_weg, (select count(*) from conv) as conv_weg
    """
    return mgmt_sql(sql)[0]


def r36_fresh_postcommit_slots(bundle):
    """Fresh exact query after the commit snapshot; deliberately never facts_cached."""
    ev = _contract_gates.R36Ev(bundle)
    svc = _contract_gates.r36_service(ev)
    rows = ev.bookings(ev.snap(4))
    if len(rows) != 1:
        raise ValueError('No unique T4 booking for postcommit slot evidence')
    row = rows[0]
    cal, date = ev.bind['cal'], ev.bind['date']
    if row['calendar_id'] != cal or row['service_type_id'] != svc['id']:
        raise ValueError('Commit differs from exact slot query scope')
    result = mgmt_sql(f"select now() as observed_at, coalesce(json_agg(to_char(g.slot_start "
        f"at time zone 'Europe/Amsterdam','HH24:MI')) filter (where g.is_available), "
        f"'[]'::json) as free_starts from get_available_slots({q(cal)}::uuid, "
        f"{q(svc['id'])}::uuid, {q(date)}::date, 'Europe/Amsterdam') g")[0]
    return {'source': 'get_available_slots_fresh_after_T4', 'calendar_id': cal,
            'service_type_id': svc['id'], 'date': date, 'timezone': 'Europe/Amsterdam',
            'booking_id': row['id'], **result}
