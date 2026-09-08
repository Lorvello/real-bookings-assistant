#!/usr/bin/env python3
"""
LAUNCH-RUN 2026-09 / R5-A. DE SCOREKAART PER KANDIDAAT.

Leest de bewijsbundels van EEN kandidaat, haalt ze door de scorer en telt de harde poorten met
de noemer-regels van de suite:

  TELLER  = PASS
  NOEMER  = PASS + RED, en ALLEEN over TWEE-RICHTINGSPOORTEN
  BUITEN  = NA (voorwaarde niet vervuld), NOT_IMPL (niet mechaniseerbaar), en de EENRICHTINGS-
            poorten. Die laatste worden APART gerapporteerd, want daar telt alleen rood als
            bewijs: R66 heeft twee keer gemeten dat een gesloten woordenlijst parafrases mist.

De twee poorten die in de RED-PROOF PREFLIGHT door GEEN ENKELE klasse rood konden worden
(S09-G5, S18-G2) tellen NIET mee: een poort die niet rood kan is een kwitantie.

  python3 score.py C1 C2 C3 C4
"""
from __future__ import annotations

import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import gates  # pure adapter; no harness import in v3 offline scoring
R36 = gates.r36_bootstrap(execution=False)
if R36 is None:
    import core  # noqa: E402; unchanged historical path
else:
    core = None

KWITANTIES = ["S09-G5", "S18-G2"]  # uit R05/red_proof_preflight.json


def pctl(xs: list[float], q: float) -> float | None:
    if not xs:
        return None
    ys = sorted(xs)
    if len(ys) == 1:
        return ys[0]
    i = q * (len(ys) - 1)
    lo, hi = int(i), min(int(i) + 1, len(ys) - 1)
    return round(ys[lo] + (ys[hi] - ys[lo]) * (i - lo), 1)


def score_candidate(tag: str) -> dict:
    if R36 is not None:
        return score_r36_candidate(tag)
    suite = core.load_suite()
    byid = {s["id"]: s for s in suite["scenarios"]}
    d = os.path.join(core.R05, "runs", tag)
    meta_path = os.path.join(d, "_meta.json")
    meta = json.load(open(meta_path, encoding="utf-8")) if os.path.exists(meta_path) else {}

    per_scenario, alle = [], []
    identity_status = set()
    for sid in sorted(byid):
        p = os.path.join(d, f"{sid}.json")
        if not os.path.exists(p):
            continue
        with open(p, encoding="utf-8") as fh:
            bundle = json.load(fh)
        for turn in bundle.get("turns", []):
            if turn.get("measurement_error"):
                raise SystemExit(f"MEETFOUT {tag}/{sid}: {turn['measurement_error']}")
            identity_status.add(turn.get("build_identity_check", "legacy_unbound"))
        res = gates.score_bundle(bundle, byid[sid])
        for g in res["gates"]:
            g["scenario"] = sid
        per_scenario.append(res)
        alle.extend(res["gates"])

    telbaar = [g for g in alle if g["id"] not in KWITANTIES and g["richting"] == "two_way"
               and g["verdict"] in (gates.PASS, gates.RED)]
    # DE AANWEZIGHEIDSPOORTEN: precies de 43 poorten die in de RED-PROOF PREFLIGHT rood
    # werden onder F11 SILENT-AGENT. Dit is de enige deelverzameling die MEET OF DE AGENT
    # IETS GEDAAN HEEFT. Zonder deze splitsing scoort een model dat niets doet hoog, want de
    # meerderheid van de suite bestaat uit "er mag niets gebeuren"-poorten.
    aanw = [g for g in alle if g.get("f11_kaart") == "ROOD" and g["id"] not in KWITANTIES
            and g["verdict"] in (gates.PASS, gates.RED)]
    aanw_pass = sum(1 for g in aanw if g["verdict"] == gates.PASS)
    teller = sum(1 for g in telbaar if g["verdict"] == gates.PASS)
    noemer = len(telbaar)
    eenricht = [g for g in alle if g["richting"] == "red_only"]
    eenricht_rood = [g for g in eenricht if g["verdict"] == gates.RED]

    # per beurttype: p50/p95 uit de functieduur EN uit de client-wandklok
    typen: dict = {}
    tokens_per_scenario: dict = {}
    n429 = 0
    for res, sid in zip(per_scenario, [r["scenario"] for r in per_scenario]):
        with open(os.path.join(d, f"{sid}.json"), encoding="utf-8") as fh:
            b = json.load(fh)
        t = byid[sid]["type"]
        tok = 0
        for turn in b["turns"]:
            typen.setdefault(t, {"fn": [], "client": []})
            if turn.get("fn_duration_ms"):
                typen[t]["fn"].append(turn["fn_duration_ms"])
            if turn.get("client_wall_ms"):
                typen[t]["client"].append(turn["client_wall_ms"])
            tok += (turn.get("usage") or {}).get("total_tokens", 0)
            n429 += turn.get("n429", 0)
        tokens_per_scenario[sid] = {"type": t, "beurten": len(b["turns"]), "tokens": tok}

    lat = {t: {"n": len(v["fn"]), "p50_fn_ms": pctl(v["fn"], 0.5), "p95_fn_ms": pctl(v["fn"], 0.95),
               "p50_client_ms": pctl(v["client"], 0.5), "p95_client_ms": pctl(v["client"], 0.95)}
           for t, v in sorted(typen.items())}
    alle_fn = [x for v in typen.values() for x in v["fn"]]
    alle_cl = [x for v in typen.values() for x in v["client"]]

    boekingen = {k: v for k, v in tokens_per_scenario.items() if v["type"] == "book"}
    tok_boeking = [v["tokens"] for v in boekingen.values() if v["tokens"] > 0]

    return {
        "candidate": tag,
        "meta": meta,
        "harde_poorten": {
            "teller": teller, "noemer": noemer,
            "percentage": round(100.0 * teller / noemer, 1) if noemer else None,
            "rood": [{"id": g["id"], "note": g["note"]} for g in alle
                     if g["verdict"] == gates.RED and g["richting"] == "two_way"
                     and g["id"] not in KWITANTIES],
            "na": len([g for g in alle if g["verdict"] == gates.NA]),
            "niet_mechaniseerbaar": len([g for g in alle if g["verdict"] == gates.NOT_IMPL]),
            "kwitanties_uitgesloten": KWITANTIES,
        },
        "aanwezigheidspoorten": {
            "teller": aanw_pass, "noemer": len(aanw),
            "percentage": round(100.0 * aanw_pass / len(aanw), 1) if aanw else None,
            "wat": "de 43 poorten die onder F11 SILENT-AGENT rood worden: alleen deze meten of "
                   "de agent daadwerkelijk iets heeft gedaan",
            "rood": [{"id": g["id"], "note": g["note"]} for g in aanw if g["verdict"] == gates.RED],
        },
        "eenrichting": {
            "aantal": len(eenricht), "rood": len(eenricht_rood),
            "rood_lijst": [{"id": g["id"], "note": g["note"]} for g in eenricht_rood],
            "regel": "groen telt hier NIET als bewijs, alleen rood",
        },
        "build_identity_status": sorted(identity_status),
        "latency_per_beurttype": lat,
        "latency_totaal": {"n": len(alle_fn), "p50_fn_ms": pctl(alle_fn, 0.5),
                           "p95_fn_ms": pctl(alle_fn, 0.95),
                           "p50_client_ms": pctl(alle_cl, 0.5),
                           "p95_client_ms": pctl(alle_cl, 0.95)},
        "tokens": {
            "per_scenario": tokens_per_scenario,
            "boekingsconversaties": len(tok_boeking),
            "tokens_per_boekingsconversatie_p50": pctl([float(x) for x in tok_boeking], 0.5),
            "tokens_per_boekingsconversatie_gemiddeld":
                round(sum(tok_boeking) / len(tok_boeking)) if tok_boeking else None,
        },
        "n429": n429,
        "per_scenario": per_scenario,
    }


