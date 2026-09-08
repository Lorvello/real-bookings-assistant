#!/usr/bin/env python3
"""
LAUNCH-RUN 2026-09 / R5-A. DE RED-PROOF PREFLIGHT.

DE OPENSTAANDE POORT VAN R0-B-FIX, en die gaat VOOR de bake-off. De 30-scenario-suite is
geleverd, maar zijn rood-bewijzen zijn ONTWORPEN en nooit UITGEVOERD: het scoringsharnas
bestond niet. Bindend uit de state:

  "R5 draait eerst de RED-PROOF PREFLIGHT naar R05/red_proof_preflight.json, en pas als elke
   falsificatieklasse aantoonbaar ROOD krijgt, telt een groen cijfer op deze suite als meting."

WAT ER GEBEURT
  0. NEGATIEVE CONTROLE: de ONGEWIJZIGDE gouden bundel wordt gescoord. Elke poort die daar al
     rood staat is een defect in de scorer of in de gouden bundel, en wordt bij naam gemeld.
     Zonder deze stap zou een injectie die rood oplevert niets bewijzen.
  1. Per falsificatieklasse F1 tot en met F11 wordt de injectie op een KOPIE van het bewijs
     gedaan en de scorer opnieuw gedraaid. Geteld wordt alleen wat GROEN naar ROOD KANTELT.
     Een poort die al rood stond telt niet mee: dat is de val waar deze hele proef om bestaat.
  2. F11 SILENT-AGENT krijgt zijn eigen telling PER SCENARIO. De suite BEWEERT 43 poorten en
     minstens 1 per scenario; deze proef telt dat NA in plaats van het te geloven.

Injectie is altijd op een diepe kopie. De echte bundels op schijf worden nooit aangeraakt.
"""
from __future__ import annotations

import copy
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import core  # noqa: E402
import gates  # noqa: E402
import golden  # noqa: E402

GUARD_FALLBACK = ("Ik heb daar geen bevestigde informatie over, dus ik ga daar niet naar "
                  "gokken.")


# ==========================================================================================
# DE INJECTIES. Elke functie krijgt een DIEPE KOPIE en geeft die gewijzigd terug.
# ==========================================================================================
def f1_tool_swap(b: dict) -> dict:
    """Pas A: vervang elke toolnaam door een LEES-tool."""
    for t in b["turns"]:
        t["toolCalls"] = ["get_business_data"] if t["toolCalls"] != ["get_business_data"] \
            else ["update_lead"]
    return b


def f1b_tool_swap_mutatie(b: dict) -> dict:
    """Pas B: vervang elke toolnaam door een MUTATIE-tool. Zonder deze pas kan geen enkele
    'bevat GEEN van de vier mutatietools'-poort ooit rood worden, en dat zijn er 8."""
    for t in b["turns"]:
        t["toolCalls"] = ["book_appointment", "cancel_appointment", "reschedule_appointment",
                          "update_booking_name"]
    return b


def f1c_tool_duplicate(b: dict) -> dict:
    """Pas C: verdubbel elke toolaanroep (S21-G2 telt duplicaten)."""
    for t in b["turns"]:
        t["toolCalls"] = list(t["toolCalls"]) * 2
    return b


def f2_row_delete(b: dict) -> dict:
    for t in b["turns"]:
        t["snap"]["bookings"] = []
    return b


def f3b_status_cancel(b: dict) -> dict:
    """Zet de eerste boeking op geannuleerd MET cancelled_at: de 'nul annuleringen'-poorten
    hangen aan dat veld, niet aan het aantal rijen."""
    for t in b["turns"]:
        for row in t["snap"]["bookings"][:1]:
            row["status"] = "cancelled"
            row["cancelled_at"] = "2026-09-06 12:00:00+00"
    return b


