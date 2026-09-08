#!/usr/bin/env python3
"""
LAUNCH-RUN 2026-09 / R-STAGING. DE GENERATOR van whatsapp-agent-staging/index.ts.

WAAROM EEN GENERATOR EN GEEN HANDGESCHREVEN KOPIE
--------------------------------------------------
De eis is "alle overige logica gelijk, zodat wat je meet ook echt de agent is". Een met de hand
overgeschreven index.ts kan dat nooit bewijzen. Deze generator leest
`whatsapp-agent/index.ts` (4000+ regels, ONGEWIJZIGD) en past er een KLEINE, VOLLEDIG OPGESOMDE
lijst herschrijvingen op toe. Het rapport onderaan telt per regel hoeveel er is veranderd, en
weigert te schrijven als een verwachte herschrijving niet exact 1 keer voorkwam.

DE HERSCHRIJVINGEN (en waarom elk er is)
----------------------------------------
R1  esm.sh  ->  npm:      De enige RUNTIME esm.sh-import in index.ts is
                          @supabase/supabase-js@2.50.0. R2 heeft GEMETEN dat esm.sh die versie
                          vandaag DOOD levert op de edge (00a: "Cannot destructure property
                          'URL'"), dus een verse deploy zou niet booten. npm: met dezelfde
                          exacte versie boot wel (00b/00c). Geen gedragswijziging: zelfde
                          pakket, zelfde versie, andere resolver.
R2  whatsappSend -> recorderSend
                          HET RECORD-ONLY SLOT. Hierna bestaat er in de module-graaf van deze
                          functie geen enkele weg meer naar graph.facebook.com.
R3  llm.ts -> overrideLlm.ts
                          De provider/model-override. overrideLlm roept de ONGEWIJZIGDE
                          llm.ts-runAgent aan; alleen de omgeving eromheen kan verschillen.
R4  ./X.ts -> ../whatsapp-agent/X.ts
                          Alle overige agent-modules worden HERGEBRUIKT, niet gekopieerd. Een
                          kopie zou stil kunnen verouderen; nu is er per module EEN waarheid.
R5  Deno.serve(...) -> stagingServe(...)
                          De schil (override-verificatie, diagnose, staging-blok in het antwoord).
R6  kopregel + imports    netGuard wordt als ALLEREERSTE geimporteerd, zodat de wachter op
                          globalThis.fetch staat voordat er iets anders laadt.

Draaien:  python3 build_staging.py [--check]
  --check schrijft niets en meldt alleen of het bestand op schijf gelijk is aan wat de
  generator nu zou maken (poort tegen handmatig sleutelen aan de gegenereerde index.ts).
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.normpath(os.path.join(HERE, "..", "whatsapp-agent", "index.ts"))
DST = os.path.join(HERE, "index.ts")

BANNER = '''// ============================================================================================
// GEGENEREERD BESTAND. NIET MET DE HAND BEWERKEN.
// Bron : supabase/functions/whatsapp-agent/index.ts   (ONGEWIJZIGD, sha256 {src_sha})
// Maker: supabase/functions/whatsapp-agent-staging/build_staging.py
// Run  : python3 build_staging.py        (controle: python3 build_staging.py --check)
//
// Dit is `whatsapp-agent` met exact {n_rewrites} herschreven regels. Alles daarbuiten is
// byte-identiek aan de productiefunctie, zodat een meting op deze functie een meting op de
// echte agent is.
//
// RECORD-ONLY, CODE-AFGEDWONGEN, twee sloten:
//   1. de import van ../_shared/whatsappSend.ts is vervangen door ./recorderSend.ts, dus de
//      Graph-code zit NIET in deze bundel;
//   2. ./netGuard.ts vervangt globalThis.fetch en WEIGERT (met een worp) elke call naar een
//      Meta-host, en telt hem. De RODE proef (`op: net-probe`) laat dat in de gedeployde
//      functie zelf zien.
// ============================================================================================
import "./netGuard.ts"; // MOET als eerste staan: installeert de wachter op globalThis.fetch.
import { stagingServe } from "./stagingServe.ts";

'''


class Rewrite:
    def __init__(self, key, pattern, repl, expect, why, is_regex=False, allow_zero_because=None):
        self.key, self.pattern, self.repl, self.expect, self.why, self.is_regex = (
            key, pattern, repl, expect, why, is_regex,
        )
        # LAUNCH-RUN 2026-09 / R4. Een herschrijving die op de EEN branch nodig is en op de
        # ANDERE al gebeurd is, mag 0 treffers hebben MITS de reden hier staat EN de
        # eindtoestand hieronder alsnog wordt gecontroleerd. Zonder die controle zou dit een
        # stille versoepeling van de poort zijn (memory: a_gate_that_cannot_go_red_is_a_receipt).
        self.allow_zero_because = allow_zero_because


REWRITES = [
    Rewrite(
        "R1_esm_naar_npm",
        '"https://esm.sh/@supabase/supabase-js@2.50.0"',
        '"npm:@supabase/supabase-js@2.50.0"',
        1,
        "esm.sh levert deze versie dood op de edge (R2 00a); npm: met dezelfde versie boot wel",
        allow_zero_because=(
            "op branch launch/2026-09 heeft R2 (commit 62da314c) elke edge-import AL gepind, dus "
            "esm.sh staat er niet meer in. De EINDTOESTAND wordt hieronder alsnog hard "
            "gecontroleerd: 'esm.sh' mag niet in het omgezette lichaam voorkomen."
        ),
    ),
    Rewrite(
        "R2_record_only",
        'from "../_shared/whatsappSend.ts"',
        'from "./recorderSend.ts"',
        1,
        "RECORD-ONLY: de weg naar graph.facebook.com verdwijnt uit de module-graaf",
    ),
    Rewrite(
        "R3_llm_override",
        'from "./llm.ts"',
        'from "./overrideLlm.ts"',
        1,
        "provider/model-override om de ongewijzigde llm.ts heen",
    ),
    Rewrite(
        "R5_serve_schil",
        "Deno.serve(async (req) => {",
        "stagingServe(async (req: Request) => {",
        1,
        "schil voor override-verificatie, diagnose en het staging-blok in het antwoord",
    ),
]

# R4 gaat over ALLE overige './x.ts'-imports en wordt apart geteld.
R4_RE = re.compile(r'from "\./([A-Za-z0-9_.-]+\.ts)"')

STAMP_RE = re.compile(r'(export const STAGING_BUILD_ID: string \| null = )[^;]+;')


def build_identity(out: str) -> tuple[str, str]:
    """Conservative local source identity, not live attestation or a dependency lock.

    Covers the prospective generated index and all non-test TS in agent/staging/_shared,
    including indirectly imported modules. Unused source changes may also change the ID.
    Only the generated stamp's value is normalized to break the self-hash cycle.
    Remote package bytes, runtime config and DB state are outside this local source stamp.
    """
    root = Path(HERE).parent
    hashes = {}
    flag_path = Path(HERE) / "stagingFlag.ts"
    flag = flag_path.read_text(encoding="utf-8")
    normalized, count = STAMP_RE.subn(r'\g<1>null;', flag)
    if count != 1:
        raise SystemExit("POORT ROOD: verwacht exact een STAGING_BUILD_ID declaratie")
    for directory in ("whatsapp-agent", Path(HERE).name, "_shared"):
        for path in sorted((root / directory).rglob("*.ts")):
            if path.name.endswith((".test.ts", ".spec.ts")):
                continue
            data = (out.encode("utf-8") if path == Path(DST) else
                    normalized.encode("utf-8") if path == flag_path else path.read_bytes())
            hashes[path.relative_to(root).as_posix()] = hashlib.sha256(data).hexdigest()
    # The output might not exist yet on the first build.
    hashes[Path(DST).relative_to(root).as_posix()] = hashlib.sha256(out.encode("utf-8")).hexdigest()
    hashes["build_staging.py"] = hashlib.sha256(Path(__file__).read_bytes()).hexdigest()
    build_id = "sha256:" + hashlib.sha256(
        json.dumps(hashes, sort_keys=True, separators=(",", ":")).encode("utf-8")
    ).hexdigest()
    return build_id, STAMP_RE.sub(lambda m: m[1] + json.dumps(build_id) + ";", flag)


def build() -> tuple[str, list[str]]:
    with open(SRC, "r", encoding="utf-8") as fh:
        src = fh.read()
    src_sha = hashlib.sha256(src.encode("utf-8")).hexdigest()

    out = src
    log: list[str] = [f"BRON  : {SRC}", f"sha256: {src_sha}", f"regels: {src.count(chr(10)) + 1}", ""]
    total = 0

    for rw in REWRITES:
        n = out.count(rw.pattern)
        if n != rw.expect and not (n == 0 and rw.allow_zero_because):
            raise SystemExit(
                f"POORT ROOD: herschrijving {rw.key} verwachtte {rw.expect} treffer(s), "
                f"vond er {n}. De bron is veranderd; pas de generator aan voordat je deployt."
            )
        out = out.replace(rw.pattern, rw.repl)
        total += n
        if n == 0:
            log.append(f"  {rw.key:<22} 0x   NIET NODIG: {rw.allow_zero_because}")
        else:
            log.append(f"  {rw.key:<22} {n}x   {rw.why}")

    # R4 na de andere: llm.ts is dan al weg, whatsappSend zat op ../_shared.
    # Modules die in DEZE map staan (recorderSend, overrideLlm, ...) blijven lokaal: die zijn
    # juist de staging-vervangers en mogen nooit naar ../whatsapp-agent wijzen.
    lokaal = {f for f in os.listdir(HERE) if f.endswith(".ts")}
    modules = sorted(m for m in set(R4_RE.findall(out)) if m not in lokaal)
    log.append(f"  R4_lokaal_gelaten      {len(lokaal)}   staging-eigen modules: {', '.join(sorted(lokaal))}")
    n4 = 0
    for m in modules:
        c = out.count(f'from "./{m}"')
        out = out.replace(f'from "./{m}"', f'from "../whatsapp-agent/{m}"')
        n4 += c
    total += n4
    log.append(f"  R4_hergebruik_modules  {n4}x   {len(modules)} agent-modules worden HERGEBRUIKT, niet gekopieerd")
    log.append("        " + ", ".join(modules))

    # Harde controle op het OMGEZETTE LICHAAM (de kopregels hieronder benoemen deze termen
    # bewust in proza, dus die worden apart gehouden om geen valse treffer te maken).
    for verboden in ("_shared/whatsappSend", "graph.facebook.com", "esm.sh"):
        if verboden in out:
            raise SystemExit(f"POORT ROOD: '{verboden}' staat nog in de omgezette index.ts")
    log.append("CONTROLE lichaam: geen _shared/whatsappSend, geen graph.facebook.com, geen esm.sh. OK")

    header = BANNER.replace("{src_sha}", src_sha).replace("{n_rewrites}", str(total))
    out = header + out
    log += ["", f"TOTAAL herschreven regels: {total}", f"kopregels toegevoegd     : {BANNER.count(chr(10))}"]
    return out, log


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--check", action="store_true", help="niets schrijven, alleen vergelijken")
    args = ap.parse_args()

    out, log = build()
    build_id, stamped_flag = build_identity(out)
    print("\n".join(log))
    print(f"staging_build_id: {build_id}")
    new_sha = hashlib.sha256(out.encode("utf-8")).hexdigest()
    print(f"resultaat sha256: {new_sha}")

    if args.check:
        if not os.path.exists(DST):
            print("CHECK ROOD: index.ts bestaat niet")
            return 1
        with open(DST, "r", encoding="utf-8") as fh:
            cur = fh.read()
        cur_sha = hashlib.sha256(cur.encode("utf-8")).hexdigest()
        print(f"op schijf sha256: {cur_sha}")
        if cur_sha != new_sha:
            print("CHECK ROOD: de index.ts op schijf is NIET wat de generator maakt (handmatig bewerkt?)")
            return 1
        if Path(HERE, "stagingFlag.ts").read_text(encoding="utf-8") != stamped_flag:
            print("CHECK ROOD: staging_build_id ontbreekt of hoort bij andere lokale bronnen")
            return 1
        print("CHECK GROEN: de gegenereerde index.ts op schijf klopt exact.")
        return 0

    with open(DST, "w", encoding="utf-8") as fh:
        fh.write(out)
    Path(HERE, "stagingFlag.ts").write_text(stamped_flag, encoding="utf-8")
    print(f"geschreven: {DST}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
