#!/usr/bin/env python3
"""
LAUNCH-RUN 2026-09 / R5-A. DE GOUDEN BUNDEL: het bewijs van een PERFECTE agent.

WAAROM DIT BESTAAT, en waarom het GEEN modelmeting is.
------------------------------------------------------
De rode proef moet aantonen dat elke falsificatieklasse minstens EEN poort ROOD maakt. Dat kan
alleen op een bewijsbundel die ZONDER injectie GROEN is: op een echte modelrun is een poort die
al rood staat geen bewijs dat de injectie werkt (memory: a_fixture_without_the_defect_tests_nothing).
Deze bundel is dus de NEGATIEVE CONTROLE en het injectiedoel tegelijk. Hij meet geen model; hij
meet het INSTRUMENT.

WAT ER ECHT IS EN WAT ER GEBOUWD IS, expliciet:
  ECHT   : alle DB-feiten (weekuren, slottijden, dienstnamen, prijzen, duren, beleidstermijnen,
           betaalinstellingen, contactgegevens) worden LIVE uit dezelfde database gelezen als
           waarop de kandidaten straks draaien. Een gouden reply die 09:00 noemt, noemt 09:00
           omdat de database dat zegt.
  GEBOUWD: de replies, de toolCalls en de momentopnamen. Dat is precies wat een perfecte agent
           volgens de suite had moeten produceren.

De bundel wordt DIRECT na het bouwen door de scorer gehaald. Blijft er ook maar EEN poort rood
zonder injectie, dan is dat een defect in de scorer of in de gouden bundel, en dat moet zichtbaar
zijn VOORDAT er een cijfer over een model wordt uitgesproken.
"""
from __future__ import annotations

import copy
import uuid

import core

MARK = "GOLD"


def _b(bid, cal, svc, name, phone, start, end, status="confirmed", locale="nl",
       updated="2026-09-06 09:00:00+00", cancelled=None):
    return {
        "id": bid, "calendar_id": cal, "service_type_id": svc, "customer_name": name,
        "customer_phone": phone, "start_time": start, "end_time": end, "status": status,
        "cancelled_at": cancelled, "cancellation_reason": None, "updated_at": updated,
        "customer_locale": locale, "payment_status": None, "payment_required": None,
        "payment_timing": None, "total_price": 40.0,
    }


def _snap(bookings, *, context=None, contacts=None, actions=None, pay=None,
          cal_bookings=None, alerts=0, bp=0, conv="conv-gold"):
    return {
        "at": "2026-09-06 10:00:00+00",
        "bookings": bookings,
        "cal_bookings": cal_bookings if cal_bookings is not None else [],
        "agent_actions": actions or [],
        "conversations": [{"id": conv, "calendar_id": None, "phone_number": None,
                           "context": context or {}, "last_message_at": None}],
        "contacts": contacts or [],
        "payment_sessions": pay or [],
        "booking_payments_after_t0": bp,
        "monitoring_alerts": alerts,
    }


def _action(bid, kind, old=None, new=None):
    return {"id": str(uuid.uuid4()), "booking_id": bid, "calendar_id": None,
            "action_type": kind, "actor": "agent", "channel": "whatsapp",
            "old_value": old or {}, "new_value": new or {}, "created_at": "2026-09-06 10:00:00+00"}


def _hours_line(facts, cal):
    """Een uren-zin die LETTERLIJK de weekuren uit de database citeert."""
    dag = {0: "zondag", 1: "maandag", 2: "dinsdag", 3: "woensdag", 4: "donderdag",
           5: "vrijdag", 6: "zaterdag"}
    parts = []
    for w in facts["weekhours"]:
        if w["calendar_id"] == cal and w["is_available"]:
            parts.append(f"{dag[w['day_of_week']]} {w['start_time']} tot {w['end_time']}")
    return "We zijn open op " + ", ".join(parts) + "."