def f3_field_flip(b: dict) -> dict:
    for t in b["turns"]:
        for row in t["snap"]["bookings"]:
            if row.get("status") == "confirmed":
                row["status"] = "pending"
            elif row.get("status") == "pending":
                row["status"] = "confirmed"
            st = str(row.get("start_time") or "")
            if len(st) > 13:
                hh = int(st[11:13])
                row["start_time"] = st[:11] + f"{(hh + 1) % 24:02d}" + st[13:]
    return b


def f4_ghost_row(b: dict) -> dict:
    """Een EXTRA rij, in ELKE tabel waar een db_absence-poort op telt. Alleen `bookings`
    zou zeven nul-tellingen ongemoeid laten (alerts, audits, betaalsessies, betalingen)."""
    d = b["bind"].get("date") or b["bind"].get("long_date") or b["bind"].get("closed_date") \
        or core.SAT
    t_ = b["bind"].get("time") or "11:00"
    ghost = {
        "id": "ghost-1", "calendar_id": b["bind"]["cal"], "service_type_id": None,
        "customer_name": "Ghost", "customer_phone": b["phone"],
        "start_time": core.ts(d, t_), "end_time": core.ts(d, core.add_minutes(t_, 30)),
        "status": "confirmed", "cancelled_at": None, "cancellation_reason": None,
        "updated_at": "2026-09-06 11:11:11+00", "customer_locale": "nl",
        "payment_status": None, "payment_required": None, "payment_timing": None,
        "total_price": 40.0,
    }
    prep_ids = [x["id"] for x in (b.get("prep", {}).get("bookings") or [])]
    doel = prep_ids[0] if prep_ids else "ghost-1"
    for t in b["turns"]:
        t["snap"]["bookings"] = list(t["snap"]["bookings"]) + [copy.deepcopy(ghost)]
        t["snap"]["agent_actions"] = list(t["snap"]["agent_actions"]) + [
            {"id": "ghost-a0", "booking_id": doel, "calendar_id": b["bind"]["cal"],
             "action_type": "reschedule", "actor": "agent", "channel": "whatsapp",
             "old_value": {}, "new_value": {}, "created_at": "2026-09-06 11:11:11+00"},
            {"id": "ghost-a1", "booking_id": "ghost-1", "calendar_id": b["bind"]["cal"],
             "action_type": "book", "actor": "agent", "channel": "whatsapp",
             "old_value": {}, "new_value": {}, "created_at": "2026-09-06 11:11:11+00"},
            {"id": "ghost-a2", "booking_id": "ghost-1", "calendar_id": b["bind"]["cal"],
             "action_type": "cancel", "actor": "agent", "channel": "whatsapp",
             "old_value": {}, "new_value": {}, "created_at": "2026-09-06 11:11:11+00"},
            {"id": "ghost-a3", "booking_id": "ghost-1", "calendar_id": b["bind"]["cal"],
             "action_type": "reschedule", "actor": "agent", "channel": "whatsapp",
             "old_value": {}, "new_value": {}, "created_at": "2026-09-06 11:11:11+00"},
        ]
        t["snap"]["payment_sessions"] = list(t["snap"].get("payment_sessions") or []) + [
            {"id": "ghost-ps", "conversation_id": "conv-gold", "payment_status": "paid",
             "payment_url": "https://elders.example/x", "created_at": "2026-09-06 11:11:11+00"}]
        t["snap"]["booking_payments_after_t0"] = (t["snap"].get("booking_payments_after_t0") or 0) + 1
        t["snap"]["monitoring_alerts"] = (t["snap"].get("monitoring_alerts") or 0) + 1
    return b


def f5_time_inject(b: dict) -> dict:
    for t in b["turns"]:
        t["reply"] = (t["reply"] or "") + " Ook 19:45 is nog vrij."
    return b


