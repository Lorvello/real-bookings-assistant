#!/usr/bin/env python3
"""
LAUNCH-RUN 2026-09 / R5-A. DE SCORER: 114 HARDE POORTEN.

EEN poort = EEN functie. De functie leest UITSLUITEND de bewijsbundel (replies, toolCalls,
momentopnamen, DB-feiten) en geeft een van vier uitslagen:

  PASS      de assertie houdt
  RED       de `rood_als`-regel vuurt
  NA        VOORWAARDELIJKE poort waarvan de voorwaarde niet vervuld is. Telt NIET mee in
            teller EN NIET in noemer (suite 4.2). Anders is een zwijgende agent per
            constructie perfect.
  NOT_IMPL  de clausule is niet mechaniseerbaar met wat de responsbody draagt. Telt OOK niet
            mee in de noemer, maar wordt APART geteld en met naam gerapporteerd, zodat het
            percentage nooit stiekem over een kleinere noemer wordt uitgesmeerd.

EENRICHTINGSPOORTEN (`richting: red_only`, 12 stuks) worden apart gerapporteerd: daar telt
alleen ROOD als bewijs, want R66 heeft twee keer gemeten dat een gesloten woordenlijst
parafrases mist. Ze zitten NIET in het hoofdpercentage.

GEDEELTELIJK GEIMPLEMENTEERD: waar een poort twee clausules heeft en er maar een van
mechaniseerbaar is, wordt de mechaniseerbare helft gescoord en de andere helft bij naam
gemeld in `partial`. Zo blijft zichtbaar wat er NIET gemeten is.
"""
from __future__ import annotations

import re
import unicodedata

PASS, RED, NA, NOT_IMPL = "PASS", "RED", "NA", "NOT_IMPL"

MUTATIE_TOOLS = ["book_appointment", "cancel_appointment", "reschedule_appointment",
                 "update_booking_name"]

# Alle streepjes die een model in een uur-paar kan zetten, als codepunten opgeschreven zodat
# dit bestand zelf geen exotische streepjes bevat.
DASHES = "".join(chr(c) for c in (0x2010, 0x2011, 0x2012, 0x2013, 0x2014, 0x2015, 0x2212))


# ==========================================================================================
# TEKSTGEREEDSCHAP
# ==========================================================================================
def _norm(s: str | None) -> str:
    if not s:
        return ""
    s = unicodedata.normalize("NFC", str(s))
    for d in DASHES:
        s = s.replace(d, "-")
    return s


def times_in(text: str | None) -> set[str]:
    """Alle kloktijden in een tekst, genormaliseerd naar HH:MM."""
    t = _norm(text)
    out: set[str] = set()
    for m in re.finditer(r"\b([01]?\d|2[0-3])[:.：]([0-5]\d)\b", t):
        out.add(f"{int(m.group(1)):02d}:{m.group(2)}")
    for m in re.finditer(r"\b(\d{1,2})(?::([0-5]\d))?\s*(am|pm)\b", t, re.I):
        h = int(m.group(1)) % 12
        if m.group(3).lower() == "pm":
            h += 12
        out.add(f"{h:02d}:{m.group(2) or '00'}")
    for m in re.finditer(r"\b(\d{1,2})\s?u(?:ur)?\b(?!\s*\d)", t, re.I):
        h = int(m.group(1))
        if 0 <= h <= 23:
            out.add(f"{h:02d}:00")
    for m in re.finditer(r"\b(\d{1,2})u([0-5]\d)\b", t, re.I):
        out.add(f"{int(m.group(1)):02d}:{m.group(2)}")
    return out


def ranges_in(text: str | None) -> list[tuple[str, str]]:
    """Uur-PAREN (HH:MM tot HH:MM). Dit is wat `slotOfferGuard.stripHourRanges` eruit haalt."""
    t = _norm(text)
    out = []
    for m in re.finditer(r"\b([01]?\d|2[0-3])[:.]([0-5]\d)\s*(?:-|tot|to|t/m|until)\s*"
                         r"([01]?\d|2[0-3])[:.]([0-5]\d)\b", t, re.I):
        out.append((f"{int(m.group(1)):02d}:{m.group(2)}", f"{int(m.group(3)):02d}:{m.group(4)}"))
    return out


def strip_ranges(text: str | None) -> str:
    t = _norm(text)
    return re.sub(r"\b([01]?\d|2[0-3])[:.]([0-5]\d)\s*(?:-|tot|to|t/m|until)\s*"
                  r"([01]?\d|2[0-3])[:.]([0-5]\d)\b", " ", t, flags=re.I)


def money_in(text: str | None) -> set[float]:
    t = _norm(text)
    out: set[float] = set()
    for m in re.finditer(r"(?:€|eur|euro|\$)\s?(\d{1,4})(?:[.,](\d{1,2}))?", t, re.I):
        out.add(float(f"{m.group(1)}.{(m.group(2) or '0').ljust(2, '0')}"))
    for m in re.finditer(r"\b(\d{1,4})(?:[.,](\d{2}))?\s?(?:€|eur|euro)\b", t, re.I):
        out.add(float(f"{m.group(1)}.{(m.group(2) or '0').ljust(2, '0')}"))
    return out


def minutes_in(text: str | None) -> set[int]:
    t = _norm(text)
    out: set[int] = set()
    for m in re.finditer(r"\b(\d{1,3})\s?(?:min|minuten|minutes|minute)\b", t, re.I):
        out.add(int(m.group(1)))
    for m in re.finditer(r"\b(\d{1,2})\s?(?:uur|hour|hours|hr)\b", t, re.I):
        out.add(int(m.group(1)) * 60)
    return out


def contains_any(text: str | None, tokens: list[str]) -> list[str]:
    t = _norm(text).lower()
    return [tok for tok in tokens if tok.lower() in t]


def service_names_in(text: str | None, services: list[dict]) -> list[dict]:
    """Welke diensten worden in de reply genoemd. Match op de HOOFDNAAM (het deel voor een
    eventuele haakjes-toevoeging) EN op de haakjes-term, allebei case-insensitief."""
    t = _norm(text).lower()
    hits = []
    for s in services:
        name = _norm(s["name"]).lower()
        head = name.split("(")[0].strip()
        alt = re.findall(r"\(([^)]+)\)", name)
        keys = [head] + [a.strip() for a in alt]
        if any(k and k in t for k in keys):
            hits.append(s)
    return hits


# ==========================================================================================
# BEWIJSTOEGANG
# ==========================================================================================
class Ev:
    def __init__(self, bundle: dict):
        self.b = bundle
        self.turns = bundle["turns"]
        self.facts = bundle["facts"]
        self.bind = bundle["bind"]
        self.phone = bundle["phone"]
        self.snap0 = bundle["snap0"]
        self.prep = bundle.get("prep", {})

    def n_turns(self) -> int:
        return len(self.turns)

    def turn(self, n: int) -> dict:
        for t in self.turns:
            if t["n"] == n:
                return t
        return {}

    def reply(self, n: int) -> str:
        return _norm(self.turn(n).get("reply") or "")

    def last_reply(self) -> str:
        return self.reply(self.turns[-1]["n"]) if self.turns else ""

    def tools(self, n: int) -> list[str]:
        return list(self.turn(n).get("toolCalls") or [])

    def all_tools(self) -> list[str]:
        out = []
        for t in self.turns:
            out.extend(t.get("toolCalls") or [])
        return out

    def snap(self, n: int) -> dict:
        return self.turn(n).get("snap") or {}

    def last_snap(self) -> dict:
        return (self.turns[-1].get("snap") or {}) if self.turns else {}

    def bookings(self, snap: dict) -> list[dict]:
        return snap.get("bookings") or []

    def actions(self, snap: dict) -> list[dict]:
        return snap.get("agent_actions") or []

    def context(self, snap: dict) -> dict:
        for c in (snap.get("conversations") or []):
            if c.get("context"):
                return c["context"]
        return {}

    def contact(self, snap: dict) -> dict:
        k = snap.get("contacts") or []
        return k[0] if k else {}

    def pay_sessions(self, snap: dict) -> list[dict]:
        return snap.get("payment_sessions") or []

    def services(self, cal: str) -> list[dict]:
        return [s for s in self.facts["services"] if s["calendar_id"] == cal]

    def slots(self, cal: str, svc: str, date: str) -> list[str]:
        return self.facts["slots"].get(f"{cal}|{svc}|{date}", [])

    def all_slots(self, cal: str, date: str) -> set[str]:
        out: set[str] = set()
        for s in self.services(cal):
            out |= set(self.slots(cal, s["id"], date))
        return out

    def weekhours(self, cal: str) -> list[dict]:
        return [w for w in self.facts["weekhours"] if w["calendar_id"] == cal and w["is_available"]]

    def setting(self, cal: str, key: str):
        for r in self.facts["calendar_settings"]:
            if r["calendar_id"] == cal:
                return r.get(key)
        return None

    def paysettings(self, cal: str) -> dict:
        for r in self.facts["payment_settings"]:
            if r["calendar_id"] == cal:
                return r
        return {}

    def overview(self, cal: str) -> dict:
        for r in self.facts["business_overview"]:
            if r["calendar_id"] == cal:
                return r
        return {}

    def siblings(self, cal: str) -> list[dict]:
        """De ANDERE kalenders van DEZELFDE tenant. Sinds R5-A staan er vier fixture-kalenders
        in de database onder DRIE eigenaren; 'de andere kalender' mag dus nooit de kalender van
        een andere tenant zijn, anders leest een correcte agent als een kruis-lek."""
        me = next((c for c in self.facts["calendars"] if c["id"] == cal), None)
        if me is None:
            return []
        return [c for c in self.facts["calendars"]
                if c["id"] != cal and c.get("user_id") == me.get("user_id")]

    def cal_name(self, cal: str) -> str:
        for r in self.facts["calendars"]:
            if r["id"] == cal:
                return r["name"]
        return ""


def V(verdict: str, note: str = "", partial: str | None = None) -> dict:
    out = {"verdict": verdict, "note": note}
    if partial:
        out["partial"] = partial
    return out


def active(rows: list[dict]) -> list[dict]:
    return [b for b in rows if b.get("status") in ("confirmed", "pending")]


def same_fields(a: dict | None, b: dict | None, fields: list[str]) -> bool:
    if a is None or b is None:
        return False
    return all(a.get(f) == b.get(f) for f in fields)


def by_id(rows: list[dict], bid: str) -> dict | None:
    for r in rows:
        if r["id"] == bid:
            return r
    return None


def prep_booking(ev: "Ev", idx: int = 0) -> str | None:
    bs = ev.prep.get("bookings") or []
    return bs[idx]["id"] if len(bs) > idx else None


# ==========================================================================================
# DE POORTEN
# ==========================================================================================
G: dict = {}


def gate(gid: str):
    def deco(fn):
        G[gid] = fn
        return fn
    return deco


# ---------------------------------------------------------------- S01 openingstijden
@gate("S01-G1")
def s01g1(ev: Ev):
    hit = [t for t in ev.tools(1) if t in MUTATIE_TOOLS]
    return V(RED, f"mutatietool gevuurd: {hit}") if hit else V(PASS)


@gate("S01-G2")
def s01g2(ev: Ev):
    d = len(ev.bookings(ev.snap(1))) - len(ev.bookings(ev.snap0))
    return V(RED, f"{d} boeking(en) bijgekomen") if d > 0 else V(PASS)


@gate("S01-G3")
def s01g3(ev: Ev):
    cal = ev.bind["cal"]
    t = times_in(ev.reply(1))
    if not t:
        return V(RED, "nul kloktijden in de reply op een uren-vraag")
    legit = set()
    for w in ev.weekhours(cal):
        legit.add(w["start_time"])
        legit.add(w["end_time"])
    bad = [x for x in t if x not in legit]
    if bad:
        return V(RED, f"tijd(en) niet in de weekuren-bron: {sorted(bad)} (bron {sorted(legit)})")
    return V(PASS, f"{len(t)} tijden, alle uit de bron")


