#!/usr/bin/env python3
"""
LAUNCH-RUN 2026-09 / R5-A. DE LATENCY-TABEL PER BEURTTYPE.

Leest de uitslagen die `_automation/latency_meter.py` per kandidaat en per BEURTTYPE heeft
weggeschreven en zet ze in een tabel. Er wordt hier GEEN query geschreven en GEEN percentiel
herrekend: dit bestand plakt alleen wat het vastgelegde instrument al heeft gemeten, inclusief
zijn noemer en zijn status. Een type met minder paren dan het minimum blijft MEETFOUT en wordt
als zodanig getoond, nooit als een getal.

  python3 latency_agg.py C1 C2 C3 C4
"""
from __future__ import annotations

import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import core  # noqa: E402

TYPES = ["info", "policy", "book", "reschedule", "cancel", "multi_calendar", "multi_service",
         "ambiguity", "name_takeover", "fabricated_slot", "payment_link"]


def lees(path: str) -> dict | None:
    if not os.path.exists(path):
        return None
    with open(path, encoding="utf-8") as fh:
        return (json.load(fh) or {}).get("result")


def main() -> int:
    tags = sys.argv[1:] or ["C1", "C2", "C3", "C4"]
    uit = {}
    for tag in tags:
        tot = lees(os.path.join(core.R05, f"latency_{tag}_TOTAAL.json"))
        rij = {"totaal": None, "per_type": {}}
        if tot:
            rij["totaal"] = {"n": tot["n_pairs"], "p50_s": tot["dod_p50_s"],
                             "p95_s": tot["dod_p95_s"], "recv_p50_s": tot["recv_p50_s"],
                             "recv_p95_s": tot["recv_p95_s"], "status": tot["status"]}
            rij["p50_s"] = tot["dod_p50_s"]
            rij["p95_s"] = tot["dod_p95_s"]
        for t in TYPES:
            r = lees(os.path.join(core.R05, f"latency_{tag}_{t}.json"))
            if not r:
                rij["per_type"][t] = {"status": "GEEN BESTAND"}
                continue
            rij["per_type"][t] = {"n": r["n_pairs"], "p50_s": r["dod_p50_s"],
                                  "p95_s": r["dod_p95_s"], "status": r["status"]}
        uit[tag] = rij
    with open(os.path.join(core.R05, "latency_per_kandidaat.json"), "w", encoding="utf-8") as fh:
        json.dump(uit, fh, indent=1, ensure_ascii=False)

    kop = "| beurttype | " + " | ".join(f"{t} p50/p95 (n)" for t in tags) + " |"
    print(kop)
    print("|---" * (len(tags) + 1) + "|")
    for t in TYPES:
        cel = []
        for tag in tags:
            r = uit[tag]["per_type"].get(t) or {}
            cel.append(f"{r.get('p50_s')}/{r.get('p95_s')} s (n={r.get('n')})"
                       if r.get("p50_s") is not None else str(r.get("status")))
        print(f"| {t} | " + " | ".join(cel) + " |")
    cel = []
    for tag in tags:
        r = uit[tag]["totaal"] or {}
        cel.append(f"**{r.get('p50_s')}/{r.get('p95_s')} s** (n={r.get('n')}) {r.get('status')}"
                   if r else "GEEN")
    print("| **ALLE** | " + " | ".join(cel) + " |")
    print(f"\ngeschreven: {os.path.join(core.R05, 'latency_per_kandidaat.json')}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