def f6b_name_in_reply(b: dict) -> dict:
    """De naam van de ANDERE boeking in de reply zetten (de DB blijft ongemoeid). Dit is de
    helft van NAME-FLIP die de reply-tegen-DB-poorten raakt."""
    rows = b["snap0"].get("bookings") or []
    namen = [r.get("customer_name") for r in rows if r.get("customer_name")]
    if len(namen) >= 2:
        for t in b["turns"]:
            t["reply"] = (t["reply"] or "").replace(namen[0], namen[1])
    # dienstnaam herschrijven: S24-G2 eist byte-identiek
    for s_ in b["facts"]["services"]:
        head = s_["name"].split("(")[0].strip()
        for t in b["turns"]:
            if head and head in (t["reply"] or ""):
                t["reply"] = t["reply"].replace(head, head.upper())
    return b


def f6_name_flip(b: dict) -> dict:
    for t in b["turns"]:
        if not (t["snap"].get("contacts") or []):
            t["snap"]["contacts"] = [{"phone_number": b["phone"], "first_name": "Verzonnen",
                                      "last_name": None, "display_name": None,
                                      "name_asked": True}]
        for row in t["snap"]["bookings"]:
            if row.get("customer_name"):
                row["customer_name"] = "Iemand Anders"
        for c in t["snap"].get("contacts") or []:
            if c.get("first_name"):
                c["first_name"] = "Iemand"
        for cv in t["snap"].get("conversations") or []:
            ctx = cv.get("context") or {}
            for k, v in list(ctx.items()):
                if isinstance(v, dict):
                    if "current_name" in v:
                        v["current_name"] = "Iemand Anders"
                    if "proposed_name" in v:
                        v["proposed_name"] = "Iemand Anders"
    return b


def f7_url_strip(b: dict) -> dict:
    for t in b["turns"]:
        for ps in t["snap"].get("payment_sessions") or []:
            ps["payment_url"] = None
    return b


def f7b_url_host(b: dict) -> dict:
    for t in b["turns"]:
        for ps in t["snap"].get("payment_sessions") or []:
            if ps.get("payment_url"):
                ps["payment_url"] = "https://checkout.niet-stripe.example/c/pay/x"
                t["reply"] = (t["reply"] or "").replace(
                    "https://checkout.stripe.com/c/pay/cs_test_gold",
                    "https://checkout.niet-stripe.example/c/pay/x")
    return b


def f8_marker_wipe(b: dict) -> dict:
    for t in b["turns"]:
        for cv in t["snap"].get("conversations") or []:
            ctx = cv.get("context") or {}
            for k in ("pending_booking", "pending_cancel", "pending_book_takeover_verification",
                      "pending_cancel_verification"):
                ctx.pop(k, None)
    return b


def f8b_marker_plant(b: dict) -> dict:
    """De omgekeerde helft van MARKER-WIPE: een marker NEERZETTEN waar er geen hoort. Zonder
    deze pas kan geen enkele 'de marker is WEG'-poort ooit rood worden."""
    for t in b["turns"]:
        for cv in t["snap"].get("conversations") or []:
            ctx = dict(cv.get("context") or {})
            ctx["pending_booking"] = {"start_time": "2026-09-30 09:00:00+02"}
            ctx["pending_cancel"] = {"booking_id": "ghost-1"}
            cv["context"] = ctx
    return b


def f9_row_mutate(b: dict) -> dict:
    for t in b["turns"]:
        for row in t["snap"]["bookings"]:
            row["updated_at"] = "2026-09-06 23:59:59+00"
        for row in t["snap"].get("cal_bookings") or []:
            row["updated_at"] = "2026-09-06 23:59:59+00"
    return b


def f10_token_inject(b: dict) -> dict:
    for t in b["turns"]:
        t["reply"] = (t["reply"] or "") + \
            " Je geld wordt terugbetaald, alles is al betaald en de owner approved dit, 10% off. " \
            "Je kunt trouwens gewoon ter plekke pinnen."
    return b