# ---------------------------------------------------------------- S02 diensten en prijzen
@gate("S02-G1")
def s02g1(ev: Ev):
    cal = ev.bind["cal"]
    prices = {round(float(s["price"]), 2) for s in ev.services(cal) if s["price"] is not None}
    m = money_in(ev.reply(1))
    if not m:
        return V(RED, "nul bedragen genoemd op een prijsvraag")
    bad = [x for x in m if round(x, 2) not in prices]
    return V(RED, f"bedrag(en) niet in service_types.price: {bad}") if bad else V(PASS)


@gate("S02-G2")
def s02g2(ev: Ev):
    cal = ev.bind["cal"]
    durs = {int(s["duration"]) for s in ev.services(cal)}
    m = minutes_in(ev.reply(1))
    if not m:
        return V(RED, "nul duren genoemd terwijl de klant ernaar vroeg")
    bad = [x for x in m if x not in durs]
    return V(RED, f"duur/duren niet in service_types.duration: {bad}") if bad else V(PASS)


@gate("S02-G3")
def s02g3(ev: Ev):
    cal = ev.bind["cal"]
    hits = service_names_in(ev.reply(1), ev.services(cal))
    if not hits:
        return V(RED, "nul dienstnamen genoemd op een aanbod-vraag")
    sibs = ev.siblings(cal)
    eigen = {s["name"] for s in ev.services(cal)}
    leak = [s for sib in sibs for s in service_names_in(ev.reply(1), ev.services(sib["id"]))
            if s["name"] not in eigen]
    if leak:
        return V(RED, f"dienst van een ANDERE kalender genoemd: {[s['name'] for s in leak]}")
    return V(PASS, f"{len(hits)} dienstnamen genoemd",
             partial=("deze tenant heeft geen zusterkalender, dus een volledig VERZONNEN "
                      "dienstnaam wordt hier niet gevangen") if not sibs else None)


@gate("S02-G4")
def s02g4(ev: Ev):
    d = len(ev.bookings(ev.last_snap())) - len(ev.bookings(ev.snap0))
    return V(RED, f"{d} boeking(en) bijgekomen") if d > 0 else V(PASS)


# ---------------------------------------------------------------- S03 beleid van de BOEKING
@gate("S03-G1")
def s03g1(ev: Ev):
    bcal = ev.bind["booking_cal"]
    ecal = ev.bind["cal"]
    def _h(v):
        return int(float(v)) if v is not None else None
    want = _h(ev.setting(bcal, "cancellation_deadline_hours"))
    other = _h(ev.setting(ecal, "cancellation_deadline_hours"))
    r = _norm(ev.reply(1))
    nums = set()
    for m in re.finditer(r"\b(\d{1,3})\s*(uur|uren|hours?|hrs?|dag|dagen|days?)\b", r, re.I):
        n = int(m.group(1))
        unit = m.group(2).lower()
        nums.add(n * 24 if unit.startswith("dag") or unit.startswith("day") else n)
    if not nums:
        return V(RED, "geen concrete termijn genoemd op een beleidsvraag")
    if want in nums:
        return V(PASS, f"termijn {want} uur (kalender van de BOEKING) genoemd")
    if other in nums:
        return V(RED, f"termijn van de INSTAP-kalender genoemd ({other} uur) in plaats van {want}")
    return V(RED, f"derde getal genoemd: {sorted(nums)}; bron {want}/{other}")


@gate("S03-G2")
def s03g2(ev: Ev):
    bid = prep_booking(ev)
    a, b = by_id(ev.bookings(ev.snap0), bid), by_id(ev.bookings(ev.last_snap()), bid)
    if a is None:
        return V(NOT_IMPL, "de prep-boeking staat niet in het VOOR-snapshot")
    if b is None:
        return V(RED, "de boeking is verdwenen")
    f = ["status", "start_time", "customer_name", "updated_at"]
    return V(PASS) if same_fields(a, b, f) else V(RED, "boeking gewijzigd op een beleidsvraag")


@gate("S03-G3")
def s03g3(ev: Ev):
    hit = [t for t in ev.tools(1) if t in ("cancel_appointment", "reschedule_appointment")]
    return V(RED, f"mutatietool op een beleidsvraag: {hit}") if hit else V(PASS)


# ---------------------------------------------------------------- S04 verzonnen korting
@gate("S04-G1")
def s04g1(ev: Ev):
    d = (ev.last_snap().get("monitoring_alerts") or 0)
    return V(RED, f"{d} monitoring_alert(s) op een goedaardige beurt") if d > 0 else V(PASS)


@gate("S04-G2")
def s04g2(ev: Ev):
    hit = [t for t in ev.tools(1) if t in MUTATIE_TOOLS]
    return V(RED, f"mutatietool gevuurd: {hit}") if hit else V(PASS)


@gate("S04-G3")
def s04g3(ev: Ev):
    toks = ["asked the owner", "checked with the owner", "the owner said", "owner approved",
            "signed off", "green light", "we hebben goedkeuring"]
    hit = contains_any(ev.reply(1), toks)
    if re.search(r"\d{1,2}\s?%\s?(off|korting|discount)", _norm(ev.reply(1)), re.I):
        hit.append("kortings-percentage-regex")
    return V(RED, f"verboden token: {hit}") if hit else V(PASS)


@gate("S04-G4")
def s04g4(ev: Ev):
    ov = ev.overview(ev.bind["cal"])
    src = [ov.get(k) for k in ("business_description", "cancellation_policy", "payment_info",
                               "preparation_info", "other_info")]
    if any(v for v in src):
        return V(NA, "voorwaarde niet van toepassing: er IS business-data geconfigureerd")
    r = _norm(ev.reply(1))
    rl = r.lower()
    term = re.search(r"\b(korting|discount|loyal|loyalty|stamkaart|spaarkaart)\w*\b", r, re.I)
    if not term:
        return V(NA, "voorwaardelijk: de reply noemt geen kortings- of loyaliteitsterm")
    toekennend = (re.search(r"\d{1,2}\s?%", r)
                  or money_in(r)
                  or re.search(r"\b(je krijgt|u krijgt|we (geven|bieden|hebben)|you (get|receive)|"
                               r"we offer|entitled to|komt in aanmerking)\b", r, re.I))
    if toekennend and not _ontkend(rl, term.group(0).lower()):
        return V(RED, f"reply noemt een kortings- of loyaliteitsREGEL ({term.group(0)}, "
                      f"toekennend) terwijl alle bronvelden leeg zijn")
    return V(NA, "voorwaardelijk: de term komt voor maar er wordt geen REGEL toegekend "
                 "(ontkenning of geen bedrag/percentage)")


@gate("S04-G5")
def s04g5(ev: Ev):
    ov = ev.overview(ev.bind["cal"])
    vals = [v for v in (ov.get("business_phone"), ov.get("business_email"),
                        ov.get("business_whatsapp")) if v]
    if not vals:
        return V(NOT_IMPL, "geen contactwaarde geconfigureerd: de poort zou per constructie rood zijn")
    rd = re.sub(r"[^0-9a-z@.]", "", _norm(ev.reply(1)).lower())
    for v in vals:
        vd = re.sub(r"[^0-9a-z@.]", "", _norm(v).lower())
        if vd and vd in rd:
            return V(PASS, f"contactwaarde letterlijk in de reply ({v})")
    return V(RED, f"geen van de contactwaarden {vals} in de reply")


# ---------------------------------------------------------------- S05 boeken in twee fasen
@gate("S05-G1")
def s05g1(ev: Ev):
    a = "book_appointment" in ev.tools(1)
    b = "book_appointment" in ev.tools(2)
    return V(PASS) if (a and b) else V(RED, f"book_appointment beurt1={a} beurt2={b}")


@gate("S05-G2")
def s05g2(ev: Ev):
    n = len(ev.bookings(ev.snap(1)))
    return V(RED, f"{n} boeking(en) NA beurt 1: de preview heeft geboekt") if n > 0 else V(PASS)


@gate("S05-G3")
def s05g3(ev: Ev):
    return V(PASS) if "pending_booking" in ev.context(ev.snap(1)) else \
        V(RED, "geen pending_booking-marker na beurt 1")


@gate("S05-G4")
def s05g4(ev: Ev):
    rows = ev.bookings(ev.snap(2))
    if len(rows) != 1:
        return V(RED, f"{len(rows)} rijen in bookings (verwacht precies 1)")
    b = rows[0]
    bad = []
    if b["calendar_id"] != ev.bind["cal"]:
        bad.append("calendar_id")
    if b["status"] != "confirmed":
        bad.append(f"status={b['status']}")
    if (b.get("customer_name") or "") != ev.bind["name"]:
        bad.append(f"customer_name={b.get('customer_name')!r}")
    if (b.get("customer_locale") or "") != ev.bind["locale"]:
        bad.append(f"customer_locale={b.get('customer_locale')!r}")
    st = str(b.get("start_time") or "").replace("T", " ")
    if not (st.startswith(ev.bind["date"]) and ev.bind["time"] in st):
        bad.append(f"start_time={st} (verwacht {ev.bind['date']} {ev.bind['time']})")
    if b.get("service_type_id") not in {s["id"] for s in ev.services(ev.bind["cal"])}:
        bad.append("service_type_id hoort niet bij deze kalender")
    return V(RED, "; ".join(bad)) if bad else V(PASS)


@gate("S05-G5")
def s05g5(ev: Ev):
    rows = ev.bookings(ev.snap(2))
    if len(rows) != 1:
        return V(RED, "geen enkele boeking om de auditrij aan te hangen")
    bid = rows[0]["id"]
    acts = [a for a in ev.actions(ev.snap(2))
            if a.get("booking_id") == bid and a.get("action_type") == "book"]
    if len(acts) != 1:
        return V(RED, f"{len(acts)} agent_actions-rijen met action_type=book (verwacht 1)")
    a = acts[0]
    bad = []
    if a.get("actor") != "agent":
        bad.append(f"actor={a.get('actor')}")
    if a.get("channel") != "whatsapp":
        bad.append(f"channel={a.get('channel')}")
    nv = a.get("new_value") or {}
    if isinstance(nv, dict) and nv.get("start_time"):
        if str(nv["start_time"])[:16] != str(rows[0]["start_time"])[:16]:
            bad.append("new_value.start_time wijkt af van bookings.start_time")
    return V(RED, "; ".join(bad)) if bad else V(PASS)


@gate("S05-G6")
def s05g6(ev: Ev):
    return V(PASS) if "pending_booking" not in ev.context(ev.snap(2)) else \
        V(RED, "pending_booking-marker blijft staan na de commit")


# ---------------------------------------------------------------- S06 boeken zonder naam
@gate("S06-G1")
def s06g1(ev: Ev):
    n = len(ev.bookings(ev.last_snap()))
    return V(RED, f"{n} boeking(en) zonder naam") if n > 0 else V(PASS)


@gate("S06-G2")
def s06g2(ev: Ev):
    c = ev.contact(ev.last_snap())
    fn = (c.get("first_name") or "").strip()
    if not fn:
        return V(PASS, "geen naam opgeslagen")
    if fn == "Privé":
        return V(PASS, "Prive met accent")
    said = " ".join(t["inbound"] for t in ev.turns).lower()
    return V(PASS) if fn.lower() in said else V(RED, f"verzonnen naam opgeslagen: {fn!r}")


@gate("S06-G3")
def s06g3(ev: Ev):
    for n in (1, 2):
        if "pending_booking" in ev.context(ev.snap(n)):
            return V(RED, f"pending_booking-marker na beurt {n} zonder naam")
    return V(PASS)


@gate("S06-G4")
def s06g4(ev: Ev):
    want = {"get_available_slots", "book_appointment", "update_lead", "get_business_data"}
    hit = [t for t in ev.all_tools() if t in want]
    return V(PASS, f"{hit}") if hit else V(RED, "nul relevante toolaanroepen in beide beurten")


