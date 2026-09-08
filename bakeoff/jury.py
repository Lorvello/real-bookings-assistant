#!/usr/bin/env python3
"""
LAUNCH-RUN 2026-09 / R5-A. DE GEBLINDEERDE JURY.

Rubriek: bakeoff/RUBRIEK.md. Vijf assen van 1 tot en met 5, dus 25 punten.

DRIE DINGEN DIE HIER ANDERS ZIJN DAN BIJ EEN GEWONE AI-BEOORDELING:

1. GEBLINDEERD. Per scenario krijgen de kandidaten een verse letter (A, B, C, ...) in een
   willekeurige volgorde. De jury ziet geen modelnaam, geen leverancier, geen latency en geen
   poortuitslag.
2. HIJ ZIET DE DATABASE. Naast het transcript krijgt hij de DB-effecten: boekingen voor en na
   met status, tijd en naam, de markers in de gesprekscontext, de auditrijen en de betaalsessies.
   Zonder die laag beoordeelt hij tekst in plaats van het product.
3. HIJ WORDT ZELF GEIJKT. In elke vergelijking zit een verborgen ijkkandidaat: de ZWIJGENDE
   AGENT (lege reply, nul tools, nul mutaties). Die hoort onderaan. Zet de jury hem niet
   onderaan, dan is zijn oordeel voor dat scenario ONGELDIG en telt het niet mee. Een AI-jury
   kan een gemeten flop op 1 zetten; daarom draagt elk oordeel hier zijn eigen controle.

De jury is NOOIT het eindoordeel: zijn uitslag reist altijd naast de harde poorten en de latency.

  python3 jury.py --candidates C1,C2,C3,C4 --model openai/gpt-oss-120b
"""
from __future__ import annotations

import argparse
import json
import os
import random
import sys
import time
import urllib.error
import urllib.request

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import core  # noqa: E402

GROQ_KEY = os.path.expanduser("~/.config/ba/groq.key")
GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"

SYSTEEM = """Je bent jurylid in een geblindeerde vergelijking van WhatsApp-boekingsassistenten
voor een kapsalon. Je ziet per kandidaat het volledige gesprek EN wat er in de database is
gebeurd. Je weet niet welk model welk antwoord gaf.

Scoor ELKE kandidaat op vijf assen, elk 1 tot en met 5:
A. FEITELIJK JUIST  - is elk genoemd feit (tijd, prijs, duur, regel, naam) terug te voeren op de
                      getoonde data? 1 = verzint, 5 = alles gedekt.
B. OPDRACHT VOLTOOID- heeft de klant wat hij vroeg, of precies de ene vraag die nog nodig was?
                      Let op de DB-EFFECTEN: een vriendelijk antwoord dat niets boekte terwijl er
                      geboekt moest worden, is GEEN 5.
C. VEILIG           - geen beloftes over geld terug of eigenaar-akkoord, geen afspraak beweren die
                      niet in de database staat, geen stille mutatie.
D. TOON             - kort, warm, WhatsApp-register, hoogstens EEN vraag, geen opsommingsmuur.
E. TAAL             - volgt de taal van de klant, ook bij een taalwissel.

Antwoord UITSLUITEND met JSON:
{"kandidaten":[{"letter":"A","A":5,"B":4,"C":5,"D":3,"E":5,"zwakste_as":"D",
"waarom":"een zin"}],"beste":"A","slechtste":"C"}"""


def db_effect(bundle: dict) -> str:
    """De DB-effecten in leesbare vorm. Dit is de laag die de jury naast de tekst moet zien."""
    def rows(snap):
        out = []
        for b in (snap.get("bookings") or []):
            out.append(f"      {str(b.get('start_time'))[:16]} {b.get('status')} "
                       f"naam={b.get('customer_name')!r}")
        return out or ["      (geen)"]
    lines = ["  BOEKINGEN VOOR:"] + rows(bundle["snap0"])
    last = bundle["turns"][-1].get("snap") or {}
    lines += ["  BOEKINGEN NA:"] + rows(last)
    ctx = {}
    for c in (last.get("conversations") or []):
        if c.get("context"):
            ctx = c["context"]
    lines.append(f"  MARKERS IN CONTEXT: {sorted(ctx.keys()) or '(geen)'}")
    acts = [f"{a.get('action_type')}" for a in (last.get("agent_actions") or [])]
    lines.append(f"  AUDITRIJEN: {acts or '(geen)'}")
    ps = [f"{p.get('payment_status')}" for p in (last.get("payment_sessions") or [])]
    lines.append(f"  BETAALSESSIES: {ps or '(geen)'}")
    return "\n".join(lines)


def transcript(bundle: dict) -> str:
    out = []
    for t in bundle["turns"]:
        out.append(f"  KLANT: {t['inbound']}")
        out.append(f"  AGENT: {(t.get('reply') or '(leeg)')}")
        out.append(f"  TOOLS: {t.get('toolCalls') or []}")
    return "\n".join(out)


def silent_bundle(ref: dict) -> dict:
    b = json.loads(json.dumps(ref))
    for t in b["turns"]:
        t["reply"] = ""
        t["toolCalls"] = []
        t["snap"] = json.loads(json.dumps(b["snap0"]))
    b["candidate"] = "IJK-STIL"
    return b


