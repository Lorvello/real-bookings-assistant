#!/usr/bin/env python3
"""
LAUNCH-RUN 2026-09 / R5-A. TWEE EXTRA TENANTS, en waarom die er MOETEN zijn.

DE VONDST DIE DIT AFDWONG, uit de eerste echte proefrun (kandidaat SMOKE, gpt-oss-20b):
  1. S01-G3 werd ROOD omdat de agent netjes de openingstijden van BEIDE kalenders van de tenant
     opnoemde (Iris en Bram). De poort eist de uren van :cal en niets anders. De basisfixture
     hangt CAL-A en CAL-B onder EEN eigenaar, dus elk FX-SINGLE-scenario draaide in werkelijkheid
     op een tenant met TWEE kalenders. FX-SINGLE eist letterlijk "een tenant met precies EEN
     kalender". De poort mat dus de fixture, niet het model.
  2. S05 boekte niets. De basisfixture zet `payment_required_for_booking = true` op CAL-A voor
     FX-PAY, en daarmee loopt ELK boekingsscenario op diezelfde kalender door de betaalroute.
     S05-G4 eist `status = 'confirmed'`; met vooruitbetaling kan dat nooit.

Daarom drie tenants in plaats van een:
  SOLO  : EEN kalender, GEEN vooruitbetaling.  FX-SINGLE, FX-BUSY, FX-CLOSED, FX-LONGDAY, FX-SHARED
  PAY   : EEN kalender, WEL vooruitbetaling.   FX-PAY
  MULTI : TWEE kalenders (Iris, Bram).         FX-MULTI

Alles draagt de run-marker in de kalendernaam, dus `staging_fixtures.py cleanup --apply` haalt de
kalenders weg; de twee extra auth-gebruikers ruimt `python3 prep2.py cleanup` zelf op, met
tellingen voor en na.
"""
from __future__ import annotations

import json
import os
import sys
import uuid

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.expanduser("~/Bookings Assistant/_automation"))
from core import FRI, MON, R05, RUN_MARKER, TUE, load_fixtures, mgmt_sql, q, ts  # noqa: E402
from staging_harness import BASE, http, service_role_key  # noqa: E402

SOLO_EMAIL = "ba-lr-2026-09-solo@bookingsassistant.invalid"
PAY_EMAIL = "ba-lr-2026-09-pay@bookingsassistant.invalid"
BUSY_PHONE = "31600000399"

SVC_SOLO = [("Knippen", 30, 40.00), ("Kleuren (colour)", 60, 75.00),
            ("Kleurspoeling (colour gloss)", 45, 55.00), ("Balayage", 120, 145.00)]
SVC_PAY = [("Knippen", 30, 40.00), ("Kleuren (colour)", 60, 75.00)]
RULES = [(2, "09:00", "19:30"), (3, "09:00", "17:00"), (4, "09:00", "17:00"),
         (5, "09:00", "19:30"), (6, "10:00", "16:00")]