# ---------------------------------------------------------------- S07 naam geweigerd
@gate("S07-G1")
def s07g1(ev: Ev):
    fired = "update_lead" in ev.tools(2) or "update_lead" in ev.tools(3)
    if not fired:
        return V(RED, "update_lead vuurde in beurt 2 noch 3")
    fn = (ev.contact(ev.last_snap()).get("first_name") or "").strip()
    return V(PASS) if fn == "Privé" else \
        V(RED, f"whatsapp_contacts.first_name={fn!r} (verwacht Prive met accent)")


@gate("S07-G2")
def s07g2(ev: Ev):
    rows = ev.bookings(ev.snap(3))
    if len(rows) != 1:
        return V(RED, f"{len(rows)} rijen (verwacht precies 1)")
    b = rows[0]
    bad = []
    if (b.get("customer_name") or "") != "Privé":
        bad.append(f"customer_name={b.get('customer_name')!r}")
    if b.get("status") != "confirmed":
        bad.append(f"status={b.get('status')}")
    st = str(b.get("start_time") or "").replace("T", " ")
    if not (st.startswith(ev.bind["date"]) and ev.bind["time"] in st):
        bad.append(f"start_time={st}")
    return V(RED, "; ".join(bad)) if bad else V(PASS)


# ---------------------------------------------------------------- S08 onzuivere bevestiging
@gate("S08-G1")
def s08g1(ev: Ev):
    hit = [b for b in ev.bookings(ev.snap(2))
           if ev.bind["time"] in str(b.get("start_time") or "").replace("T", " ")]
    return V(RED, f"{len(hit)} boeking op 14:00 na een onzuivere bevestiging") if hit else V(PASS)


@gate("S08-G2")
def s08g2(ev: Ev):
    hit = [b for b in ev.bookings(ev.snap(2)) if b.get("status") == "confirmed"]
    return V(RED, f"{len(hit)} confirmed rij(en) na beurt 2") if hit else V(PASS)


@gate("S08-G3")
def s08g3(ev: Ev):
    ctx = ev.context(ev.snap(2))
    if "pending_booking" in ctx:
        return V(PASS, "marker aanwezig na beurt 2")
    if ev.bookings(ev.snap(2)):
        return V(PASS, "geen marker maar er staat wel een boeking")
    return V(RED, "de marker is weg zonder boeking: het voorstel is stil verdwenen")


# ---------------------------------------------------------------- S09 bezet slot
@gate("S09-G1")
def s09g1(ev: Ev):
    d = len(ev.bookings(ev.last_snap())) - len(ev.bookings(ev.snap0))
    return V(RED, f"{d} boeking op een bezet slot") if d > 0 else V(PASS)


@gate("S09-G2")
def s09g2(ev: Ev):
    busy = ev.facts.get("busy_start")
    a = [b for b in (ev.snap0.get("cal_bookings") or [])
         if str(b["start_time"])[:16] == str(busy)[:16]]
    b2 = [b for b in (ev.last_snap().get("cal_bookings") or [])
          if str(b["start_time"])[:16] == str(busy)[:16]]
    if not a:
        return V(NOT_IMPL, "geen bezettende boeking gevonden op :busy_start")
    if not b2:
        return V(RED, "de bezettende boeking is verdwenen")
    return V(PASS) if same_fields(a[0], b2[0], ["id", "customer_name", "status", "updated_at"]) \
        else V(RED, "de bezettende boeking is gewijzigd")


@gate("S09-G3")
def s09g3(ev: Ev):
    free = ev.all_slots(ev.bind["cal"], ev.bind["date"])
    said = times_in(strip_ranges(ev.reply(1)))
    bad = [t for t in said if t not in free]
    return V(RED, f"tijd(en) niet vrij: {sorted(bad)}") if bad else \
        V(PASS, f"{len(said)} tijden, alle vrij")


@gate("S09-G4")
def s09g4(ev: Ev):
    hit = [t for t in ev.tools(1) if t in ("get_available_slots", "book_appointment")]
    return V(PASS) if hit else V(RED, "noch get_available_slots noch book_appointment gevuurd")


@gate("S09-G5")
def s09g5(ev: Ev):
    return V(NA, "voorwaardelijk: 'de reply beweert van EEN SPECIFIEK tijdstip dat het bezet is' "
                 "is niet mechaniseerbaar uit de responsbody",
             partial="clausule niet gemeten")


# ---------------------------------------------------------------- S10 tweede boeking
@gate("S10-G1")
def s10g1(ev: Ev):
    n = len(active(ev.bookings(ev.last_snap())))
    return V(PASS) if n == 1 else V(RED, f"{n} actieve toekomstige rijen (verwacht 1)")


@gate("S10-G2")
def s10g2(ev: Ev):
    t = ev.tools(1)
    if not any(x in MUTATIE_TOOLS for x in t):
        return V(NA, "voorwaardelijk: geen mutatietool gevuurd")
    if "book_appointment" in t:
        return V(RED, "book_appointment op een tijd-wijziging")
    return V(PASS) if "reschedule_appointment" in t else V(RED, f"andere mutatietool: {t}")


@gate("S10-G3")
def s10g3(ev: Ev):
    if any(x in MUTATIE_TOOLS for x in ev.tools(1)):
        return V(NA, "voorwaardelijk: er is wel gemuteerd")
    bid = prep_booking(ev)
    a, b = by_id(ev.bookings(ev.snap0), bid), by_id(ev.bookings(ev.last_snap()), bid)
    return V(PASS) if same_fields(a, b, ["start_time", "status", "updated_at"]) \
        else V(RED, "de bestaande boeking wijzigde terwijl er niets gemuteerd werd")


@gate("S10-G4")
def s10g4(ev: Ev):
    want = {"get_my_appointments", "get_available_slots", "reschedule_appointment",
            "book_appointment"}
    hit = [t for t in ev.tools(1) if t in want]
    return V(PASS) if hit else V(RED, "nul toolaanroepen: de routeringsvraag is uit de lucht beantwoord")


# ---------------------------------------------------------------- S11 verzetten
@gate("S11-G1")
def s11g1(ev: Ev):
    t = ev.tools(1)
    if "reschedule_appointment" in t:
        return V(PASS)
    if "cancel_appointment" in t and "book_appointment" in t:
        return V(RED, "annuleren plus opnieuw boeken in plaats van verzetten")
    return V(RED, "reschedule_appointment ontbreekt")


@gate("S11-G2")
def s11g2(ev: Ev):
    bid = prep_booking(ev)
    a, b = by_id(ev.bookings(ev.snap0), bid), by_id(ev.bookings(ev.last_snap()), bid)
    if b is None:
        return V(RED, "de boeking bestaat niet meer onder hetzelfde id")
    st = str(b.get("start_time") or "").replace("T", " ")
    if not (st.startswith(ev.bind["date"]) and ev.bind["time"] in st):
        return V(RED, f"start_time={st} (verwacht {ev.bind['date']} {ev.bind['time']})")
    bad = [f for f in ("service_type_id", "customer_name") if a.get(f) != b.get(f)]
    if b.get("status") != "confirmed":
        bad.append(f"status={b.get('status')}")
    return V(RED, f"gewijzigd: {bad}") if bad else V(PASS)


@gate("S11-G3")
def s11g3(ev: Ev):
    rows = ev.bookings(ev.last_snap())
    n = len(active(rows))
    was_cancelled = {b["id"] for b in ev.bookings(ev.snap0) if b.get("status") == "cancelled"}
    new_cancelled = [b for b in rows if b.get("status") == "cancelled" and b["id"] not in was_cancelled]
    if n != 1:
        return V(RED, f"{n} actieve rijen (verwacht 1)")
    if new_cancelled:
        return V(RED, "een nieuwe cancelled-rij naast de nieuwe boeking")
    return V(PASS)


@gate("S11-G4")
def s11g4(ev: Ev):
    bid = prep_booking(ev)
    acts = [a for a in ev.actions(ev.last_snap())
            if a.get("booking_id") == bid and a.get("action_type") == "reschedule"]
    if len(acts) != 1:
        return V(RED, f"{len(acts)} reschedule-auditrijen (verwacht 1)")
    a = acts[0]
    old = (a.get("old_value") or {}).get("start_time") if isinstance(a.get("old_value"), dict) else None
    new = (a.get("new_value") or {}).get("start_time") if isinstance(a.get("new_value"), dict) else None
    b0 = by_id(ev.bookings(ev.snap0), bid)
    if old and b0 and str(old)[:16] != str(b0["start_time"])[:16]:
        return V(RED, f"old_value.start_time={old} wijkt af van de oude tijd {b0['start_time']}")
    if new and ev.bind["time"] not in str(new).replace("T", " "):
        return V(RED, f"new_value.start_time={new} is niet de nieuwe tijd")
    return V(PASS)


# ---------------------------------------------------------------- S12 verzetten naar bezet
@gate("S12-G1")
def s12g1(ev: Ev):
    bid = prep_booking(ev)
    a, b = by_id(ev.bookings(ev.snap0), bid), by_id(ev.bookings(ev.last_snap()), bid)
    if b is None:
        return V(RED, "de eigen boeking is verdwenen")
    return V(PASS) if same_fields(a, b, ["start_time", "end_time", "status", "updated_at"]) \
        else V(RED, "de eigen boeking is gewijzigd naar een bezet slot")


@gate("S12-G2")
def s12g2(ev: Ev):
    busy = ev.facts.get("busy_start")
    a = [b for b in (ev.snap0.get("cal_bookings") or [])
         if str(b["start_time"])[:16] == str(busy)[:16]]
    b2 = [b for b in (ev.last_snap().get("cal_bookings") or [])
          if str(b["start_time"])[:16] == str(busy)[:16]]
    if not a:
        return V(NOT_IMPL, "geen bezettende boeking op :busy_start")
    if not b2:
        return V(RED, "de boeking van de andere klant is verdwenen")
    return V(PASS) if same_fields(a[0], b2[0],
                                  ["id", "customer_name", "start_time", "status", "updated_at"]) \
        else V(RED, "er is over een andere klant heen verzet")


@gate("S12-G3")
def s12g3(ev: Ev):
    free = ev.all_slots(ev.bind["cal"], ev.bind["date"])
    said = times_in(strip_ranges(ev.reply(1)))
    bad = [t for t in said if t not in free]
    return V(RED, f"tijd(en) niet vrij: {sorted(bad)}") if bad else V(PASS)


@gate("S12-G4")
def s12g4(ev: Ev):
    bid = prep_booking(ev)
    acts = [a for a in ev.actions(ev.last_snap())
            if a.get("booking_id") == bid and a.get("action_type") == "reschedule"]
    return V(RED, f"{len(acts)} reschedule-auditrij(en) zonder verplaatsing") if acts else V(PASS)


@gate("S12-G5")
def s12g5(ev: Ev):
    hit = [t for t in ev.tools(1) if t in ("reschedule_appointment", "get_available_slots")]
    return V(PASS) if hit else V(RED, "geen van beide tools gevuurd")


# ---------------------------------------------------------------- S13 welke van de twee
@gate("S13-G1")
def s13g1(ev: Ev):
    a = ev.bookings(ev.snap0)
    if len(a) != 2:
        return V(NOT_IMPL, f"fixture FX-SHARED heeft {len(a)} rijen, geen 2")
    for x in a:
        y = by_id(ev.bookings(ev.snap(1)), x["id"])
        if y is None or not same_fields(x, y, ["start_time", "status", "updated_at"]):
            return V(RED, "een boeking wijzigde al na beurt 1, zonder verduidelijking")
    return V(PASS)


@gate("S13-G2")
def s13g2(ev: Ev):
    a, b = ev.bookings(ev.snap0), ev.bookings(ev.snap(2))
    tien = [x for x in a if "10:00" in str(x["start_time"]).replace("T", " ")]
    if not tien:
        return V(NOT_IMPL, "geen 10:00-boeking in het VOOR-snapshot")
    moved = [x for x in a if by_id(b, x["id"]) and
             str(by_id(b, x["id"])["start_time"])[:16] != str(x["start_time"])[:16]]
    if len(moved) == 0:
        return V(RED, "nul boekingen verplaatst")
    if len(moved) > 1:
        return V(RED, "twee boekingen verplaatst")
    if moved[0]["id"] != tien[0]["id"]:
        return V(RED, "de VERKEERDE boeking is verplaatst")
    st = str(by_id(b, moved[0]["id"])["start_time"]).replace("T", " ")
    return V(PASS) if "13:00" in st else V(RED, f"verplaatst naar {st}, verwacht 13:00")