def score_r36_candidate(tag):
    from pathlib import Path
    import re
    if not re.fullmatch(r'[A-Za-z0-9_-]+', tag):
        raise ValueError('Unsafe candidate tag')
    folder = Path(R36['out']) / 'runs' / tag
    results = []
    for scenario in R36['suite']['scenarios']:
        path = folder / (scenario['id'] + '.json')
        bundle = json.loads(path.read_text()) if path.is_file() else None
        # Optional independent evidence is bound to exact original bundle bytes.
        # Never rewrite a raw bundle to insert a provider object or trigger verdict.
        sidecar = folder / (scenario['id'] + '.independent.json')
        if bundle is not None and sidecar.is_file():
            extra = json.loads(sidecar.read_text())
            if (extra.get('bundle_sha256') != gates.r36_digest(path)
                    or extra.get('r36_binding') != R36['binding']
                    or not extra.get('reviewer') or not extra.get('maker')
                    or extra.get('reviewer') == extra.get('maker')):
                bundle['r36_binding'] = None  # visible UNMEASURED, not ignored sidecar
            else:
                for key in ('r36_provider_evidence', 'r36_conditional_reviews', 'r36_build_reviews'):
                    if key in extra:
                        bundle[key] = extra[key]
        results.append(gates.r36_score_bundle(bundle, scenario, R36['binding']))
    result = gates.r36_aggregate(results)
    result['candidate'] = tag
    result['r36_binding'] = R36['binding']
    result['latency_note'] = 'DoD latency requires existing latency_meter paired clock; not inferred here'
    return result


def main() -> int:
    tags = sys.argv[1:]
    if not tags:
        print(__doc__)
        return 1
    for tag in tags:
        r = score_candidate(tag)
        if R36 is not None:
            from pathlib import Path
            path = Path(R36['out']) / f'score_{tag}_R36.json'
            with path.open('x', encoding='utf-8') as fh:
                json.dump(r, fh, indent=2, ensure_ascii=False)
            print(f"{tag}: {r['hard']['numerator']}/{r['hard']['denominator']}; "
                  f"presence {r['presence']['numerator']}/43; {r['status']}; {path}")
            continue
        h = r["harde_poorten"]
        print(f"=== {tag} ({r['meta'].get('model')}) ===")
        print(f"  harde poorten : {h['teller']}/{h['noemer']} = {h['percentage']}%  "
              f"(NA {h['na']}, niet-mechaniseerbaar {h['niet_mechaniseerbaar']})")
        a = r["aanwezigheidspoorten"]
        print(f"  AANWEZIGHEID  : {a['teller']}/{a['noemer']} = {a['percentage']}%  "
              f"(de 43 F11-poorten: heeft de agent IETS gedaan)")
        print(f"  eenrichting   : {r['eenrichting']['rood']} van {r['eenrichting']['aantal']} ROOD")
        lt = r["latency_totaal"]
        print(f"  latency       : functie p50 {lt['p50_fn_ms']} ms / p95 {lt['p95_fn_ms']} ms "
              f"(n={lt['n']}), client p50 {lt['p50_client_ms']} ms")
        print(f"  tokens/boeking: {r['tokens']['tokens_per_boekingsconversatie_gemiddeld']}")
        print(f"  429           : {r['n429']}")
        out = os.path.join(core.R05, f"score_{tag}.json")
        with open(out, "w", encoding="utf-8") as fh:
            json.dump(r, fh, indent=1, ensure_ascii=False)
        print(f"  geschreven    : {out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