def _tenant(email: str, calname: str, services, pay_now: bool) -> dict:
    uid = _create_user(email)
    rows = mgmt_sql(f"select count(*) as n from public.users where id = {q(uid)}::uuid")
    if rows[0]["n"] == 0:
        mgmt_sql(f"""insert into public.users (id, email, full_name, business_name, business_type)
                     values ({q(uid)}::uuid, {q(email)}, {q(RUN_MARKER + ' Owner')},
                             {q(RUN_MARKER + ' ' + calname)}, 'salon')""")
    else:
        mgmt_sql(f"""update public.users set business_name = {q(RUN_MARKER + ' ' + calname)},
                     full_name = {q(RUN_MARKER + ' Owner')} where id = {q(uid)}::uuid""")
    try:
        mgmt_sql(f"""update public.users set subscription_status='active',
                     subscription_tier='professional'::subscription_tier,
                     subscription_start_date=now(), subscription_end_date=now()+interval '90 days'
                     where id = {q(uid)}::uuid""")
    except SystemExit:
        pass

    cal = str(uuid.uuid4())
    mgmt_sql(f"""insert into public.calendars (id, user_id, name, slug, timezone, is_active,
                 is_default, description)
                 values ({q(cal)}::uuid, {q(uid)}::uuid, {q(RUN_MARKER + ' ' + calname)},
                 {q('ba-lr-2026-09-' + cal[:8])}, 'Europe/Amsterdam', true, true,
                 {q(RUN_MARKER + ' fixture')})""")
    mgmt_sql(f"""update public.calendar_settings set slot_duration=30, booking_window_days=365,
                 minimum_notice_hours=0, buffer_time=0, max_bookings_per_day=200,
                 allow_cancellations=true, confirmation_required=false, whatsapp_bot_active=true,
                 cancellation_deadline_hours=24 where calendar_id={q(cal)}::uuid""")
    mgmt_sql(f"""insert into public.calendar_settings (id, calendar_id, slot_duration,
                 booking_window_days, minimum_notice_hours, buffer_time, max_bookings_per_day,
                 allow_cancellations, confirmation_required, whatsapp_bot_active,
                 cancellation_deadline_hours)
                 select gen_random_uuid(), {q(cal)}::uuid, 30, 365, 0, 0, 200, true, false, true, 24
                 where not exists (select 1 from public.calendar_settings
                                   where calendar_id={q(cal)}::uuid)""")

    mgmt_sql(f"""delete from public.availability_rules r using public.availability_schedules s
                 where r.schedule_id=s.id and s.calendar_id={q(cal)}::uuid""")
    mgmt_sql(f"delete from public.availability_schedules where calendar_id={q(cal)}::uuid")
    sch = str(uuid.uuid4())
    mgmt_sql(f"""insert into public.availability_schedules (id, calendar_id, name, is_default)
                 values ({q(sch)}::uuid, {q(cal)}::uuid, {q(RUN_MARKER + ' schedule')}, true)""")
    mgmt_sql("insert into public.availability_rules (id, schedule_id, day_of_week, start_time, "
             "end_time, is_available) values " + ", ".join(
                 f"(gen_random_uuid(), {q(sch)}::uuid, {d}, '{a}'::time, '{b}'::time, true)"
                 for d, a, b in RULES))

    svc_ids = []
    vals = []
    for name, dur, price in services:
        sid = str(uuid.uuid4())
        svc_ids.append(sid)
        vals.append(f"({q(sid)}::uuid, {q(cal)}::uuid, {q(name)}, {q(RUN_MARKER)}, {dur}, "
                    f"{price}, true, 1, 'in_person')")
    mgmt_sql("insert into public.service_types (id, calendar_id, name, description, duration, "
             "price, is_active, max_attendees, supply_type) values " + ", ".join(vals))

    if pay_now:
        mgmt_sql(f"""update public.payment_settings set payment_required_for_booking=true,
                     secure_payments_enabled=true, allowed_payment_timing='["pay_now"]'::jsonb,
                     payment_optional=false where calendar_id={q(cal)}::uuid""")
        mgmt_sql(f"""insert into public.payment_settings (id, calendar_id, secure_payments_enabled,
                     payment_required_for_booking, platform_fee_percentage, allow_partial_refunds,
                     auto_cancel_unpaid_bookings, allowed_payment_timing, payment_optional)
                     select gen_random_uuid(), {q(cal)}::uuid, true, true, 1.9, false, false,
                     '["pay_now"]'::jsonb, false where not exists (select 1 from
                     public.payment_settings where calendar_id={q(cal)}::uuid)""")
    else:
        mgmt_sql(f"""update public.payment_settings set payment_required_for_booking=false,
                     secure_payments_enabled=false, payment_optional=true
                     where calendar_id={q(cal)}::uuid""")
    # GEMETEN: `business_overview` is een AFGELEIDE tabel. Een update daarop wordt door
    # `trigger_users_refresh_business_overview` weer overschreven zodra er iets aan users,
    # calendars, service_types of bookings verandert. De BRON is `public.users`; daar moet het
    # heen, anders staat S04-G5 halverwege de run ineens weer op NULL.
    mgmt_sql(f"""update public.users set business_phone='+31 20 123 4567',
                 business_email='salon@ba-fixture.invalid', business_whatsapp='+31 6 1234 5678'
                 where id = {q(uid)}::uuid""")
    return {"uid": uid, "cal": cal, "services": svc_ids}