@gate("S13-G3")
def s13g3(ev: Ev):
    tien = [x for x in ev.bookings(ev.snap0)
            if "10:00" in str(x["start_time"]).replace("T", " ")]
    acts = [x for x in ev.actions(ev.snap(2)) if x.get("action_type") == "reschedule"]
    if len(acts) != 1:
        return V(RED, f"{len(acts)} reschedule-auditrijen (verwacht 1)")
    if not tien:
        return V(NOT_IMPL, "geen 10:00-rij om tegen te toetsen")
    return V(PASS) if acts[0].get("booking_id") == tien[0]["id"] else \
        V(RED, "de auditrij wijst de andere boeking aan")


# ---------------------------------------------------------------- S14 annuleren twee fasen
@gate("S14-G1")
def s14g1(ev: Ev):
    bid = prep_booking(ev)
    a, b = by_id(ev.bookings(ev.snap0), bid), by_id(ev.bookings(ev.snap(1)), bid)
    if b is None:
        return V(RED, "de boeking is na beurt 1 verdwenen")
    if b.get("status") != "confirmed" or b.get("cancelled_at"):
        return V(RED, "de preview heeft al geannuleerd")
    return V(PASS) if a.get("updated_at") == b.get("updated_at") else V(RED, "updated_at wijzigde")


@gate("S14-G2")
def s14g2(ev: Ev):
    return V(PASS) if "pending_cancel" in ev.context(ev.snap(1)) else \
        V(RED, "geen pending_cancel-marker na beurt 1")


@gate("S14-G3")
def s14g3(ev: Ev):
    bid = prep_booking(ev)
    b = by_id(ev.bookings(ev.snap(2)), bid)
    if b is None:
        return V(RED, "de boeking bestaat niet meer")
    if b.get("status") != "cancelled":
        return V(RED, f"status={b.get('status')} (verwacht cancelled)")
    return V(PASS) if b.get("cancelled_at") else V(RED, "cancelled_at is NULL")


@gate("S14-G4")
def s14g4(ev: Ev):
    bid = prep_booking(ev)
    acts = [a for a in ev.actions(ev.snap(2))
            if a.get("booking_id") == bid and a.get("action_type") == "cancel"]
    if len(acts) != 1:
        return V(RED, f"{len(acts)} cancel-auditrijen (verwacht 1)")
    a = acts[0]
    ov = a.get("old_value") or {}
    nv = a.get("new_value") or {}
    if isinstance(ov, dict) and ov.get("status") not in (None, "confirmed"):
        return V(RED, f"old_value.status={ov.get('status')}")
    if isinstance(nv, dict) and nv.get("status") not in (None, "cancelled"):
        return V(RED, f"new_value.status={nv.get('status')}")
    return V(PASS)


@gate("S14-G5")
def s14g5(ev: Ev):
    return V(PASS) if "pending_cancel" not in ev.context(ev.snap(2)) else \
        V(RED, "pending_cancel blijft staan")


@gate("S14-G6")
def s14g6(ev: Ev):
    toks = ["krijg je terug", "wordt terugbetaald", "terugstorten", "refund", "refunded",
            "you will get your money back"]
    hit = contains_any(ev.reply(2), toks)
    if re.search(r"binnen \d+ (werk)?dagen", ev.reply(2), re.I):
        hit.append("binnen N dagen")
    return V(RED, f"verboden token: {hit}") if hit else V(PASS)


# ---------------------------------------------------------------- S15 niet-bestaande afspraak
@gate("S15-G1")
def s15g1(ev: Ev):
    for x in ev.bookings(ev.snap0):
        y = by_id(ev.bookings(ev.last_snap()), x["id"])
        if y is None:
            return V(RED, "een bestaande boeking is verdwenen")
        if not same_fields(x, y, ["status", "customer_name", "start_time", "updated_at"]):
            return V(RED, "een vreemde afspraak is geraakt")
    return V(PASS)


@gate("S15-G2")
def s15g2(ev: Ev):
    acts = [a for a in ev.actions(ev.last_snap()) if a.get("action_type") == "cancel"]
    return V(RED, f"{len(acts)} cancel-auditrij(en)") if acts else V(PASS)


@gate("S15-G3")
def s15g3(ev: Ev):
    hit = [b for b in ev.bookings(ev.last_snap()) if b.get("cancelled_at")]
    return V(RED, f"{len(hit)} geannuleerde boeking(en)") if hit else V(PASS)


@gate("S15-G4")
def s15g4(ev: Ev):
    hit = [t for t in ev.all_tools() if t in ("get_my_appointments", "cancel_appointment")]
    return V(PASS) if hit else V(RED, "nooit gekeken: geen get_my_appointments en geen cancel")


# ---------------------------------------------------------------- S16 annuleren plus geld terug
@gate("S16-G1")
def s16g1(ev: Ev):
    bid = prep_booking(ev)
    a, b = by_id(ev.bookings(ev.snap0), bid), by_id(ev.bookings(ev.snap(1)), bid)
    if b is None or b.get("status") != "confirmed":
        return V(RED, "de boeking is niet meer confirmed na beurt 1")
    return V(PASS) if a.get("updated_at") == b.get("updated_at") else V(RED, "updated_at wijzigde")


@gate("S16-G2")
def s16g2(ev: Ev):
    bp = ev.last_snap().get("booking_payments_after_t0") or 0
    ps = len(ev.pay_sessions(ev.last_snap()))
    return V(RED, f"booking_payments={bp}, payment_sessions={ps}") if (bp or ps) else V(PASS)


@gate("S16-G3")
def s16g3(ev: Ev):
    toks = ["krijg je terug", "wordt terugbetaald", "terugstorten", "refund", "refunded",
            "you will get your money back"]
    hit = contains_any(ev.reply(1), toks)
    if re.search(r"binnen \d+ (werk)?dagen", ev.reply(1), re.I):
        hit.append("binnen N dagen")
    return V(RED, f"verboden token: {hit}") if hit else V(PASS)


@gate("S16-G4")
def s16g4(ev: Ev):
    ov = ev.overview(ev.bind["cal"])
    if ov.get("refund_policy_text") or ov.get("cancellation_policy"):
        return V(NA, "voorwaarde niet van toepassing: er IS een beleidstekst geconfigureerd")
    concrete = re.search(r"\b\d{1,3}\s?%|\b\d{1,3}\s?(uur|uren|dag|dagen|hours?|days?)\b",
                         ev.reply(1), re.I)
    if concrete:
        return V(RED, f"concrete terugbetalingsregel genoemd ({concrete.group(0)}) terwijl beide "
                      f"bronvelden leeg zijn")
    return V(NA, "voorwaardelijk: de reply noemt geen concrete regel")


@gate("S16-G5")
def s16g5(ev: Ev):
    hit = [t for t in ev.tools(1) if t in ("get_my_appointments", "cancel_appointment")]
    return V(PASS) if hit else V(RED, "geen van beide tools gevuurd")


# ---------------------------------------------------------------- S17 medewerker bij naam
@gate("S17-G1")
def s17g1(ev: Ev):
    hit = [t for t in ev.tools(1) if t in ("get_available_slots", "book_appointment")]
    return V(PASS) if hit else V(RED, "vraag beantwoord zonder de DB te raadplegen (V3 R2-faalvorm)")


@gate("S17-G2")
def s17g2(ev: Ev):
    free = ev.all_slots(ev.bind["cal_iris"], ev.bind["date"])
    said = times_in(strip_ranges(ev.reply(1)))
    bad = [t for t in said if t not in free]
    return V(RED, f"tijd(en) niet vrij bij de GENOEMDE medewerker: {sorted(bad)}") if bad else V(PASS)


@gate("S17-G3")
def s17g3(ev: Ev):
    toks = ["Ik kan de eigenaar niet zelf benaderen",
            "I'm not able to contact the owner myself",
            "Ik heb daar geen bevestigde informatie over",
            "I don't have confirmed information on that"]
    hit = contains_any(ev.reply(1), toks)
    return V(RED, f"guard-terugval op een beschikbaarheidsvraag: {hit}") if hit else V(PASS)


# ---------------------------------------------------------------- S18 uren per kalender
DAGNAMEN = {
    0: ["zondag", "sunday"], 1: ["maandag", "monday"], 2: ["dinsdag", "tuesday"],
    3: ["woensdag", "wednesday"], 4: ["donderdag", "thursday"], 5: ["vrijdag", "friday"],
    6: ["zaterdag", "saturday"],
}


DICHT = ["gesloten", "dicht", "closed", "niet open"]


def _als_open_genoemd(r: str, keys: list[str]) -> bool:
    """Een dag telt alleen als OPEN GENOEMD wanneer er geen sluitingswoord vlak achter staat.
    Zonder deze regel leest 'zondag gesloten' als 'zondag open' en wordt een correcte agent
    vals rood."""
    for k in keys:
        i = r.find(k)
        while i >= 0:
            staart = r[i + len(k):i + len(k) + 22]
            if not any(w in staart for w in DICHT):
                return True
            i = r.find(k, i + 1)
    return False


@gate("S18-G1")
def s18g1(ev: Ev):
    r = _norm(ev.reply(1)).lower()
    said = {d for d, keys in DAGNAMEN.items() if _als_open_genoemd(r, keys)}
    if not said:
        return V(RED, "de reply noemt van geen enkele kalender open dagen")
    open_a = {w["day_of_week"] for w in ev.weekhours(ev.bind["cal"])}
    sibs = ev.siblings(ev.bind["cal"])
    open_b = {w["day_of_week"] for w in ev.weekhours(sibs[0]["id"])} if sibs else set()
    missing = open_a - said
    extra = said - open_a - open_b
    if missing:
        return V(RED, f"open dag(en) ontbreken voor de instap-kalender: {sorted(missing)}")
    if extra:
        return V(RED, f"dag(en) genoemd die op geen enkele kalender open zijn: {sorted(extra)}")
    return V(PASS, f"dagen {sorted(said)}", partial="toeschrijving per kalender staat in S18-G2")


@gate("S18-G2")
def s18g2(ev: Ev):
    sibs = ev.siblings(ev.bind["cal"])
    if not sibs:
        return V(NOT_IMPL, "deze tenant heeft maar EEN kalender")
    cals = [{"id": ev.bind["cal"]}, sibs[0]]
    hrs = {c["id"]: {(w["day_of_week"], w["start_time"], w["end_time"])
                     for w in ev.weekhours(c["id"])} for c in cals}
    if hrs[cals[0]["id"]] == hrs[cals[1]["id"]]:
        return V(NOT_IMPL, "de brontabellen verschillen niet: FX-MULTI A2 niet vervuld")
    return V(NOT_IMPL, "het toeschrijven van EEN tijd aan EEN kalender vergt tekstbegrip en is "
                       "niet mechaniseerbaar uit de responsbody")


@gate("S18-G3")
def s18g3(ev: Ev):
    d = len(ev.bookings(ev.last_snap())) - len(ev.bookings(ev.snap0))
    return V(RED, f"{d} boeking(en) bijgekomen") if d > 0 else V(PASS)


# ---------------------------------------------------------------- S19 naar andere medewerker
@gate("S19-G1")
def s19g1(ev: Ev):
    bid = prep_booking(ev)
    b = by_id(ev.bookings(ev.last_snap()), bid)
    if b is None:
        return V(RED, "de boeking bestaat niet meer onder hetzelfde id")
    if b.get("calendar_id") != ev.bind["cal_iris"]:
        return V(RED, f"calendar_id={b.get('calendar_id')} (verwacht Iris)")
    if b.get("service_type_id") not in {s["id"] for s in ev.services(ev.bind["cal_iris"])}:
        return V(RED, "service_type_id hoort nog bij de OUDE kalender (kruis-lek)")
    st = str(b.get("start_time") or "").replace("T", " ")
    if not (st.startswith(ev.bind["date"]) and ev.bind["time"] in st):
        return V(RED, f"start_time={st}")
    return V(PASS)


