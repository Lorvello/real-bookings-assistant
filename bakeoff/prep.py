#!/usr/bin/env python3
"""
LAUNCH-RUN 2026-09 / R5-A. DE FIXTURE-AANVULLING VOOR DE 30 SCENARIO'S.

`_automation/staging_fixtures.py seed` zet de basis (eigen tenant, twee kalenders, weekuren,
betaalinstellingen). De 30 scenario's van de suite vragen daar bovenop een paar dingen die de
basis niet heeft, en zonder die dingen meet een poort iets anders dan zijn tekst zegt:

  1. MEDEWERKERSNAMEN. S17 vraagt "is iris vrijdag nog vrij", S19 wil "ipv bij bram naar iris".
     Met kalenders die 'Salon A' en 'Salon B' heten kan geen enkel model dat goed doen; de poort
     zou dan het FIXTURE-gebrek meten en niet het model.
  2. DIENSTNAMEN. S21 eist dat de reply BEIDE diensten noemt die op de klantterm 'colour'
     matchen; S20 wisselt in het Nederlands naar 'kleur'; S24 boekt een 'balayage'. De basis
     heeft alleen 'Knippen' en 'Kleuren', en die dragen de run-marker in hun naam, waardoor een
     naam-poort vals rood wordt op een agent die de dienst gewoon correct noemt.
  3. DE GESLOTEN DAG moet de dag zijn waar de KLANT naar vraagt (S27 zegt "ma"), niet een
     woensdag die de basis toevallig koos, want S10 en S19 boeken juist op woensdag.
  4. DE LANGE DAG moet vrijdag zijn (S28 vraagt "friday"), niet dinsdag.
  5. HET BEZETTE SLOT moet 10:00 zijn (S09 vraagt "di 10 uur", S12 "tues 10"), niet 09:00.
  6. CONTACTGEGEVENS. S04-G5 eist LETTERLIJK een van `business_phone` / `business_email` /
     `business_whatsapp` in de reply. Staan die op NULL, dan is die poort per constructie rood.
     `refund_policy_text` blijft juist bewust LEEG: S16 gaat er expliciet over dat er GEEN
     terugbetalingsbeleid geconfigureerd is.

Alles hieronder raakt UITSLUITEND rijen die `staging_fixtures.py seed` zelf heeft aangemaakt
(kalenders met de run-marker in de naam) of nieuwe rijen op 316000003NN. Het opruimpad van de
suite plus `staging_fixtures.py cleanup` dekt het volledig.

  python3 prep.py apply      # aanvullen
  python3 prep.py report      # laten zien wat er nu staat
"""
from __future__ import annotations

import json
import os
import sys
import uuid

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from core import (  # noqa: E402
    FRI, MON, R05, RUN_MARKER, SAT, THU, TUE, WED, load_fixtures, mgmt_sql, q, ts,
)

SVC_A = [
    ("Knippen", 30, 40.00),
    ("Kleuren (colour)", 60, 75.00),
    ("Kleurspoeling (colour gloss)", 45, 55.00),
    ("Balayage", 120, 145.00),
]
SVC_B = [
    ("Nagels", 45, 35.00),
    ("Massage", 90, 95.00),
]
BUSY_PHONE = "31600000399"