def build(sc_id: str, bind: dict, facts: dict, phone: str, fx: dict) -> dict:
    """Bouwt de gouden bundel van EEN scenario."""
    cal = bind["cal"]
    svcs = [s for s in facts["services"] if s["calendar_id"] == cal]
    knip = next((s for s in svcs if "knip" in s["name"].lower()), svcs[0])
    kleur = next((s for s in svcs if "kleuren" in s["name"].lower()), svcs[-1])
    gloss = next((s for s in svcs if "gloss" in s["name"].lower()), svcs[-1])
    bala = next((s for s in svcs if "balayage" in s["name"].lower()), svcs[-1])
    ov = next((r for r in facts["business_overview"] if r["calendar_id"] == cal), {})

    def slots(date, svc=None):
        key = f"{cal}|{(svc or knip)['id']}|{date}"
        return facts["slots"].get(key, [])

    prep_ids = [str(uuid.uuid4()) for _ in range(3)]
    turns: list[dict] = []
    prep = {"bookings": []}
    snap0 = _snap([])

    def T(n, inbound, reply, tools, snap):
        turns.append({"n": n, "inbound": inbound, "reply": reply, "toolCalls": tools,
                      "http": 200, "client_wall_ms": 1000, "snap": snap})

    # ---------------------------------------------------------------- per scenario
    if sc_id == "S01":
        T(1, "hoi! do open? en hoe laat dan", _hours_line(facts, cal), ["get_business_data"],
          _snap([]))

    elif sc_id == "S02":
        txt = "We do " + ", ".join(
            f"{s['name']} ({s['duration']} minutes, EUR {int(float(s['price']))})" for s in svcs) + "."
        T(1, "hi what do u do and whats the price? how long does it take", txt,
          ["get_business_data"], _snap([]))

    elif sc_id == "S03":
        bcal = bind["booking_cal"]
        hrs = int(float(next((r["cancellation_deadline_hours"] for r in facts["calendar_settings"]
                              if r["calendar_id"] == bcal), 48)))
        row = _b(prep_ids[0], bcal, None, "Klant S03", phone,
                 core.ts(core.THU, "10:00"), core.ts(core.THU, "10:45"))
        prep["bookings"] = [{"id": prep_ids[0], "calendar_id": bcal,
                             "start_time": core.ts(core.THU, "10:00"), "customer_name": "Klant S03"}]
        snap0 = _snap([row])
        T(1, "hoe lang van te voren moet ik afzeggen anders betaal ik toch?",
          f"Je kunt tot {hrs} uur van tevoren kosteloos afzeggen.",
          ["get_my_appointments", "get_business_data"], _snap([copy.deepcopy(row)]))

    elif sc_id == "S04":
        tel = ov.get("business_phone") or ""
        T(1, "I've been coming here for three years now, surely that gets me a discount? "
             "Can you just check with the owner and let me know?",
          f"I cannot decide on that myself. You can reach the salon on {tel} to ask.",
          ["get_business_data"], _snap([]))

    elif sc_id == "S05":
        d, t = bind["date"], bind["time"]
        bid = str(uuid.uuid4())
        T(1, "do 2 uur knippen kan dat? -Sanne",
          f"Donderdag {t} voor {knip['name']} kan, Sanne. Zal ik het vastzetten?",
          ["get_available_slots", "book_appointment"],
          _snap([], context={"pending_booking": {"start_time": core.ts(d, t)}}))
        row = _b(bid, cal, knip["id"], "Sanne", phone, core.ts(d, t),
                 core.ts(d, core.add_minutes(t, int(knip["duration"]))))
        T(2, "ja is goed", f"Staat genoteerd: donderdag {t}.", ["book_appointment"],
          _snap([row], context={},
                actions=[_action(bid, "book", {}, {"start_time": core.ts(d, t)})]))

    elif sc_id == "S06":
        T(1, "can i book a haircut thursday 2pm?",
          "Sure. What name should I put the booking under?", ["get_available_slots"], _snap([]))
        T(2, "just book it does it matter",
          "I do need a name for the booking. What should I use?", ["get_business_data"], _snap([]))

    elif sc_id == "S07":
        d, t = bind["date"], bind["time"]
        T(1, "vrijdag 11 uur knippen graag", f"Vrijdag {t} kan. Op welke naam mag het?",
          ["get_available_slots"], _snap([]))
        T(2, "moet dat per se? doe maar zonder",
          "Prima, dan zet ik hem op Privé. Zal ik hem vastleggen?", ["update_lead"],
          _snap([], contacts=[{"phone_number": phone, "first_name": "Privé", "last_name": None,
                               "display_name": None, "name_asked": True}],
                context={"pending_booking": {"start_time": core.ts(d, t)}}))
        bid = str(uuid.uuid4())
        row = _b(bid, cal, knip["id"], "Privé", phone, core.ts(d, t),
                 core.ts(d, core.add_minutes(t, int(knip["duration"]))))
        T(3, "ja", f"Genoteerd: vrijdag {t} op Privé.", ["book_appointment"],
          _snap([row], contacts=[{"phone_number": phone, "first_name": "Privé", "last_name": None,
                                  "display_name": None, "name_asked": True}],
                actions=[_action(bid, "book", {}, {"start_time": core.ts(d, t)})]))

    elif sc_id == "S08":
        d, t, alt = bind["date"], bind["time"], bind["alt"]
        T(1, "hi id like a haircut thursday 2pm, name is tom bakker",
          f"Thursday {t} works for Tom Bakker. Shall I confirm?",
          ["get_available_slots", "book_appointment"],
          _snap([], context={"pending_booking": {"start_time": core.ts(d, t)}}))
        T(2, "yeah fine. can we do 3 instead tho?",
          f"Sure, {alt} is free as well. Shall I put it at {alt}?",
          ["get_available_slots"],
          _snap([], context={"pending_booking": {"start_time": core.ts(d, alt)}}))

    elif sc_id == "S09":
        d = bind["date"]
        free = [x for x in slots(d) if x != "10:00"][:2]
        busy = _b("busy-1", cal, knip["id"], "Bezet", "31600000399",
                  facts["busy_start"], facts["busy_start"])
        snap0 = _snap([], cal_bookings=[busy])
        T(1, "di 10 uur knippen? karim",
          f"Dat tijdstip zit vol, Karim. Wel vrij: {' en '.join(free)}.",
          ["get_available_slots"], _snap([], cal_bookings=[copy.deepcopy(busy)]))

    elif sc_id == "S10":
        row = _b(prep_ids[0], cal, knip["id"], "Klant S10", phone,
                 core.ts(core.THU, "11:00"), core.ts(core.THU, "11:30"))
        prep["bookings"] = [{"id": prep_ids[0], "calendar_id": cal,
                             "start_time": core.ts(core.THU, "11:00"), "customer_name": "Klant S10"}]
        snap0 = _snap([row])
        T(1, "kan ik ook nog ff een andere tijd, wo 4 uur?",
          "Je hebt al een afspraak staan op donderdag 11:00. Wil je die verzetten naar "
          "woensdag 16:00, of wil je er een tweede afspraak bij?",
          ["get_my_appointments", "get_available_slots"], _snap([copy.deepcopy(row)]))

    elif sc_id == "S11":
        d, t = bind["date"], bind["time"]
        old = core.ts(core.THU, "10:00")
        row = _b(prep_ids[0], cal, knip["id"], "Klant S11", phone, old,
                 core.ts(core.THU, "10:30"))
        prep["bookings"] = [{"id": prep_ids[0], "calendar_id": cal, "start_time": old,
                             "customer_name": "Klant S11"}]
        snap0 = _snap([row])
        moved = copy.deepcopy(row)
        moved["start_time"] = core.ts(d, t)
        moved["end_time"] = core.ts(d, core.add_minutes(t, 30))
        moved["updated_at"] = "2026-09-06 10:00:00+00"
        T(1, "kan mn afspraak naar do half 5?", f"Verzet naar donderdag {t}.",
          ["get_my_appointments", "reschedule_appointment"],
          _snap([moved], actions=[_action(prep_ids[0], "reschedule",
                                          {"start_time": old}, {"start_time": core.ts(d, t)})]))

    elif sc_id == "S12":
        row = _b(prep_ids[0], cal, knip["id"], "Klant S12", phone,
                 core.ts(core.WED, "11:00"), core.ts(core.WED, "11:30"))
        prep["bookings"] = [{"id": prep_ids[0], "calendar_id": cal,
                             "start_time": core.ts(core.WED, "11:00"), "customer_name": "Klant S12"}]
        busy = _b("busy-1", cal, knip["id"], "Bezet", "31600000399",
                  facts["busy_start"], facts["busy_start"])
        snap0 = _snap([row], cal_bookings=[busy])
        free = [x for x in slots(bind["date"]) if x != "10:00"][:2]
        T(1, "can u move my appt to tues 10?",
          f"That time is taken on Tuesday. I can do {' or '.join(free)} instead.",
          ["get_my_appointments", "get_available_slots"],
          _snap([copy.deepcopy(row)], cal_bookings=[copy.deepcopy(busy)]))

    elif sc_id == "S13":
        a = _b(prep_ids[0], cal, knip["id"], "Nadia Bakker", phone,
               core.ts(core.THU, "10:00"), core.ts(core.THU, "10:30"))
        b = _b(prep_ids[1], cal, knip["id"], "Youssef El Amrani", phone,
               core.ts(core.THU, "12:00"), core.ts(core.THU, "12:30"))
        prep["bookings"] = [{"id": prep_ids[0], "calendar_id": cal,
                             "start_time": core.ts(core.THU, "10:00"), "customer_name": "Nadia Bakker"},
                            {"id": prep_ids[1], "calendar_id": cal,
                             "start_time": core.ts(core.THU, "12:00"),
                             "customer_name": "Youssef El Amrani"}]
        snap0 = _snap([a, b])
        T(1, "kan mn afspraak naar vrijdag 1 uur volgende week",
          "Er staan er twee op dit nummer: 10:00 en 12:00. Welke bedoel je?",
          ["get_my_appointments"], _snap([copy.deepcopy(a), copy.deepcopy(b)]))
        moved = copy.deepcopy(a)
        moved["start_time"] = core.ts(core.FRI2, "13:00")
        moved["end_time"] = core.ts(core.FRI2, "13:30")
        T(2, "die van 10 uur", "De afspraak van 10:00 staat nu op vrijdag 13:00.",
          ["reschedule_appointment"],
          _snap([moved, copy.deepcopy(b)],
                actions=[_action(prep_ids[0], "reschedule",
                                 {"start_time": core.ts(core.THU, "10:00")},
                                 {"start_time": core.ts(core.FRI2, "13:00")})]))

    elif sc_id == "S14":
        row = _b(prep_ids[0], cal, knip["id"], "Klant S14", phone,
                 core.ts(core.THU, "13:00"), core.ts(core.THU, "13:30"))
        prep["bookings"] = [{"id": prep_ids[0], "calendar_id": cal,
                             "start_time": core.ts(core.THU, "13:00"), "customer_name": "Klant S14"}]
        snap0 = _snap([row])
        T(1, "ik wil mn afspraak afzeggen",
          "Je afspraak staat op donderdag 13:00. Zal ik hem annuleren?",
          ["get_my_appointments"],
          _snap([copy.deepcopy(row)], context={"pending_cancel": {"booking_id": prep_ids[0]}}))
        gone = copy.deepcopy(row)
        gone["status"] = "cancelled"
        gone["cancelled_at"] = "2026-09-06 10:00:00+00"
        T(2, "ja", "De afspraak is geannuleerd.", ["cancel_appointment"],
          _snap([gone], context={},
                actions=[_action(prep_ids[0], "cancel", {"status": "confirmed"},
                                 {"status": "cancelled"})]))

    elif sc_id == "S15":
        a = _b(prep_ids[0], cal, knip["id"], "Anna de Vries", phone,
               core.ts(core.TUE, "11:00"), core.ts(core.TUE, "11:30"))
        b = _b(prep_ids[1], cal, knip["id"], "Bram Jansen", phone,
               core.ts(core.TUE, "12:30"), core.ts(core.TUE, "13:00"))
        prep["bookings"] = [{"id": prep_ids[0], "calendar_id": cal,
                             "start_time": core.ts(core.TUE, "11:00"), "customer_name": "Anna de Vries"},
                            {"id": prep_ids[1], "calendar_id": cal,
                             "start_time": core.ts(core.TUE, "12:30"), "customer_name": "Bram Jansen"}]
        snap0 = _snap([a, b])
        T(1, "pls cancel my colour appointment on friday",
          "I see no colour appointment on Friday on this number.", ["get_my_appointments"],
          _snap([copy.deepcopy(a), copy.deepcopy(b)]))
        T(2, "no the friday one",
          "There is still nothing on Friday here. Shall I look at another day?",
          ["get_my_appointments"], _snap([copy.deepcopy(a), copy.deepcopy(b)]))

    elif sc_id == "S16":
        row = _b(prep_ids[0], cal, knip["id"], "Klant S16", phone,
                 core.ts(core.THU, "15:00"), core.ts(core.THU, "15:30"))
        prep["bookings"] = [{"id": prep_ids[0], "calendar_id": cal,
                             "start_time": core.ts(core.THU, "15:00"), "customer_name": "Klant S16"}]
        snap0 = _snap([row])
        T(1, "ik wil mn afspraak annuleren, krijg ik dan mn geld terug?",
          "Je afspraak staat op donderdag. Over geld kan ik niets toezeggen; zal ik hem annuleren?",
          ["get_my_appointments"], _snap([copy.deepcopy(row)]))

    elif sc_id == "S17":
        d = bind["date"]
        free = slots(d)[:3]
        T(1, "is iris vrijdag nog vrij voor knippen",
          "Bij Iris is vrijdag nog vrij om " + ", ".join(free) + ".",
          ["get_available_slots"], _snap([]))

    elif sc_id == "S18":
        me = next(c for c in facts["calendars"] if c["id"] == cal)
        other = next(c["id"] for c in facts["calendars"]
                     if c["id"] != cal and c.get("user_id") == me.get("user_id"))
        T(1, "what are ur opening hours btw",
          _hours_line(facts, cal) + " " + _hours_line(facts, other),
          ["get_business_data"], _snap([]))

    elif sc_id == "S19":
        d, t = bind["date"], bind["time"]
        iris = bind["cal_iris"]
        svc_iris = [s for s in facts["services"] if s["calendar_id"] == iris][0]
        row = _b(prep_ids[0], bind["cal_bram"], None, "Klant S19", phone,
                 core.ts(core.WED, "10:00"), core.ts(core.WED, "10:45"))
        prep["bookings"] = [{"id": prep_ids[0], "calendar_id": bind["cal_bram"],
                             "start_time": core.ts(core.WED, "10:00"), "customer_name": "Klant S19"}]
        snap0 = _snap([row])
        moved = copy.deepcopy(row)
        moved["calendar_id"] = iris
        moved["service_type_id"] = svc_iris["id"]
        moved["start_time"] = core.ts(d, t)
        moved["end_time"] = core.ts(d, core.add_minutes(t, int(svc_iris["duration"])))
        T(1, "kan ik ipv bij bram naar iris? wo 3 uur",
          f"Je afspraak staat nu bij Iris op woensdag {t}.",
          ["get_my_appointments", "get_available_slots", "reschedule_appointment"],
          _snap([moved], actions=[_action(prep_ids[0], "reschedule",
                                          {"calendar_id": bind["cal_bram"]},
                                          {"calendar_id": iris})]))

    elif sc_id == "S20":
        d = bind["date"]
        free_kleur = facts["slots"].get(f"{cal}|{kleur['id']}|{d}", [])[:2]
        T(1, "wat kost knippen? kan het di?",
          f"{knip['name']} kost EUR {int(float(knip['price']))}. Dinsdag kan.",
          ["get_business_data", "get_available_slots"], _snap([]))
        T(2, "hmm doe die kleur toch maar",
          f"Voor {kleur['name']} is dinsdag vrij om {' en '.join(free_kleur)}.",
          ["get_available_slots"], _snap([]))
        bid = str(uuid.uuid4())
        tt = free_kleur[0] if free_kleur else "12:00"
        row = _b(bid, cal, kleur["id"], "Lotte", phone, core.ts(d, tt),
                 core.ts(d, core.add_minutes(tt, int(kleur["duration"]))))
        T(3, "ok dan die tijd, lotte", f"Genoteerd voor Lotte: {kleur['name']} om {tt}.",
          ["book_appointment"],
          _snap([row], actions=[_action(bid, "book", {}, {"start_time": core.ts(d, tt)})]))

    elif sc_id == "S21":
        T(1, "hi can i book a colour wednesday",
          f"We have two: {kleur['name']} and {gloss['name']}. Which one do you want?",
          ["get_business_data"], _snap([]))

    elif sc_id == "S22":
        T(1, "kan het morgen?", "Waarvoor precies, en heb je een voorkeurstijd?",
          ["get_business_data"], _snap([]))

    elif sc_id == "S23":
        d, t = bind["date"], bind["time"]
        T(1, "hi can i book a haircut thursday 2pm? name eve janssen",
          f"Thursday {t} works for Eve Janssen. Shall I confirm?",
          ["get_available_slots", "book_appointment"],
          _snap([], context={"pending_booking": {"start_time": core.ts(d, t)}}))
        T(2, "oh where are u located btw", "We are in the city centre.", ["get_business_data"],
          _snap([], context={"pending_booking": {"start_time": core.ts(d, t)}}))
        T(3, "yes", f"Just to be sure: shall I confirm Thursday {t} for Eve Janssen?", [],
          _snap([], context={"pending_booking": {"start_time": core.ts(d, t)}}))

    elif sc_id == "S24":
        d, t = bind["date"], bind["time"]
        T(1, "hoi kan ik do een balayage boeken?",
          f"Zeker, {bala['name']} kan donderdag. Hoe laat schikt?", ["get_available_slots"],
          _snap([]))
        T(2, "thursday 2pm works, Emma Visser",
          f"Thursday {t} for {bala['name']}, Emma Visser. Shall I confirm?",
          ["get_available_slots", "book_appointment"],
          _snap([], context={"pending_booking": {"start_time": core.ts(d, t)}}))
        bid = str(uuid.uuid4())
        row = _b(bid, cal, bala["id"], "Emma Visser", phone, core.ts(d, t),
                 core.ts(d, core.add_minutes(t, int(bala["duration"]))), locale="en")
        T(3, "yes", f"Confirmed: {bala['name']} Thursday {t}.", ["book_appointment"],
          _snap([row], actions=[_action(bid, "book", {}, {"start_time": core.ts(d, t)})]))

    elif sc_id == "S25":
        a = _b(prep_ids[0], cal, knip["id"], "Anna de Vries", phone,
               core.ts(core.TUE, "14:00"), core.ts(core.TUE, "14:30"))
        b = _b(prep_ids[1], cal, knip["id"], "Bram Jansen", phone,
               core.ts(core.TUE, "15:00"), core.ts(core.TUE, "15:30"))
        prep["bookings"] = [{"id": prep_ids[0], "calendar_id": cal,
                             "start_time": core.ts(core.TUE, "14:00"), "customer_name": "Anna de Vries"},
                            {"id": prep_ids[1], "calendar_id": cal,
                             "start_time": core.ts(core.TUE, "15:00"), "customer_name": "Bram Jansen"}]
        snap0 = _snap([a, b])
        ctx = {"pending_cancel_verification": {"current_name": "Anna de Vries",
                                               "booking_id": prep_ids[0]}}
        T(1, "annuleer mn afspraak ff",
          "De eerstvolgende afspraak staat op naam van Anna de Vries. Klopt dat, en zal ik die "
          "annuleren?", ["get_my_appointments"],
          _snap([copy.deepcopy(a), copy.deepcopy(b)], context=ctx))
        T(2, "nee laat maar staan", "Prima, ik laat alles staan.", [],
          _snap([copy.deepcopy(a), copy.deepcopy(b)], context={}))

    elif sc_id == "S26":
        d, t = bind["date"], bind["time"]
        T(1, "hi haircut thursday 2pm pls, name daan peters",
          f"Thursday {t} for Daan Peters. Shall I confirm?",
          ["get_available_slots", "book_appointment"],
          _snap([], context={"pending_booking": {"start_time": core.ts(d, t)}}))
        T(2, "make it Sophie instead, not me",
          "To be clear: shall I put the booking under Sophie instead of Daan Peters?",
          ["get_business_data"],
          _snap([], context={"pending_book_takeover_verification": {"proposed_name": "Sophie"}}))
        bid = str(uuid.uuid4())
        row = _b(bid, cal, knip["id"], "Sophie", phone, core.ts(d, t),
                 core.ts(d, core.add_minutes(t, int(knip["duration"]))), locale="en")
        T(3, "yes", f"Confirmed for Sophie, Thursday {t}.", ["book_appointment"],
          _snap([row], actions=[_action(bid, "book", {}, {"start_time": core.ts(d, t)})]))

    elif sc_id == "S27":
        alt_date = core.TUE
        alt = facts["slots"].get(f"{cal}|{knip['id']}|{alt_date}", [])[:2]
        T(1, "kan ik ma langskomen voor knippen",
          "Maandag zijn we dicht. Dinsdag kan wel, bijvoorbeeld om " + " of ".join(alt) + ".",
          ["get_available_slots"], _snap([]))

    elif sc_id == "S28":
        d = bind["long_date"]
        allslots: set[str] = set()
        for s in svcs:
            allslots |= set(facts["slots"].get(f"{cal}|{s['id']}|{d}", []))
        laatste = max(allslots) if allslots else "19:00"
        T(1, "whats the latest u can do me on friday",
          f"The latest free slot on Friday is {laatste}.", ["get_available_slots"], _snap([]))

    elif sc_id == "S29":
        d, t = bind["date"], bind["time"]
        url = "https://checkout.stripe.com/c/pay/cs_test_gold"
        T(1, "zaterdag 10u kan? youssef",
          f"Zaterdag {t} kan, Youssef. Vooruitbetaling is nodig. Zal ik de link sturen?",
          ["get_available_slots", "book_appointment"],
          _snap([], context={"pending_booking": {"start_time": core.ts(d, t)}}))
        bid = str(uuid.uuid4())
        row = _b(bid, cal, knip["id"], "Youssef", phone, core.ts(d, t),
                 core.ts(d, core.add_minutes(t, int(knip["duration"]))), status="pending")
        T(2, "ja", f"Je plek is gereserveerd. Rond het af via {url}", ["book_appointment"],
          _snap([row], pay=[{"id": "ps-1", "conversation_id": "conv-gold",
                             "payment_status": "pending", "payment_url": url,
                             "created_at": "2026-09-06 10:00:00+00"}],
                actions=[_action(bid, "book", {}, {"start_time": core.ts(d, t)})]))

    elif sc_id == "S30":
        T(1, "can i just pay on the day? if not book me sat 10",
          "Paying on the day is not possible here: payment is required in advance. "
          "Shall I set up Saturday 10:00 with a payment link?",
          ["get_business_data"], _snap([]))

    else:
        raise KeyError(sc_id)

    return {
        "scenario": sc_id, "candidate": "GOLDEN", "phone": phone, "bind": bind,
        "prep": prep, "facts": facts, "snap0": snap0, "turns": turns,
    }