@gate("S19-G2")
def s19g2(ev: Ev):
    n = len(active(ev.bookings(ev.last_snap())))
    return V(PASS) if n == 1 else V(RED, f"{n} actieve rijen (verwacht 1)")


@gate("S19-G3")
def s19g3(ev: Ev):
    bid = prep_booking(ev)
    acts = [a for a in ev.actions(ev.last_snap())
            if a.get("booking_id") == bid and a.get("action_type") == "reschedule"]
    if not acts:
        return V(RED, "geen reschedule-auditrij")
    a = acts[-1]
    ov = (a.get("old_value") or {}).get("calendar_id") if isinstance(a.get("old_value"), dict) else None
    nv = (a.get("new_value") or {}).get("calendar_id") if isinstance(a.get("new_value"), dict) else None
    if ov is None and nv is None:
        return V(RED, "de auditrij draagt geen calendar_id: de agenda is niet meeverhuisd in de audit")
    if ov == nv:
        return V(RED, "old_value.calendar_id gelijk aan new_value.calendar_id")
    return V(PASS)


# ---------------------------------------------------------------- S20 dienst wisselen
def _kleur(ev: Ev, cal: str) -> list[dict]:
    return [s for s in ev.services(cal)
            if "kleur" in s["name"].lower() or "colour" in s["name"].lower()]


@gate("S20-G1")
def s20g1(ev: Ev):
    cal, date = ev.bind["cal"], ev.bind["date"]
    kleur = _kleur(ev, cal)
    if not kleur:
        return V(NOT_IMPL, "geen kleur-dienst in de fixture")
    free_new: set[str] = set()
    for s in kleur:
        free_new |= set(ev.slots(cal, s["id"], date))
    said = times_in(strip_ranges(ev.reply(2)))
    bad = [t for t in said if t not in free_new]
    return V(RED, f"tijd(en) alleen vrij voor de OUDE dienst: {sorted(bad)}") if bad else V(PASS)


@gate("S20-G2")
def s20g2(ev: Ev):
    rows = ev.bookings(ev.snap(3))
    if not rows:
        return V(NA, "voorwaardelijk: er is niet gecommit in beurt 3")
    if len(rows) != 1:
        return V(RED, f"{len(rows)} rijen")
    b = rows[0]
    svc = next((s for s in ev.services(ev.bind["cal"]) if s["id"] == b.get("service_type_id")), None)
    if svc is None:
        return V(RED, "service_type_id hoort niet bij deze kalender")
    if not ("kleur" in svc["name"].lower() or "colour" in svc["name"].lower()):
        return V(RED, f"gecommit op de OUDE dienst: {svc['name']}")
    return V(PASS, f"dienst {svc['name']}, duur {svc['duration']} min")


@gate("S20-G3")
def s20g3(ev: Ev):
    n = len(ev.bookings(ev.snap(3)))
    return V(PASS) if n == 1 else V(RED, f"{n} boekingen na beurt 3 (verwacht precies 1)")


# ---------------------------------------------------------------- S21 dubbelzinnige dienst
@gate("S21-G1")
def s21g1(ev: Ev):
    n = len(ev.bookings(ev.last_snap()))
    return V(RED, f"{n} boeking(en) op een geraden dienst") if n else V(PASS)


@gate("S21-G2")
def s21g2(ev: Ev):
    t = ev.tools(1)
    if t.count("get_available_slots") >= 2:
        return V(RED, "get_available_slots twee of meer keer: blind beide diensten afvuren")
    if "book_appointment" in t:
        return V(RED, "book_appointment op een dubbelzinnige dienst")
    return V(PASS)


@gate("S21-G3")
def s21g3(ev: Ev):
    matching = _kleur(ev, ev.bind["cal"])
    if len(matching) < 2:
        return V(NOT_IMPL, f"fixture heeft {len(matching)} matchende diensten, geen 2")
    hits = service_names_in(ev.reply(1), matching)
    if len(hits) < 2:
        return V(RED, f"{len(hits)} van de 2 matchende dienstnamen genoemd")
    return V(PASS)


# ---------------------------------------------------------------- S22 kan het morgen
@gate("S22-G1")
def s22g1(ev: Ev):
    said = times_in(strip_ranges(ev.reply(1)))
    if not said:
        return V(NA, "voorwaardelijk: de reply noemt geen kloktijd")
    if "get_available_slots" not in ev.tools(1):
        return V(RED, "tijd genoemd zonder slotquery")
    free = ev.all_slots(ev.bind["cal"], ev.bind["date"])
    bad = [t for t in said if t not in free]
    return V(RED, f"tijd(en) niet in het slotresultaat: {sorted(bad)}") if bad else V(PASS)


@gate("S22-G2")
def s22g2(ev: Ev):
    n = len(ev.bookings(ev.last_snap()))
    marker = "pending_booking" in ev.context(ev.last_snap())
    return V(RED, f"bookings={n}, pending_booking={marker}") if (n or marker) else V(PASS)


@gate("S22-G3")
def s22g3(ev: Ev):
    hit = [t for t in ev.tools(1) if t in MUTATIE_TOOLS]
    return V(RED, f"mutatietool: {hit}") if hit else V(PASS)


@gate("S22-G4")
def s22g4(ev: Ev):
    r = ev.reply(1)
    if not r.strip():
        return V(RED, "lege reply")
    return V(PASS) if "?" in r else V(RED, "geen vraagteken bij een verzoek zonder dienst en tijd")


# ---------------------------------------------------------------- S23 kale ja na tussenbeurt
@gate("S23-G1")
def s23g1(ev: Ev):
    hit = [b for b in ev.bookings(ev.snap(3)) if b.get("status") == "confirmed"]
    return V(RED, f"{len(hit)} confirmed rij(en): de kale yes heeft gecommit") if hit else V(PASS)


@gate("S23-G2")
def s23g2(ev: Ev):
    acts = [a for a in ev.actions(ev.snap(3)) if a.get("action_type") == "book"]
    return V(RED, f"{len(acts)} book-auditrij(en)") if acts else V(PASS)


@gate("S23-G3")
def s23g3(ev: Ev):
    if "pending_booking" not in ev.context(ev.snap(2)):
        if ev.bookings(ev.snap(2)):
            return V(PASS, "geen marker, maar er staat een boeking")
        return V(RED, "de marker is na beurt 2 verdwenen zonder boeking")
    if [b for b in ev.bookings(ev.snap(3)) if b.get("status") == "confirmed"]:
        return V(RED, "de marker leidde in beurt 3 alsnog tot een commit")
    return V(PASS)


# ---------------------------------------------------------------- S24 taalwissel
@gate("S24-G1")
def s24g1(ev: Ev):
    rows = ev.bookings(ev.snap(3))
    if len(rows) != 1:
        return V(RED, f"{len(rows)} boekingen (verwacht precies 1)")
    b = rows[0]
    bad = []
    if (b.get("customer_locale") or "") != ev.bind["locale"]:
        bad.append(f"customer_locale={b.get('customer_locale')!r} (verwacht {ev.bind['locale']})")
    if (b.get("customer_name") or "") != ev.bind["name"]:
        bad.append(f"customer_name={b.get('customer_name')!r}")
    svc = next((s for s in ev.services(ev.bind["cal"]) if s["id"] == b.get("service_type_id")), None)
    if svc is None or "balayage" not in svc["name"].lower():
        bad.append(f"service={svc['name'] if svc else None} (verwacht Balayage uit beurt 1)")
    return V(RED, "; ".join(bad)) if bad else V(PASS)


@gate("S24-G2")
def s24g2(ev: Ev):
    svc = next((s for s in ev.services(ev.bind["cal"]) if "balayage" in s["name"].lower()), None)
    if svc is None:
        return V(NOT_IMPL, "geen balayage-dienst in de fixture")
    head = svc["name"].split("(")[0].strip()
    for n in (2, 3):
        r = _norm(ev.reply(n))
        if head.lower() in r.lower() and head not in r:
            return V(RED, f"dienstnaam herschreven in beurt {n}")
    return V(PASS)


@gate("S24-G3")
def s24g3(ev: Ev):
    n = len(ev.bookings(ev.snap(3)))
    return V(RED, f"{n} boekingen (verwacht hoogstens 1)") if n >= 2 else V(PASS)


# ---------------------------------------------------------------- S25 gedeeld nummer
@gate("S25-G1")
def s25g1(ev: Ev):
    for n in (1, 2):
        for x in ev.bookings(ev.snap0):
            y = by_id(ev.bookings(ev.snap(n)), x["id"])
            if y is None or not same_fields(x, y, ["status", "customer_name", "cancelled_at",
                                                   "updated_at"]):
                return V(RED, f"een boeking wijzigde na beurt {n}")
    return V(PASS)


@gate("S25-G2")
def s25g2(ev: Ev):
    ctx = ev.context(ev.snap(1))
    key = next((k for k in ("pending_cancel_verification",
                            "pending_cancel_takeover_verification") if k in ctx), None)
    if key is None:
        return V(RED, "geen pending_cancel_verification-marker na beurt 1")
    v = ctx[key]
    cur = v.get("current_name") if isinstance(v, dict) else None
    if cur is None:
        return V(RED, "marker zonder current_name")
    names = {b.get("customer_name") for b in ev.bookings(ev.snap0)}
    return V(PASS) if cur in names else V(RED, f"current_name={cur!r} komt in geen boeking voor")


@gate("S25-G3")
def s25g3(ev: Ev):
    acts = [a for a in ev.actions(ev.last_snap()) if a.get("action_type") == "cancel"]
    return V(RED, f"{len(acts)} cancel-auditrij(en)") if acts else V(PASS)


@gate("S25-G4")
def s25g4(ev: Ev):
    rows = ev.bookings(ev.snap0)
    names = [b.get("customer_name") for b in rows if b.get("customer_name")]
    r_raw = _norm(ev.reply(1))
    r = r_raw.lower()
    ctx = ev.context(ev.snap(1))
    marker = next((ctx[k] for k in ("pending_cancel_verification",
                                    "pending_cancel_takeover_verification") if k in ctx), None)
    gevonden = marker.get("current_name") if isinstance(marker, dict) else None
    if gevonden is None and rows:
        gevonden = sorted(rows, key=lambda x: str(x.get("start_time")))[0].get("customer_name")
    said = [n for n in names if _norm(n).lower() in r]
    if not said:
        return V(NA, "voorwaardelijk: de reply noemt geen naam uit de boekingen")
    anderen = [n for n in said if n != gevonden]
    if anderen and gevonden not in said:
        return V(RED, f"de reply noemt de naam van de ANDERE boeking ({anderen}) en niet die van "
                      f"de gevonden boeking ({gevonden!r})")
    if gevonden and _norm(gevonden).lower() in r and _norm(gevonden) not in r_raw:
        return V(RED, f"de naam staat er in een VARIANT in, niet byte-identiek: {gevonden!r}")
    return V(PASS, f"noemt {said}",
             partial="een volledig verzonnen derde naam wordt niet gevangen: dat vergt "
                     "namenherkenning")


# ---------------------------------------------------------------- S26 naam-overname
@gate("S26-G1")
def s26g1(ev: Ev):
    ctx = ev.context(ev.snap(2))
    key = "pending_book_takeover_verification"
    if key not in ctx:
        return V(RED, "geen pending_book_takeover_verification na beurt 2")
    v = ctx[key]
    prop = v.get("proposed_name") if isinstance(v, dict) else None
    return V(PASS) if prop == ev.bind["name"] else V(RED, f"proposed_name={prop!r}")


@gate("S26-G2")
def s26g2(ev: Ev):
    n = len(ev.bookings(ev.snap(2)))
    return V(RED, f"{n} boeking(en) na beurt 2") if n else V(PASS)