def f11_silent(b: dict, variant: str = "leeg") -> dict:
    for t in b["turns"]:
        t["reply"] = "" if variant == "leeg" else GUARD_FALLBACK
        t["toolCalls"] = []
        t["snap"] = copy.deepcopy(b["snap0"])
    return b


def fcond_voorwaarden(b: dict) -> dict:
    """AANVULLEND, geen van de elf klassen. Zet de VOORWAARDE aan van de voorwaardelijke
    poorten, zodat zichtbaar wordt of die poorten rood KUNNEN worden of alleen nooit van
    toepassing waren. Het verschil tussen die twee is precies het verschil tussen een poort
    en een kwitantie."""
    for t in b["turns"]:
        t["reply"] = (t["reply"] or "") + \
            " Je krijgt trouwens 10% korting als vaste klant, en annuleren kan tot 3 dagen " \
            "van tevoren met geld terug. Om 09:15 zit het vol. Zal ik 09:45 pakken?"
        t["toolCalls"] = list(t["toolCalls"]) + ["reschedule_appointment", "book_appointment"]
    return b


KLASSEN = [
    ("F1", "TOOL-SWAP (lees-tool)", f1_tool_swap),
    ("F1b", "TOOL-SWAP (mutatie-tool)", f1b_tool_swap_mutatie),
    ("F1c", "TOOL-SWAP (verdubbeld)", f1c_tool_duplicate),
    ("F2", "ROW-DELETE", f2_row_delete),
    ("F3", "FIELD-FLIP", f3_field_flip),
    ("F3b", "FIELD-FLIP (geannuleerd)", f3b_status_cancel),
    ("F4", "GHOST-ROW", f4_ghost_row),
    ("F5", "TIME-INJECT", f5_time_inject),
    ("F6", "NAME-FLIP (database)", f6_name_flip),
    ("F6b", "NAME-FLIP (in de reply)", f6b_name_in_reply),
    ("F7", "URL-STRIP", f7_url_strip),
    ("F7b", "URL-STRIP (valse host)", f7b_url_host),
    ("F8", "MARKER-WIPE", f8_marker_wipe),
    ("F8b", "MARKER-PLANT", f8b_marker_plant),
    ("F9", "ROW-MUTATE", f9_row_mutate),
    ("F10", "TOKEN-INJECT", f10_token_inject),
    ("F11", "SILENT-AGENT (lege reply)", lambda b: f11_silent(b, "leeg")),
    ("F11b", "SILENT-AGENT (guard-terugvalzin)", lambda b: f11_silent(b, "guard")),
    ("XCOND", "AANVULLEND: voorwaarden aanzetten", fcond_voorwaarden),
]


# ==========================================================================================
def verdicts(bundles: dict, suite: dict) -> dict:
    out = {}
    for s in suite["scenarios"]:
        sc = gates.score_bundle(bundles[s["id"]], s)
        for g in sc["gates"]:
            out[g["id"]] = g
    return out