def apply() -> dict:
    fx = load_fixtures()
    A, B = fx["calA"], fx["calB"]
    log = []

    # 1. medewerkersnamen (de run-marker BLIJFT in de naam: het opruimpad zoekt daarop)
    mgmt_sql(f"update public.calendars set name={q(RUN_MARKER + ' Iris')} where id={q(A)}::uuid")
    mgmt_sql(f"update public.calendars set name={q(RUN_MARKER + ' Bram')} where id={q(B)}::uuid")
    log.append("kalenders hernoemd naar Iris (A) en Bram (B)")

    # 2. diensten: de twee bestaande hernoemen, de rest erbij
    svc_a = fx["services"]["A"]
    svc_b = fx["services"]["B"]
    for sid, (name, dur, price) in zip(svc_a, SVC_A[:2]):
        mgmt_sql(f"update public.service_types set name={q(name)}, duration={dur}, price={price} "
                 f"where id={q(sid)}::uuid")
    for sid, (name, dur, price) in zip(svc_b, SVC_B):
        mgmt_sql(f"update public.service_types set name={q(name)}, duration={dur}, price={price} "
                 f"where id={q(sid)}::uuid")
    new_a = []
    for name, dur, price in SVC_A[2:]:
        row = mgmt_sql(f"select id from public.service_types where calendar_id={q(A)}::uuid "
                       f"and name={q(name)}")
        if row:
            new_a.append(row[0]["id"])
            continue
        nid = str(uuid.uuid4())
        mgmt_sql(f"""insert into public.service_types
            (id, calendar_id, name, description, duration, price, is_active, max_attendees, supply_type)
            values ({q(nid)}::uuid, {q(A)}::uuid, {q(name)}, {q(RUN_MARKER)}, {dur}, {price},
                    true, 1, 'in_person')""")
        new_a.append(nid)
    log.append(f"diensten A: {[s[0] for s in SVC_A]}; B: {[s[0] for s in SVC_B]}")

    # 3. gesloten dag naar MAANDAG (S27 vraagt "ma"); de woensdag weer openen (S10, S19)
    mgmt_sql(f"delete from public.availability_overrides where calendar_id={q(A)}::uuid")
    mgmt_sql(f"""insert into public.availability_overrides (id, calendar_id, date, is_available, reason)
        values (gen_random_uuid(), {q(A)}::uuid, {q(MON)}::date, false,
                {q(RUN_MARKER + ' gesloten (S27)')})""")
    log.append(f"gesloten dag = {MON} (maandag), woensdag weer open")

    # 4. lange dag naar VRIJDAG (S28 vraagt "friday"): weekregel 5 -> 09:00-19:30
    mgmt_sql(f"""update public.availability_rules r set start_time='09:00'::time, end_time='19:30'::time
        from public.availability_schedules s
        where r.schedule_id=s.id and s.calendar_id={q(A)}::uuid and r.day_of_week=5""")
    log.append(f"lange dag = {FRI} (vrijdag) 09:00-19:30 op A")

    # 5. bezet slot op 10:00 (S09, S12); het 09:00-slot van de basis mag blijven staan
    exists = mgmt_sql(f"select count(*) as n from public.bookings where calendar_id={q(A)}::uuid "
                      f"and start_time={q(ts(TUE, '10:00'))}::timestamptz and status='confirmed'")
    if exists[0]["n"] == 0:
        mgmt_sql(f"""insert into public.bookings (id, calendar_id, service_type_id, customer_name,
            customer_phone, start_time, end_time, status, internal_notes, service_name,
            booking_duration, total_price, customer_locale)
            values (gen_random_uuid(), {q(A)}::uuid, {q(svc_a[0])}::uuid,
                    {q(RUN_MARKER + ' Bezet Tien Uur')}, {q(BUSY_PHONE)},
                    {q(ts(TUE, '10:00'))}::timestamptz, {q(ts(TUE, '10:30'))}::timestamptz,
                    'confirmed', {q(RUN_MARKER)}, 'Knippen', 30, 40.00, 'nl')""")
    log.append(f"bezet slot {ts(TUE, '10:00')} op A (S09, S12)")

    # 6. contactgegevens (S04-G5). refund_policy_text blijft LEEG (S16 gaat daar juist over).
    mgmt_sql(f"""update public.business_overview
        set business_phone='+31 20 123 4567', business_email='salon@ba-fixture.invalid',
            business_whatsapp='+31 6 1234 5678'
        where calendar_id in ({q(A)}::uuid, {q(B)}::uuid)""")
    log.append("contactgegevens gezet, refund_policy_text bewust LEEG gelaten")

    fx["services"]["A"] = svc_a + new_a
    fx["svc_knip"] = svc_a[0]
    fx["svc_kleur"] = svc_a[1]
    fx["svc_gloss"] = new_a[0]
    fx["svc_balayage"] = new_a[1]
    fx["svc_bram"] = svc_b[0]
    fx["busy_start"] = ts(TUE, "10:00")
    fx["closed_date_r5"] = MON
    fx["long_date_r5"] = FRI
    with open(os.path.join(R05, "fixtures_r5.json"), "w", encoding="utf-8") as fh:
        json.dump(fx, fh, indent=2, ensure_ascii=False)
    return {"log": log, "fixtures": fx}


def report() -> dict:
    fx = load_fixtures()
    A, B = fx["calA"], fx["calB"]
    out = {
        "calendars": mgmt_sql(f"select id,name from public.calendars where id in ({q(A)}::uuid,{q(B)}::uuid)"),
        "services": mgmt_sql(f"select calendar_id,name,duration,price from public.service_types "
                             f"where calendar_id in ({q(A)}::uuid,{q(B)}::uuid) and is_active order by 1,2"),
        "rules": mgmt_sql(f"select c.name, r.day_of_week, to_char(r.start_time,'HH24:MI') s, "
                          f"to_char(r.end_time,'HH24:MI') e from public.availability_rules r "
                          f"join public.availability_schedules sc on sc.id=r.schedule_id "
                          f"join public.calendars c on c.id=sc.calendar_id "
                          f"where c.id in ({q(A)}::uuid,{q(B)}::uuid) order by 1,2"),
        "overrides": mgmt_sql(f"select calendar_id, date::text, is_available from "
                              f"public.availability_overrides where calendar_id in ({q(A)}::uuid,{q(B)}::uuid)"),
        "slots_check": {},
    }
    for label, date in [("MON(dicht)", MON), ("TUE", TUE), ("WED", WED), ("THU", THU),
                        ("FRI(lang)", FRI), ("SAT", SAT)]:
        r = mgmt_sql(f"select count(*) n, min(to_char(slot_start at time zone 'Europe/Amsterdam','HH24:MI')) lo, "
                     f"max(to_char(slot_start at time zone 'Europe/Amsterdam','HH24:MI')) hi from "
                     f"get_available_slots({q(A)}::uuid,{q(fx['services']['A'][0])}::uuid,"
                     f"{q(date)}::date,'Europe/Amsterdam') where is_available")
        out["slots_check"][f"{label} {date}"] = r[0]
    return out


if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else "report"
    if cmd == "apply":
        res = apply()
        for line in res["log"]:
            print(" -", line)
        print(json.dumps(report(), indent=1, ensure_ascii=False, default=str))
    else:
        print(json.dumps(report(), indent=1, ensure_ascii=False, default=str))