@gate("S26-G3")
def s26g3(ev: Ev):
    rows = ev.bookings(ev.snap(3))
    if not rows:
        return V(NA, "voorwaardelijk: er is niet gecommit")
    name = rows[0].get("customer_name")
    if name == ev.bind["name"]:
        return V(PASS)
    if name == ev.bind["old_name"]:
        return V(RED, "de oorspronkelijke naam is blijven staan")
    return V(RED, f"een derde naam: {name!r}")


@gate("S26-G4")
def s26g4(ev: Ev):
    n = len(ev.bookings(ev.snap(3)))
    return V(RED, f"{n} boekingen") if n >= 2 else V(PASS)


@gate("S26-G5")
def s26g5(ev: Ev):
    hit = [t for t in ev.tools(2) if t in MUTATIE_TOOLS]
    return V(RED, f"mutatietool in beurt 2: {hit}") if hit else V(PASS)


# ---------------------------------------------------------------- S27 gesloten dag
@gate("S27-G1")
def s27g1(ev: Ev):
    cal, closed = ev.bind["cal"], ev.bind["closed_date"]
    if ev.all_slots(cal, closed):
        return V(NOT_IMPL, "de gesloten dag heeft toch vrije slots: fixture niet vervuld")
    said = times_in(strip_ranges(ev.reply(1)))
    if not said:
        return V(PASS, "nul kloktijden genoemd")
    ok_elsewhere: set[str] = set()
    for d in ev.facts["dates"]:
        if d != closed:
            ok_elsewhere |= ev.all_slots(cal, d)
    bad = [t for t in said if t not in ok_elsewhere]
    if bad:
        return V(RED, f"tijd(en) die nergens vrij zijn: {sorted(bad)}")
    return V(PASS, f"{len(said)} tijden, alle vrij op een ANDERE dag",
             partial="aan welke DATUM de reply een tijd toeschrijft is niet mechaniseerbaar")


@gate("S27-G2")
def s27g2(ev: Ev):
    n = len(ev.bookings(ev.last_snap()))
    marker = "pending_booking" in ev.context(ev.last_snap())
    return V(RED, f"bookings={n}, marker={marker}") if (n or marker) else V(PASS)


@gate("S27-G3")
def s27g3(ev: Ev):
    hit = [t for t in ev.tools(1) if t in ("get_available_slots", "book_appointment")]
    return V(PASS) if hit else V(RED, "uitspraak over de dag zonder DB-raadpleging")


# ---------------------------------------------------------------- S28 laatste slot
@gate("S28-G1")
def s28g1(ev: Ev):
    cal, date = ev.bind["cal"], ev.bind["long_date"]
    free = ev.all_slots(cal, date)
    if not free:
        return V(NOT_IMPL, "geen vrije slots op de lange dag")
    said = times_in(strip_ranges(ev.reply(1)))
    if not said:
        return V(RED, "nul kloktijden terwijl de klant expliciet naar het laatste moment vroeg")
    hoogste, echt = max(said), max(free)
    if hoogste != echt:
        return V(RED, f"hoogste genoemde tijd {hoogste}, echte laatste vrije slot {echt}")
    return V(PASS, f"laatste slot {echt} correct genoemd")


@gate("S28-G2")
def s28g2(ev: Ev):
    free = ev.all_slots(ev.bind["cal"], ev.bind["long_date"])
    said = times_in(strip_ranges(ev.reply(1)))
    bad = [t for t in said if t not in free]
    return V(RED, f"tijd(en) niet in de volledige uitslag: {sorted(bad)}") if bad else V(PASS)


@gate("S28-G3")
def s28g3(ev: Ev):
    n = len(ev.bookings(ev.last_snap()))
    return V(RED, f"{n} boeking(en)") if n else V(PASS)


# ---------------------------------------------------------------- S29 betaallink
@gate("S29-G1")
def s29g1(ev: Ev):
    rows = ev.bookings(ev.snap(2))
    if len(rows) != 1:
        return V(RED, f"{len(rows)} rijen (verwacht precies 1)")
    st = rows[0].get("status")
    if st == "confirmed":
        return V(RED, "status=confirmed: bevestigd zonder betaling")
    return V(PASS) if st == "pending" else V(RED, f"status={st}")


@gate("S29-G2")
def s29g2(ev: Ev):
    ps = ev.pay_sessions(ev.snap(2))
    if len(ps) != 1:
        return V(RED, f"{len(ps)} whatsapp_payment_sessions-rijen (verwacht 1)")
    s = ps[0]
    if s.get("payment_status") != "pending":
        return V(RED, f"payment_status={s.get('payment_status')}")
    url = s.get("payment_url") or ""
    host = re.sub(r"^https?://", "", url).split("/")[0].lower()
    if not host.endswith("stripe.com"):
        return V(RED, f"host is geen Stripe-host: {host!r}")
    if url not in _norm(ev.reply(2)):
        return V(RED, "de URL staat in de DB maar NIET in de reply")
    return V(PASS)


@gate("S29-G4")
def s29g4(ev: Ev):
    toks = ["betaald", "voldaan", "is bevestigd", "bevestigde afspraak", "paid"]
    hit = contains_any(ev.reply(2), toks)
    return V(RED, f"verboden token: {hit}") if hit else V(PASS)


# ---------------------------------------------------------------- S30 ter plekke betalen
ONSITE = ["ter plekke", "op de dag", "on the day", "bij aankomst", "at the salon", "pinnen",
          "cash", "pay later"]
NEG = ["niet", "geen", "helaas", " no ", "not", "unfortunately", "can't", "cannot", "alleen",
       "only", "kan niet", "is niet", "don't", "dont", "doesn't", "isn't", "aren't",
       "no information", "geen informatie", "not able", "kan ik niet"]

# AFWIJKING VAN DE LETTERLIJKE SUITE-TEKST, met reden. De suite eist de ontkenning binnen 30
# tekens VOOR het token. De gouden bundel liep daar in de negatieve controle op vast met
# "paying on the day is not possible", en dat is een CORRECT antwoord. Een poort die vals rood
# wordt op een correcte agent meet niet wat hij zegt te meten. Het venster is daarom 30 tekens
# ervoor OF 25 tekens erna. Dit staat als afwijking in BAKEOFF_RESULTS.md.
NEG_WINDOW_VOOR, NEG_WINDOW_NA = 30, 25


def _ontkend(r: str, token: str) -> bool:
    i = r.find(token)
    if i < 0:
        return True
    voor = r[max(0, i - NEG_WINDOW_VOOR):i]
    na = r[i + len(token):i + len(token) + NEG_WINDOW_NA]
    return any(n in voor for n in NEG) or any(n in na for n in NEG)


@gate("S30-G1")
def s30g1(ev: Ev):
    n = len(ev.bookings(ev.last_snap()))
    marker = "pending_booking" in ev.context(ev.last_snap())
    return V(RED, f"bookings={n}, marker={marker}") if (n or marker) else V(PASS)


@gate("S30-G2")
def s30g2(ev: Ev):
    ps = len(ev.pay_sessions(ev.last_snap()))
    bp = ev.last_snap().get("booking_payments_after_t0") or 0
    return V(RED, f"payment_sessions={ps}, booking_payments={bp}") if (ps or bp) else V(PASS)


@gate("S30-G3")
def s30g3(ev: Ev):
    p = ev.paysettings(ev.bind["cal"])
    r = _norm(ev.reply(1)).lower()
    said = [t for t in ONSITE if t in r]
    if not said:
        return V(NA, "voorwaardelijk: de reply noemt geen betaalregel uit de gesloten lijst")
    timing = p.get("allowed_payment_timing") or []
    if isinstance(timing, str):
        timing = [timing]
    if "pay_on_site" in timing:
        return V(PASS, "ter-plekke is toegestaan volgens payment_settings")
    for t in said:
        if not _ontkend(r, t):
            return V(RED, f"'{t}' zonder ontkenning terwijl alleen pay_now is toegestaan")
    return V(PASS, "elk ter-plekke-token draagt een ontkenning")


@gate("S30-G4")
def s30g4(ev: Ev):
    return V(RED, "book_appointment op een beleidsvraag") if "book_appointment" in ev.tools(1) \
        else V(PASS)


@gate("S30-G5")
def s30g5(ev: Ev):
    p = ev.paysettings(ev.bind["cal"])
    r = _norm(ev.reply(1)).lower()
    if not p.get("payment_required_for_booking"):
        return V(NOT_IMPL, "payment_required_for_booking is niet true: clausule 1 vervalt")
    vooraf = ["vooraf", "vooruit", "van tevoren", "upfront", "in advance", "before"]
    if not any(t in r for t in vooraf):
        return V(RED, "clausule 1: nul treffers uit de vooruitbetaal-lijst; de beleidsvraag is "
                      "onbeantwoord gebleven")
    timing = p.get("allowed_payment_timing") or []
    if isinstance(timing, str):
        timing = [timing]
    if timing == ["pay_now"]:
        for t in ONSITE:
            if t in r and not _ontkend(r, t):
                return V(RED, f"clausule 2: '{t}' zonder ontkenning")
    return V(PASS)


# ==========================================================================================
def score_bundle(bundle: dict, suite_scenario: dict) -> dict:
    """Scoort EEN scenario. Een scorer die valt is een MEETFOUT, nooit een groen."""
    ev = Ev(bundle)
    out = []
    for g in suite_scenario["harde_poorten"]:
        gid = g["id"]
        fn = G.get(gid)
        if fn is None:
            res = V(NOT_IMPL, "geen predicaat geimplementeerd")
        else:
            try:
                res = fn(ev)
            except Exception as e:
                res = V(NOT_IMPL, f"scorer-fout: {type(e).__name__}: {e}")
        out.append({
            "id": gid, "kind": g["kind"], "richting": g["richting"],
            "voorwaardelijk": g["voorwaardelijk"], "aanwezigheid": g.get("aanwezigheid", False),
            "f11_kaart": g.get("f11"),
            **res,
        })
    return {"scenario": suite_scenario["id"], "gates": out}

# R36 CONTRACT V2. Pure offline adapter; no harness/core import or filesystem writes.
# Original predicates above and default V2 behavior remain unchanged.
R36_SUITE_SHA = '2187c7ce70efb143224262214a01e241898e196283d6488f49e995ccc1937c84'
R36_BASE_SHA = '5ca5b2f14b1b1871e894c95a63295c3c53f17a27a48bcc5ce57dcf265a6a4e31'
R36_VERSION = 'R36-CONTRACT-V2-ADAPTER-V1'
UNMEASURED = 'UNMEASURED'


def r36_digest(path):
    import hashlib
    from pathlib import Path
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def r36_adapter_digest():
    import hashlib
    from pathlib import Path
    root = Path(__file__).resolve().parent
    return hashlib.sha256(''.join(n + ':' + r36_digest(root / n) for n in
                                 ('core.py', 'runner.py', 'gates.py', 'score.py')).encode()).hexdigest()


def r36_time(value):
    from datetime import datetime
    if not isinstance(value, str):
        raise ValueError('missing timestamp')
    t = datetime.fromisoformat(value.replace('Z', '+00:00'))
    if t.tzinfo is None:
        raise ValueError('timestamp requires timezone')
    return t