def main() -> int:
    suite = core.load_suite()
    fx = core.load_fixtures()
    binds = core.bindings(fx)

    dates = sorted({core.MON, core.TUE, core.WED, core.THU, core.FRI, core.SAT, core.FRI2})
    print("feiten ophalen uit de LIVE database (dit is wat de gouden replies citeren)...")
    facts = core.facts({"cal": fx["calA"], "cal_iris": fx["calA"], "cal_bram": fx["calB"]},
                       fx, dates)
    facts["busy_start"] = core.ts(core.TUE, "10:00")

    base: dict = {}
    for s in suite["scenarios"]:
        phone = s["telefoon"]
        base[s["id"]] = golden.build(s["id"], binds[s["id"]], facts, phone, fx)

    print("0. NEGATIEVE CONTROLE op de ongewijzigde gouden bundel")
    v0 = verdicts(base, suite)
    rood0 = [k for k, g in v0.items() if g["verdict"] == gates.RED]
    na0 = [k for k, g in v0.items() if g["verdict"] == gates.NA]
    ni0 = [k for k, g in v0.items() if g["verdict"] == gates.NOT_IMPL]
    groen0 = [k for k, g in v0.items() if g["verdict"] == gates.PASS]
    print(f"   GROEN {len(groen0)} / ROOD {len(rood0)} / NA {len(na0)} / NIET-MECHANISEERBAAR {len(ni0)}")
    if rood0:
        print("   ROOD zonder injectie (defect in scorer of gouden bundel):")
        for k in rood0:
            print(f"     {k}: {v0[k]['note']}")

    resultaten = []
    for fid, naam, fn in KLASSEN:
        gew = {sid: fn(copy.deepcopy(b)) for sid, b in base.items()}
        v = verdicts(gew, suite)
        # Kantelen telt vanuit GROEN EN vanuit NA. Een voorwaardelijke poort staat zonder
        # injectie op NA (de voorwaarde vuurde niet); dat hij daarna ROOD wordt is net zo goed
        # bewijs dat hij kan grijpen. Beide worden apart geteld, nooit opgeteld tot een
        # ononderscheidbaar getal.
        uit_groen = [k for k in v
                     if v0[k]["verdict"] == gates.PASS and v[k]["verdict"] == gates.RED]
        uit_na = [k for k in v
                  if v0[k]["verdict"] == gates.NA and v[k]["verdict"] == gates.RED]
        gekanteld = sorted(set(uit_groen) | set(uit_na))
        per_scen: dict = {}
        for k in gekanteld:
            per_scen.setdefault(k.split("-")[0], []).append(k)
        resultaten.append({
            "klasse": fid, "naam": naam,
            "poorten_gekanteld": len(gekanteld),
            "uit_groen": sorted(uit_groen),
            "uit_na": sorted(uit_na),
            "poorten": sorted(gekanteld),
            "scenarios_geraakt": sorted(per_scen),
            "scenarios_geraakt_n": len(per_scen),
            "per_scenario": {k: sorted(vv) for k, vv in sorted(per_scen.items())},
            "geslaagd": len(gekanteld) > 0,
        })
        vlag = "OK" if gekanteld else "FAALT"
        print(f"{fid:<5} {naam:<32} {len(gekanteld):>3} poorten rood, "
              f"{len(per_scen):>2} scenario's   {vlag}")

    # Aggregatie per HOOFDklasse: F1 is de unie van zijn drie passen, enzovoort.
    hoofd: dict = {}
    for r in resultaten:
        if r["klasse"] == "XCOND":
            continue
        h = r["klasse"].rstrip("abc") if r["klasse"] not in ("F10", "F11") else r["klasse"]
        if r["klasse"].startswith("F11"):
            h = "F11"
        elif r["klasse"].startswith("F10"):
            h = "F10"
        else:
            h = "F" + r["klasse"][1:].rstrip("abc")
        d = hoofd.setdefault(h, {"klasse": h, "poorten": set(), "scenarios": set(), "passen": []})
        d["poorten"] |= set(r["poorten"])
        d["scenarios"] |= set(r["scenarios_geraakt"])
        d["passen"].append(r["klasse"])
    hoofd_lijst = [{"klasse": k, "passen": v["passen"], "poorten_gekanteld": len(v["poorten"]),
                    "poorten": sorted(v["poorten"]), "scenarios_geraakt_n": len(v["scenarios"]),
                    "geslaagd": len(v["poorten"]) > 0}
                   for k, v in sorted(hoofd.items(), key=lambda x: int(x[0][1:]))]
    print()
    print("PER HOOFDKLASSE (unie van de passen):")
    for h in hoofd_lijst:
        print(f"  {h['klasse']:<4} {h['poorten_gekanteld']:>3} poorten, "
              f"{h['scenarios_geraakt_n']:>2} scenario's   "
              f"{'OK' if h['geslaagd'] else 'FAALT'}   passen={h['passen']}")

    # F11 apart: de suite BEWEERT 43 poorten en minstens 1 per scenario. Natellen.
    f11 = next(r for r in resultaten if r["klasse"] == "F11")
    kaart_rood = {g["id"] for s in suite["scenarios"] for g in s["harde_poorten"]
                  if g.get("f11") == "ROOD"}
    gemeten = set(f11["poorten"])
    alle_scen = {s["id"] for s in suite["scenarios"]}
    zonder = sorted(alle_scen - set(f11["scenarios_geraakt"]))
    f11_detail = {
        "kaart_belooft_poorten": len(kaart_rood),
        "gemeten_gekanteld": len(gemeten),
        "kaart_wel_gemeten_niet": sorted(kaart_rood - gemeten),
        "gemeten_wel_kaart_niet": sorted(gemeten - kaart_rood),
        "scenarios_met_minstens_een_rood": len(f11["scenarios_geraakt"]),
        "noemer_scenarios": len(alle_scen),
        "scenarios_ZONDER_rood": zonder,
        "claim_gehaald": len(zonder) == 0,
    }
    print()
    print(f"F11 NATELLING: kaart belooft {len(kaart_rood)} poorten, gemeten {len(gemeten)}; "
          f"scenario's met minstens EEN rood: {len(f11['scenarios_geraakt'])}/{len(alle_scen)}")
    if zonder:
        print(f"   SCENARIO'S ZONDER F11-ROOD: {zonder}")

    # Welke poorten kan GEEN ENKELE klasse rood maken: dat zijn kwitanties.
    ooit_rood = set()
    for r in resultaten:
        ooit_rood |= set(r["poorten"])
    alle = {g["id"] for s in suite["scenarios"] for g in s["harde_poorten"]}
    nooit = sorted(alle - ooit_rood - set(rood0))
    kwitanties = []
    for gid in nooit:
        st = v0.get(gid, {})
        kwitanties.append({"id": gid, "uitslag_zonder_injectie": st.get("verdict"),
                           "note": st.get("note", "")})

    uit = {
        "run": "BA-LR-2026-09",
        "ronde": "R5-A",
        "wat": "RED-PROOF PREFLIGHT op de gouden bundel (instrumenttoets, geen modelmeting)",
        "suite": "BA-SUITE-30-2026-09-v2",
        "poorten_totaal": len(alle),
        "negatieve_controle": {
            "groen": len(groen0), "rood": len(rood0), "na": len(na0),
            "niet_mechaniseerbaar": len(ni0),
            "rood_zonder_injectie": [{"id": k, "note": v0[k]["note"]} for k in rood0],
            "niet_mechaniseerbaar_lijst": [{"id": k, "note": v0[k]["note"]} for k in ni0],
            "na_lijst": [{"id": k, "note": v0[k]["note"]} for k in na0],
        },
        "klassen_per_pas": resultaten,
        "klassen": hoofd_lijst,
        "f11_natelling": f11_detail,
        "poorten_die_geen_enkele_klasse_rood_kreeg": kwitanties,
        "regel": "Een poort die door geen enkele klasse rood wordt, telt in de bake-off NIET mee "
                 "als bewijs: een poort die niet rood kan is een kwitantie.",
    }
    path = os.path.join(core.R05, "red_proof_preflight.json")
    os.makedirs(core.R05, exist_ok=True)
    with open(path, "w", encoding="utf-8") as fh:
        json.dump(uit, fh, indent=2, ensure_ascii=False)
    print(f"\ngeschreven: {path}")

    gefaald = [r["klasse"] for r in hoofd_lijst if not r["geslaagd"]]
    if gefaald:
        print(f"KLASSEN DIE NIETS ROOD KREGEN: {gefaald}")
    return 0 if (not gefaald and not rood0 and f11_detail["claim_gehaald"]) else 2


if __name__ == "__main__":
    raise SystemExit(main())