def _create_user(email: str) -> str:
    srk = service_role_key()
    code, body = http(f"{BASE}/auth/v1/admin/users", method="POST",
                      headers={"Authorization": f"Bearer {srk}", "apikey": srk,
                               "Content-Type": "application/json"},
                      body={"email": email, "password": "Fixture!" + uuid.uuid4().hex[:12],
                            "email_confirm": True})
    if code >= 300:
        raise SystemExit(f"kon auth-gebruiker niet maken: HTTP {code} {body[:200]}")
    return json.loads(body)["id"]


def apply() -> dict:
    fx = load_fixtures()
    solo = _tenant(SOLO_EMAIL, "Salon Solo", SVC_SOLO, pay_now=False)
    pay = _tenant(PAY_EMAIL, "Salon Vooruit", SVC_PAY, pay_now=True)

    # SOLO: gesloten maandag (S27), bezet dinsdag 10:00 (S09/S12). Vrijdag is via RULES al lang.
    mgmt_sql(f"""insert into public.availability_overrides (id, calendar_id, date, is_available, reason)
                 values (gen_random_uuid(), {q(solo['cal'])}::uuid, {q(MON)}::date, false,
                 {q(RUN_MARKER + ' gesloten (S27)')})""")
    mgmt_sql(f"""insert into public.bookings (id, calendar_id, service_type_id, customer_name,
                 customer_phone, start_time, end_time, status, internal_notes, service_name,
                 booking_duration, total_price, customer_locale)
                 values (gen_random_uuid(), {q(solo['cal'])}::uuid, {q(solo['services'][0])}::uuid,
                 {q(RUN_MARKER + ' Bezet Tien Uur')}, {q(BUSY_PHONE)},
                 {q(ts(TUE, '10:00'))}::timestamptz, {q(ts(TUE, '10:30'))}::timestamptz,
                 'confirmed', {q(RUN_MARKER)}, 'Knippen', 30, 40.00, 'nl')""")

    # De MULTI-tenant mag GEEN vooruitbetaling meer eisen: S19 verzet daar een boeking.
    mgmt_sql(f"""update public.payment_settings set payment_required_for_booking=false,
                 secure_payments_enabled=false, payment_optional=true
                 where calendar_id in ({q(fx['calA'])}::uuid, {q(fx['calB'])}::uuid)""")

    fx["cal_solo"] = solo["cal"]
    fx["svc_solo"] = solo["services"]
    fx["uid_solo"] = solo["uid"]
    fx["cal_pay"] = pay["cal"]
    fx["svc_pay"] = pay["services"]
    fx["uid_pay"] = pay["uid"]
    fx["busy_start"] = ts(TUE, "10:00")
    fx["closed_date_r5"] = MON
    fx["long_date_r5"] = FRI
    with open(os.path.join(R05, "fixtures_r5.json"), "w", encoding="utf-8") as fh:
        json.dump(fx, fh, indent=2, ensure_ascii=False)
    return fx


def cleanup() -> dict:
    voor = mgmt_sql("select (select count(*) from public.users) u, "
                    "(select count(*) from public.calendars) c, "
                    "(select count(*) from public.bookings) b")[0]
    rows = mgmt_sql(f"select id from public.users where email in ({q(SOLO_EMAIL)},{q(PAY_EMAIL)})")
    for r in rows:
        srk = service_role_key()
        code, _ = http(f"{BASE}/auth/v1/admin/users/{r['id']}", method="DELETE",
                       headers={"Authorization": f"Bearer {srk}", "apikey": srk})
        print(f"  auth-gebruiker {r['id']} verwijderd: HTTP {code}")
        mgmt_sql(f"delete from public.users where id = {q(r['id'])}::uuid")
    na = mgmt_sql("select (select count(*) from public.users) u, "
                  "(select count(*) from public.calendars) c, "
                  "(select count(*) from public.bookings) b")[0]
    return {"voor": voor, "na": na, "verwijderde_gebruikers": len(rows)}


if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else "apply"
    if cmd == "apply":
        print(json.dumps(apply(), indent=1, ensure_ascii=False))
    else:
        print(json.dumps(cleanup(), indent=1, ensure_ascii=False, default=str))