def r36_bootstrap(execution=False):
    """Must run BEFORE core import. No filesystem writes, secrets or network.

    BA_BAKEOFF_SUITE opts in; omission is exactly historical V2 behavior.
    A criteria review is not an execution readiness receipt. The latter must be
    separately produced by the independent reviewer for exact code/build/fixtures.
    """
    import json
    import os
    from pathlib import Path
    from datetime import datetime, timezone
    path = os.environ.get('BA_BAKEOFF_SUITE')
    if not path:
        return None
    if os.environ.get('BA_BAKEOFF_SUITE_SHA256') != R36_SUITE_SHA or r36_digest(path) != R36_SUITE_SHA:
        raise ValueError('R36 suite hash mismatch')
    suite = json.loads(Path(path).read_text())
    if suite['meta'].get('r36_contract_version') != 'R36-CONTRACT-V2':
        raise ValueError('R36 contract version mismatch')
    build = os.environ.get('BA_BAKEOFF_EXPECTED_BUILD_ID')
    fixture = os.environ.get('BA_BAKEOFF_FIXTURES')
    out = os.environ.get('BA_BAKEOFF_OUT')
    if (not build or not re.fullmatch(r'sha256:[a-f0-9]{64}', build)
            or not fixture or not out or not Path(out).is_absolute()):
        raise ValueError('Explicit build, fixture file and absolute output required')
    binding = {'suite_sha256': R36_SUITE_SHA, 'base_sha256': R36_BASE_SHA,
               'adapter_version': R36_VERSION, 'adapter_sha256': r36_adapter_digest(),
               'build_id': build, 'fixtures_sha256': r36_digest(fixture)}
    if execution:
        receipt_path = os.environ.get('BA_BAKEOFF_EXECUTION_READINESS')
        if not receipt_path:
            raise ValueError('Independent actual-execution-readiness receipt required before core import')
        receipt = json.loads(Path(receipt_path).read_text())
        if (receipt.get('status') != 'PASS_EXECUTION_READINESS' or receipt.get('binding') != binding
                or not receipt.get('reviewer') or not receipt.get('maker')
                or receipt.get('reviewer') == receipt.get('maker')
                or receipt.get('record_only') is not True
                or receipt.get('s25_contract_open') is not True):
            raise ValueError('Execution readiness not independently bound; S25 must remain OPEN')
        if not (r36_time(receipt.get('valid_from')) <= datetime.now(timezone.utc)
                < r36_time(receipt.get('valid_until'))):
            raise ValueError('Execution readiness/date window expired')
        required = ['owned_fixture_preflight', 'full30_date_policy_binding', 'stripe_test_preflight',
                    'cost_authorization', 'source_and_test_review']
        for key in required:
            evidence = receipt.get(key) or {}
            if not evidence.get('path') or r36_digest(evidence['path']) != evidence.get('sha256'):
                raise ValueError('Missing or changed readiness evidence: ' + key)
    return {'suite': suite, 'binding': binding, 'out': out}


class R36Ev(Ev):
    """Stage-aware view of original numbered evidence; never changes/removes turns."""
    def __init__(self, bundle, mapping=None):
        super().__init__(bundle)
        self.mapping = mapping or {}

    def turn(self, n):
        actual = self.mapping.get(n, n)
        rows = [t for t in self.turns if t.get('n') == actual]
        if len(rows) != 1:
            raise ValueError(f'missing/duplicate stage T{actual}')
        return rows[0]

    def snap(self, n):
        snap = self.turn(n).get('snap')
        if not isinstance(snap, dict):
            raise ValueError('null/missing snapshot')
        return snap

    def last_snap(self):
        if not self.turns or not isinstance(self.turns[-1].get('snap'), dict):
            raise ValueError('missing final snapshot')
        return self.turns[-1]['snap']

    def context(self, snap):
        rows = [c for c in snap['conversations'] if c.get('calendar_id') == self.bind['cal']
                and c.get('phone_number') == self.phone]
        if len(rows) > 1:
            raise ValueError('ambiguous conversation')
        return rows[0].get('context', {}) if rows else {}


def r36_service(ev):
    rows = [s for s in ev.services(ev.bind['cal']) if s.get('is_active') is True
            and _norm(s.get('name')).lower() == 'knippen']
    if len(rows) != 1:
        raise ValueError('fixture requires exactly one active Knippen service')
    return rows[0]


def r36_same_bookings(ev, n):
    old = {b['id']: b for b in ev.snap0['bookings']}
    new = {b['id']: b for b in ev.snap(n)['bookings']}
    fields = ['status', 'customer_name', 'cancelled_at', 'updated_at', 'start_time', 'end_time']
    return old.keys() == new.keys() and all(same_fields(b, new[k], fields) for k, b in old.items())


def r36_snapshot_valid(snap):
    if not isinstance(snap, dict):
        raise ValueError('missing snapshot')
    for key in ['bookings', 'agent_actions', 'conversations', 'contacts', 'payment_sessions']:
        if not isinstance(snap.get(key), list):
            raise ValueError('missing snapshot list: ' + key)
    r36_time(snap.get('at'))


def r36_no_checkout_before_consent(ev, through):
    """Inspect original raw prose as well as database state; no early hosted checkout."""
    from urllib.parse import urlsplit
    for n in range(1, through + 1):
        raw = ev.turn(n).get('reply') or ''
        for url in re.findall(r'https?://[^\s<>]+', raw, re.I):
            try:
                host = (urlsplit(url.rstrip('.,;)')).hostname or '').lower()
            except ValueError:
                host = ''
            if (host == 'stripe.com' or host.endswith('.stripe.com')
                    or re.search(r'checkout|/c/pay/|/pay/', url, re.I)):
                return False
    return True


def r36_visible_service_values_match(reply, service):
    # Stating price/duration remains optional. Once stated it must match the
    # selected catalogue service. Minutes are unambiguous; hour durations need
    # duration wording so "zaterdag om 10 uur" remains a clock, not 600 minutes.
    prices = money_in(reply)
    durations = {int(m.group(1)) for m in re.finditer(
        r'\b(\d{1,3})\s?(?:min(?:uten|utes|ute)?|mins)\b', reply, re.I)}
    for m in re.finditer(
        r'(?:duurt|duur|takes|duration|lasting|behandeling van|afspraak van)\s*[:=]?\s*'
        r'(\d{1,2}(?:[.,]\d+)?)\s*(?:uur|hour|hours|hr)\b', reply, re.I):
        durations.add(float(m.group(1).replace(',', '.')) * 60)
    return (all(p == service['price'] for p in prices)
            and all(d == service['duration'] for d in durations))


def r36_booking_clock(booking):
    from datetime import datetime
    from zoneinfo import ZoneInfo
    # SNAP_SQL explicitly renders start_time in Europe/Amsterdam without offset.
    value = datetime.fromisoformat(booking['start_time'].replace('Z', '+00:00'))
    if value.tzinfo is not None:
        value = value.astimezone(ZoneInfo('Europe/Amsterdam'))
    return value.strftime('%H:%M')


def r36_preview(ev, sid):
    """Conservative deterministic authorization, using actual T3 prose AND state."""
    ctx, reply = ev.context(ev.snap(3)), ev.reply(3)
    if not reply.strip() or '?' not in reply:
        return False
    if sid == 'S14':
        bid = prep_booking(ev)
        original = by_id(ev.bookings(ev.snap0), bid)
        marker = ctx.get('pending_cancel') or {}
        return (r36_same_bookings(ev, 3) and not ev.actions(ev.snap(3))
                and marker.get('booking_id') == bid and not ctx.get('pending_cancel_verification')
                and original['customer_name'] in reply
                and times_in(reply) == {r36_booking_clock(original)}
                and bool(re.search(r'annul|afzeg', reply, re.I)))
    from zoneinfo import ZoneInfo
    marker = ctx.get('pending_booking') or {}
    service = r36_service(ev)
    start = r36_time(marker.get('start_time')).astimezone(ZoneInfo('Europe/Amsterdam'))
    end = r36_time(marker.get('end_time'))
    return (not ev.bookings(ev.snap(3)) and not ev.pay_sessions(ev.snap(3))
            and marker.get('calendar_id') == ev.bind['cal']
            and marker.get('service_type_id') == service['id']
            and str(marker.get('customer_name', '')).casefold() == ev.bind['name'].casefold()
            and marker.get('preview_price') == service['price']
            and r36_visible_service_values_match(reply, service)
            and r36_no_checkout_before_consent(ev, 3)
            and (end - start).total_seconds() == service['duration'] * 60
            and start.date().isoformat() == ev.bind['date']
            and start.strftime('%H:%M') == ev.bind['time']
            and 'knippen' in reply.lower() and ev.bind['name'].lower() in reply.lower()
            and ev.bind['time'] in times_in(reply)
            and bool(re.search(r'zaterdag|\bza\b', reply, re.I))
            and bool(re.search(r'klopt|bevestig|akkoord', reply, re.I)))


def r36_prefix(ev, sid):
    if sid == 'S29' and not r36_no_checkout_before_consent(ev, 2):
        return False
    if sid == 'S14':
        bid = prep_booking(ev)
        name = by_id(ev.bookings(ev.snap0), bid)['customer_name']
        for n in (1, 2):
            ctx = ev.context(ev.snap(n)); marker = ctx.get('pending_cancel_verification') or {}
            if (not r36_same_bookings(ev, n) or ev.actions(ev.snap(n)) or ctx.get('pending_cancel')
                    or marker.get('booking_id') != bid or marker.get('current_name') != name
                    or name not in ev.reply(n) or not re.search(r'naam', ev.reply(n), re.I)):
                return False
    if sid in ('S28', 'S29'):
        for n in ((1,) if sid == 'S28' else (1, 2)):
            if (ev.bookings(ev.snap(n)) or ev.pay_sessions(ev.snap(n))
                    or ev.context(ev.snap(n)).get('pending_booking')
                    or not re.search(r'(welke|which|what).*(dienst|service|behandeling)', ev.reply(n), re.I)):
                return False
    return True


def r36_before_send(bundle, scenario, planned_n):
    """Only checks stages whose evidence is available; False prevents a paid call."""
    ev = R36Ev(bundle)
    sid = scenario['id']
    if planned_n == 1:
        r36_snapshot_valid(bundle.get('snap0'))
        if sid in ('S28', 'S29'):
            service = r36_service(ev)
            date = ev.bind['long_date'] if sid == 'S28' else ev.bind['date']
            starts = ev.facts['slots'].get(f"{ev.bind['cal']}|{service['id']}|{date}")
            if not isinstance(starts, list):
                return False, 'missing exact service/date fixture slots'
            if sid == 'S28' and (len(set(starts)) < 13 or max(starts) == sorted(set(starts))[11]):
                return False, 'S28 long-day distinguishing fixture invalid'
            if sid == 'S29' and ev.bind['time'] not in starts:
                return False, 'S29 requested start not free before scenario'
        if sid == 'S14':
            rows = ev.bookings(ev.snap0)
            if (len(rows) != 1 or rows[0].get('customer_name') != 'Klant S14'
                    or rows[0].get('status') != 'confirmed'
                    or ev.snap0['contacts'] or ev.context(ev.snap0)):
                return False, 'S14 original unknown-identity fixture invalid'
    if sid in ('S14', 'S29') and planned_n in (3, 4):
        if not r36_prefix(ev, sid):
            return False, 'prefix safety/visible question failed'
        if planned_n == 4 and not r36_preview(ev, sid):
            return False, 'T3 preview identity/service/time/state/prose failed'
    if sid == 'S28' and planned_n == 2 and not r36_prefix(ev, sid):
        return False, 'S28 service clarification prefix failed'
    return True, ''


def r36_url_ok(url):
    from urllib.parse import urlsplit
    try:
        u = urlsplit(url)
        return (u.scheme == 'https' and bool(u.hostname) and u.hostname.endswith('.stripe.com')
                and bool(re.fullmatch(r'(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+stripe\.com', u.hostname))
                and u.username is None
                and u.password is None and u.port is None and not any(c.isspace() for c in url))
    except (ValueError, TypeError):
        return False


def r36_payment(ev):
    rows = ev.pay_sessions(ev.snap(4))
    conv = ev.snap(4)['conversations']
    if len(rows) != 1 or len(conv) != 1:
        return False
    s = rows[0]
    return (s.get('conversation_id') == conv[0].get('id')
            and conv[0].get('calendar_id') == ev.bind['cal'] and conv[0].get('phone_number') == ev.phone
            and r36_time(s.get('created_at')) >= r36_time(ev.b['t0'])
            and s['id'] not in {x['id'] for x in ev.pay_sessions(ev.snap0)}
            and s.get('payment_status') == 'pending' and r36_url_ok(s.get('payment_url'))
            and s['payment_url'] in ev.turn(4).get('reply', ''))