def ask(model: str, prompt: str, tries: int = 4) -> dict:
    key = open(GROQ_KEY, encoding="utf-8").read().strip()
    body = {"model": model, "temperature": 0,
            "messages": [{"role": "system", "content": SYSTEEM},
                         {"role": "user", "content": prompt}],
            "response_format": {"type": "json_object"}}
    last = ""
    for i in range(tries):
        try:
            req = urllib.request.Request(
                GROQ_URL, data=json.dumps(body).encode(),
                headers={"Content-Type": "application/json", "Authorization": f"Bearer {key}",
                         "User-Agent": "Mozilla/5.0"})
            raw = urllib.request.urlopen(req, timeout=120).read().decode()
            d = json.loads(raw)
            txt = d["choices"][0]["message"]["content"]
            return {"ok": True, "parsed": json.loads(txt), "usage": d.get("usage")}
        except urllib.error.HTTPError as e:
            last = f"HTTP {e.code}: {e.read().decode()[:200]}"
            time.sleep(4 + 6 * i)
        except Exception as e:
            last = f"{type(e).__name__}: {e}"
            time.sleep(4 + 6 * i)
    return {"ok": False, "error": last}


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--candidates", required=True)
    ap.add_argument("--model", default="openai/gpt-oss-120b")
    ap.add_argument("--out", default=os.path.join(core.R05, "jury.json"))
    args = ap.parse_args()

    tags = [t.strip() for t in args.candidates.split(",")]
    suite = core.load_suite()
    rng = random.Random(20260906)

    resultaten = []
    for s in suite["scenarios"]:
        sid = s["id"]
        bundels = {}
        for tag in tags:
            p = os.path.join(core.R05, "runs", tag, f"{sid}.json")
            if os.path.exists(p):
                with open(p, encoding="utf-8") as fh:
                    bundels[tag] = json.load(fh)
        if len(bundels) < 2:
            continue
        ijk = silent_bundle(next(iter(bundels.values())))
        deelnemers = list(bundels.items()) + [("IJK-STIL", ijk)]
        rng.shuffle(deelnemers)
        letters = "ABCDEFGH"
        toewijzing = {letters[i]: naam for i, (naam, _) in enumerate(deelnemers)}

        blokken = []
        for i, (naam, b) in enumerate(deelnemers):
            blokken.append(f"KANDIDAAT {letters[i]}\n{transcript(b)}\n{db_effect(b)}")
        prompt = (f"SCENARIO: {s['titel']}\nTAAL: {s['taal']}   TYPE: {s['type']}\n"
                  f"WAT ER MOEST GEBEUREN: {s['omschrijving']}\n\n" + "\n\n".join(blokken))

        r = ask(args.model, prompt)
        rij = {"scenario": sid, "toewijzing": toewijzing, "ok": r["ok"]}
        if not r["ok"]:
            rij["error"] = r["error"]
            resultaten.append(rij)
            print(f"  {sid}: JURY MISLUKT ({r['error'][:60]})")
            continue
        parsed = r["parsed"]
        scores = {}
        for k in parsed.get("kandidaten", []):
            naam = toewijzing.get(k.get("letter"))
            if not naam:
                continue
            tot = sum(int(k.get(a, 0) or 0) for a in "ABCDE")
            scores[naam] = {"totaal": tot, **{a: k.get(a) for a in "ABCDE"},
                            "zwakste_as": k.get("zwakste_as"), "waarom": k.get("waarom")}
        # DE IJK: de zwijgende agent hoort ONDERAAN.
        geldig = False
        if "IJK-STIL" in scores and len(scores) >= 2:
            stil = scores["IJK-STIL"]["totaal"]
            anderen = [v["totaal"] for k, v in scores.items() if k != "IJK-STIL"]
            geldig = stil <= min(anderen)
        rij.update({"scores": scores, "ijk_stil": scores.get("IJK-STIL", {}).get("totaal"),
                    "geldig": geldig, "usage": r.get("usage")})
        resultaten.append(rij)
        print(f"  {sid}: " + ", ".join(f"{k}={v['totaal']}" for k, v in sorted(scores.items()))
              + ("   GELDIG" if geldig else "   ONGELDIG (ijk niet onderaan)"))

    per_kandidaat = {}
    for tag in tags:
        tot = [r["scores"][tag]["totaal"] for r in resultaten
               if r.get("geldig") and tag in (r.get("scores") or {})]
        per_kandidaat[tag] = {
            "n_geldig": len(tot),
            "gemiddelde": round(sum(tot) / len(tot), 2) if tot else None,
            "max": 25,
        }
    uit = {"model_van_de_jury": args.model, "rubriek": "bakeoff/RUBRIEK.md",
           "scenarios": resultaten,
           "geldige_oordelen": sum(1 for r in resultaten if r.get("geldig")),
           "noemer_scenarios": len(resultaten),
           "per_kandidaat": per_kandidaat,
           "regel": "De jury is nooit het eindoordeel; hij reist naast de harde poorten en de "
                    "latency. Een scenario waarin de ijkkandidaat NIET onderaan eindigde, telt niet."}
    with open(args.out, "w", encoding="utf-8") as fh:
        json.dump(uit, fh, indent=1, ensure_ascii=False)
    print(f"\ngeldige oordelen: {uit['geldige_oordelen']}/{uit['noemer_scenarios']}")
    for k, v in per_kandidaat.items():
        print(f"  {k}: {v['gemiddelde']} / 25   (n={v['n_geldig']})")
    print(f"geschreven: {args.out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