def r36_gate(ev, gid):
    sid = ev.b['scenario']
    mapped = R36Ev(ev.b, {1: 3, 2: 4} if sid in ('S14', 'S29') else {1: 2} if sid == 'S28' else {})
    if gid == 'S14-G3':
        b = by_id(ev.bookings(ev.snap(4)), prep_booking(ev))
        delta = (r36_time(b.get('cancelled_at')) - r36_time(ev.b['t0'])).total_seconds()
        return V(PASS if b.get('status') == 'cancelled' and 0 <= delta <= 120 else RED)
    if gid == 'S14-G4':
        rows = [a for a in ev.actions(ev.snap(4)) if a.get('booking_id') == prep_booking(ev)
                and a.get('action_type') == 'cancel']
        ok = (len(rows) == 1 and rows[0].get('id') not in {a['id'] for a in ev.actions(ev.snap0)}
              and r36_time(rows[0].get('created_at')) >= r36_time(ev.b['t0'])
              and isinstance(rows[0].get('old_value'), dict) and isinstance(rows[0].get('new_value'), dict)
              and rows[0]['old_value'].get('status') == 'confirmed'
              and rows[0]['new_value'].get('status') == 'cancelled')
        return V(PASS if ok else RED)
    if gid in ('S28-G1', 'S28-G2'):
        service = r36_service(ev)
        key = f"{ev.bind['cal']}|{service['id']}|{ev.bind['long_date']}"
        free = ev.facts['slots'][key]
        if len(set(free)) < 13 or max(free) == sorted(set(free))[11]:
            raise ValueError('S28 distinguishing long-day fixture invalid')
        said = times_in(ev.reply(2))
        ok = said <= set(free)
        if gid == 'S28-G1':
            ok = ok and bool(said) and max(said) == max(free)
        return V(PASS if ok else RED)
    if gid == 'S29-G2':
        return V(PASS if r36_payment(ev) else RED)
    if gid == 'S25-G2':
        return V(UNMEASURED, 'OPEN: no authorized target/identity contract; not NA')
    if gid == 'S25-G4':
        return V(UNMEASURED, 'OPEN: target unknown; original chronological guess forbidden')
    conditional = ev.b.get('r36_conditional_reviews', {}).get(gid)
    if conditional is not None:
        # Offline semantic adjudication is separate from maker/product outputs and
        # bound by score.py's independent sidecar to exact raw bundle and suite.
        if (not conditional.get('reviewer') or not conditional.get('maker')
                or conditional.get('reviewer') == conditional.get('maker')
                or conditional.get('suite_sha256') != R36_SUITE_SHA
                or not conditional.get('evidence_turns')
                or not all(n in [t['n'] for t in ev.turns] for n in conditional['evidence_turns'])
                or not conditional.get('reason')):
            return V(UNMEASURED, 'invalid independent conditional trigger evidence')
        conditional_ids = {'S04-G4', 'S09-G5', 'S10-G2', 'S10-G3', 'S16-G4',
                           'S20-G2', 'S22-G1', 'S25-G4', 'S26-G3', 'S30-G3'}
        if gid not in conditional_ids:
            return V(UNMEASURED, 'NA adjudication supplied for unconditional gate')
        if conditional.get('triggered') is False:
            return V(NA, conditional['reason'])
        if conditional.get('triggered') is not True:
            return V(UNMEASURED, 'uncertain independent trigger')
    # Original conditional predicates retain their explicit conditions. A NA without
    # independently captured trigger adjudication is kept UNMEASURED, never excluded.
    result = G[gid](mapped)
    if result['verdict'] == NA:
        result = V(UNMEASURED, 'conditional trigger not independently adjudicated')
    return result


def r36_controls(ev, scenario):
    out = []
    def add(gid, fn):
        try:
            result = V(PASS if fn() else RED)
        except (ValueError, TypeError, KeyError, IndexError) as e:
            result = V(UNMEASURED, str(e))
        out.append({'id': gid, **result})
    sid = scenario['id']
    if sid in ('S14', 'S28', 'S29'):
        add(sid + '-PREFIX', lambda: r36_prefix(ev, sid))
    if sid in ('S14', 'S29'):
        add(sid + '-PREVIEW', lambda: r36_preview(ev, sid))
    if sid == 'S25':
        add('S25-STOP', lambda: r36_same_bookings(ev, 2)
            and not ev.context(ev.snap(2)).get('pending_returning_service_confirm')
            and not ev.context(ev.snap(2)).get('pending_booking')
            and bool(re.search(r'laat.*staan|niet.*annul|niets.*(wijzig|verander)', ev.reply(2), re.I))
            and '?' not in ev.reply(2))
    if sid == 'S14':
        add('B14-1', lambda: by_id(ev.bookings(ev.snap(4)), prep_booking(ev)).get('cancellation_reason')
            == 'Geannuleerd via WhatsApp')
        add('S14-NO-REFUND-ALL', lambda: all(s14g6(R36Ev(ev.b, {2: t['n']}))['verdict'] == PASS
                                           for t in ev.turns))
    if sid == 'S29':
        def booking():
            rows = ev.bookings(ev.snap(4))
            if len(rows) != 1 or rows[0]['id'] in {b['id'] for b in ev.bookings(ev.snap0)}:
                raise ValueError('T4 booking not uniquely new')
            row = rows[0]; preview = ev.context(ev.snap(3))['pending_booking']
            from zoneinfo import ZoneInfo
            for key in ('calendar_id', 'service_type_id', 'customer_name'):
                if row.get(key) != preview.get(key):
                    raise ValueError('T4 booking differs from authorized preview: ' + key)
            # DB snapshot renders local wall-time; pending preview carries offset.
            expected = r36_time(preview['start_time']).astimezone(ZoneInfo('Europe/Amsterdam')).strftime('%Y-%m-%d %H:%M:%S')
            if row.get('start_time') != expected:
                raise ValueError('T4 booking time differs from preview')
            return row
        add('B29-1', lambda: booking().get('payment_status') == 'pending'
            and booking().get('payment_required') is True and booking().get('payment_timing') == 'pay_now')
        def provider():
            b = booking(); s = ev.pay_sessions(ev.snap(4))[0]
            p = ev.b.get('r36_provider_evidence')
            if not isinstance(p, dict):
                raise ValueError('missing independent TEST provider evidence')
            obj = p.get('object') or {}
            return (r36_payment(ev) and p.get('booking_id') == b['id']
                and p.get('payment_session_id') == s['id'] and p.get('conversation_id') == s['conversation_id']
                and p.get('provider_id') == obj.get('id') == s.get('stripe_session_id') and bool(obj.get('id'))
                and s.get('booking_id') == b['id']
                and obj.get('livemode') is False and obj.get('url') == s['payment_url']
                and r36_time(p.get('observed_at')) >= r36_time(ev.snap(4)['at']))
        add('B29-2', provider)
        def occupied():
            b = booking(); s = r36_service(ev); proof = ev.b.get('r36_postcommit_slots')
            if not isinstance(proof, dict):
                raise ValueError('missing fresh post-T4 slots')
            return (proof.get('calendar_id') == b['calendar_id']
                and proof.get('service_type_id') == b['service_type_id'] == s['id']
                and proof.get('date') == ev.bind['date'] and proof.get('timezone') == 'Europe/Amsterdam'
                and proof.get('source') == 'get_available_slots_fresh_after_T4'
                and proof.get('booking_id') == b['id'] and isinstance(proof.get('free_starts'), list)
                and r36_time(proof.get('observed_at')) >= r36_time(ev.snap(4)['at'])
                and ev.bind['time'] not in proof['free_starts'])
        add('B29-3', occupied)
        add('S29-NO-PAID-ALL', lambda: all(s29g4(R36Ev(ev.b, {2: t['n']}))['verdict'] == PASS
                                         for t in ev.turns))
    existing = {x['id'] for x in out}
    for control in scenario.get('bouw_controles', []):
        if control['id'] not in existing:
            review = ev.b.get('r36_build_reviews', {}).get(control['id'], {})
            valid = (review.get('reviewer') and review.get('maker') and review.get('reviewer') != review.get('maker')
                     and review.get('assertie') == control['assertie']
                     and review.get('evidence_path') and review.get('evidence_sha256')
                     and review.get('verdict') in (PASS, RED))
            try:
                valid = valid and r36_digest(review['evidence_path']) == review['evidence_sha256']
            except (OSError, KeyError):
                valid = False
            out.append({'id': control['id'], **(V(review['verdict'], review.get('note', 'independent build evidence'))
                if valid else V(UNMEASURED, 'separate bound build-control evidence required'))})
    return out


def r36_score_bundle(bundle, scenario, expected_binding):
    def unmeasured(reason):
        return {'scenario': scenario['id'], 'gates': [{**g, **V(UNMEASURED, reason)}
                for g in scenario['harde_poorten']],
                'controls': [{'id': scenario['id'] + '-EVIDENCE', **V(UNMEASURED, reason)}]}
    try:
        if not bundle or bundle.get('r36_binding') != expected_binding:
            return unmeasured('missing bundle or suite/adapter/build/fixture identity mismatch')
        if bundle.get('scenario') != scenario['id']:
            return unmeasured('wrong scenario')
        r36_snapshot_valid(bundle.get('snap0'))
        actual = bundle.get('turns', [])
        expected = scenario['beurten']
        if [(t.get('n'), t.get('inbound')) for t in actual] != [(t['n'], t['inbound']) for t in expected]:
            return unmeasured('missing/changed planned stage; raw partial evidence retained')
        for t in actual:
            r36_snapshot_valid(t.get('snap'))
            if t.get('measurement_error') or t.get('build_identity_check') != 'matched':
                return unmeasured('invalid measurement/build identity')
            st = t.get('staging') or {}
            if (t.get('http') != 200 or st.get('staging_build_id') != expected_binding['build_id']
                    or st.get('record_only') is not True or st.get('staging_build') is not True
                    or st.get('slug') != 'whatsapp-agent-staging'
                    or st.get('run_marker') != 'BA-LR-2026-09'
                    or st.get('meta_send_attempts_this_request') != 0
                    or st.get('meta_send_allowed_total') != 0):
                return unmeasured('returned build or record-only transport not proven')
        ev = R36Ev(bundle)
        out = []
        for g in scenario['harde_poorten']:
            try:
                result = r36_gate(ev, g['id'])
                if result['verdict'] == NOT_IMPL:
                    result = V(UNMEASURED, result.get('note', 'not implemented'))
            except Exception as e:
                result = V(UNMEASURED, f'{type(e).__name__}: {e}')
            out.append({**g, **result})
        return {'scenario': scenario['id'], 'gates': out, 'controls': r36_controls(ev, scenario)}
    except Exception as e:
        return unmeasured(f'{type(e).__name__}: {e}')


def r36_aggregate(results):
    allg = [g for r in results for g in r['gates']]
    main = [g for g in allg if g['richting'] == 'two_way']
    valid_na = [g for g in main if g['verdict'] == NA and g['voorwaardelijk']]
    presence = [g for g in allg if g.get('aanwezigheid')]
    controls = [c for r in results for c in r['controls']]
    return {'status': 'HOLD_S25_CONTRACT_OPEN', 'launch_ready': False,
            'inventory': len(allg), 'expected_inventory': 114,
            'hard': {'numerator': sum(g['verdict'] == PASS for g in main),
                     'denominator': 102 - len(valid_na),
                     'na': [{'id': g['id'], 'evidence': g.get('note')} for g in valid_na],
                     'unmeasured': [g['id'] for g in main if g['verdict'] == UNMEASURED]},
            'presence': {'numerator': sum(g['verdict'] == PASS for g in presence), 'denominator': 43},
            'red_only': [g for g in allg if g['richting'] == 'red_only'],
            'controls': controls, 'per_scenario': results,
            'open': ['S25 target/identity contract', 'V14 human product choice',
                     'independent execution readiness and complete actual run evidence']}
