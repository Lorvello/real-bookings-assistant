#!/usr/bin/env python3
"""
LAUNCH-RUN 2026-09 / R5-A. DE BAKE-OFF-RUNNER.

Draait de 30 scenario's van BA-SUITE-30-2026-09-v2 voor EEN kandidaat, langs het veilige
testpad (`whatsapp-agent-staging`, record-only, code-afgedwongen), en legt per scenario een
volledige bewijsbundel weg: elke beurt met zijn reply, zijn toolCalls, zijn fasetabel, zijn
ECHTE tokenverbruik uit het `usage`-veld van de leverancier, plus een DB-momentopname NA elke
beurt en een momentopname VOOR het scenario.

DE TOKENREM, en waarom er gepaced wordt.
----------------------------------------
R4-A heeft GEMETEN dat Groq 250.000 tokens per MINUUT geeft en dat een ongepacede run 24 van de
50 agent-calls een 429 gaf, met 400+800+1200 ms wachten en daarna een noodantwoord. Wat je dan
meet is de rem, niet het model. Dezelfde pacing wordt hier gebruikt, met EEN verschil: de peiling
gaat per MODEL, want de emmer van Groq is per model. Het aantal 429's wordt per kandidaat
geteld en gerapporteerd; is dat niet nul, dan is die meting verdacht.

ISOLATIE PER SCENARIO.
Vijf scenario's boeken allemaal donderdag 14:00. Zou de boeking van S05 blijven staan, dan meten
S06, S08, S23, S24 en S26 daarna een bezet slot dat de meting zelf heeft gemaakt. Elk scenario
wordt daarom VOOR en NA opgeruimd (alleen op zijn eigen 316000003NN-nummer).

  python3 runner.py --candidate C1 --provider groq --model openai/gpt-oss-20b
  python3 runner.py --candidate C1 --scenarios S01,S05 --token-floor 150000
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import time
import urllib.error
import urllib.request

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import gates  # pure, before core/harness or any output writes
R36 = gates.r36_bootstrap(execution=True)
import core  # noqa: E402

GROQ_KEY_PATH = os.path.expanduser("~/.config/ba/groq.key")
GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"
_pace = {"probes": 0, "waits": 0, "wait_s": 0.0}


def groq_tokens_left(model: str) -> tuple[int, float]:
    """(resterende tokens, seconden tot bijvulling) voor DIT model. (-1, 0) als het niet lukt.
    Per model, want Groq's emmer is per model: peilen op 20b terwijl je 120b draait meet de
    verkeerde emmer."""
    try:
        key = open(GROQ_KEY_PATH, encoding="utf-8").read().strip()
        req = urllib.request.Request(
            GROQ_URL,
            data=json.dumps({"model": model, "temperature": 0, "max_completion_tokens": 5,
                             "messages": [{"role": "user", "content": "hi"}]}).encode(),
            headers={"Content-Type": "application/json", "Authorization": f"Bearer {key}",
                     "User-Agent": "Mozilla/5.0"},
        )
        try:
            hdr = dict(urllib.request.urlopen(req, timeout=30).headers)
        except urllib.error.HTTPError as e:
            hdr = dict(e.headers)
        _pace["probes"] += 1
        left = int(float(hdr.get("x-ratelimit-remaining-tokens", "-1")))
        raw = str(hdr.get("x-ratelimit-reset-tokens", "0"))
        secs = float(raw[:-2]) / 1000 if raw.endswith("ms") else float(raw.rstrip("s") or 0)
        return left, secs
    except Exception:
        return -1, 0.0


def pace(model: str, floor: int, max_wait_s: float = 120.0) -> None:
    if floor <= 0:
        return
    t0 = time.time()
    while True:
        left, reset_s = groq_tokens_left(model)
        if left < 0 or left >= floor:
            return
        waited = time.time() - t0
        if waited >= max_wait_s:
            print(f"    pacer: nog {left} tokens (< {floor}) maar {round(waited)}s gewacht, doorgaan")
            return
        nap = max(2.0, min(reset_s if reset_s > 0 else 5.0, max_wait_s - waited, 20.0))
        print(f"    pacer: {left} tokens over (< {floor}), {round(nap, 1)}s wachten")
        time.sleep(nap)
        _pace["waits"] += 1
        _pace["wait_s"] += nap


def count_429(turn: dict) -> int:
    ph = turn.get("phases") or {}
    return sum(1 for c in (ph.get("calls") or [])
               if str(c.get("label", "")).startswith(("llm.", "clf.")) and c.get("status") == 429)


def usage_of(turn: dict) -> dict:
    u = turn.get("llm_usage") or {}
    tot = u.get("totals") or {}
    per = u.get("per_call") or []
    agent = [x for x in per if x.get("label") == "llm.agent"]
    return {
        "prompt_tokens": tot.get("prompt_tokens", 0),
        "completion_tokens": tot.get("completion_tokens", 0),
        "total_tokens": tot.get("total_tokens", 0),
        "calls_with_usage": tot.get("calls_with_usage", 0),
        "llm_calls": u.get("llm_calls_this_request", 0),
        "compleet": u.get("complete", False),
        "agent_prompt_tokens": sum(x.get("prompt_tokens") or 0 for x in agent),
        "agent_completion_tokens": sum(x.get("completion_tokens") or 0 for x in agent),
        "agent_total_tokens": sum(x.get("total_tokens") or 0 for x in agent),
        "agent_calls": len(agent),
    }


def run_candidate(args) -> int:
    expected_build_id, config_error = core.build_identity_expectation()
    if config_error:
        print(f"MEETFOUT: {config_error}; geen database-acties uitgevoerd")
        return 2
    suite = core.load_suite()
    fx = core.load_fixtures()
    binds = core.bindings(fx)
    tag = args.candidate

    wanted = [s for s in suite["scenarios"]
              if not args.scenarios or s["id"] in
              {x.strip().upper() for x in args.scenarios.split(",")}]

    outdir = os.path.join(core.R05, "runs", tag)
    os.makedirs(outdir, exist_ok=True)
    for name in [f"{s['id']}.json" for s in wanted] + ["_meta.json"]:
        if os.path.exists(os.path.join(outdir, name)):
            print(f"MEETFOUT: bestaande bewijsbundel {name}; kies een nieuwe kandidaatmap")
            return 2

    dates = sorted({core.MON, core.TUE, core.WED, core.THU, core.FRI, core.SAT, core.FRI2})
    # R84 (2026-10-24): de Claude-denkstand reist mee in de getekende override. getattr, zodat de
    # R79-entry.py (Namespace zonder effort) ongewijzigd blijft werken.
    effort = getattr(args, "effort", None)
    print(f"=== BAKE-OFF kandidaat {tag}  provider={args.provider} model={args.model} effort={effort} ===")
    print("feiten ophalen uit de database...")
    facts = core.facts_cached({"cal": fx["calA"], "cal_iris": fx["calA"], "cal_bram": fx["calB"]},
                              fx, dates, os.path.join(core.R05, "facts_cache.json"))
    facts["busy_start"] = core.ts(core.TUE, "10:00")

    # De schil weigert een TTL langer dan 900 s (overrideAuth.ts MAX_TTL_S). De header wordt
    # daarom PER BEURT vers getekend; een run duurt langer dan een enkele header geldig is.
    def fresh_ov():
        return core.override_header(provider=args.provider, model=args.model, ttl=600, effort=effort) \
            if args.provider else None

    totaal_429 = 0
    bundels = []
    for s in wanted:
        sid = s["id"]
        bind = dict(binds[sid])
        phone = s["telefoon"]
        cal = bind["cal"]

        # VOOR het scenario: alles weg, ook de berichten van een VORIGE kandidaat.
        core.teardown_phone(phone)
        rejected = False
        try:
            prep = core.prep_scenario(sid, bind, fx, phone)
            t0 = core.now_utc()
            cals = sorted({fx["calA"], fx["calB"]})
            snap0 = core.snapshot(phone, cals, t0)

            turns = []
            stage_log = []
            postcommit_slots = None
            for beurt in s["beurten"]:
                if R36 is not None:
                    partial = {"scenario": sid, "bind": bind, "phone": phone, "prep": prep,
                               "facts": facts, "snap0": snap0, "turns": turns, "t0": t0}
                    try:
                        allowed, reason = gates.r36_before_send(partial, s, beurt['n'])
                    except Exception as error:
                        allowed, reason = False, str(error)
                    stage_log.append({'n': beurt['n'], 'inbound': beurt['inbound'],
                                      'sent': False, 'allowed': allowed, 'reason': reason})
                    if not allowed:
                        print(f"  {sid}T{beurt['n']} NOT SENT: {reason}")
                        break
                # PACEN OP TWEE EMMERS. GEMETEN: de eerste C4-run (agent op Gemini) kreeg 125
                # keer een 429 terwijl er niets gepaced werd, want de twee veiligheids-
                # classifiers staan HARD op Groq `openai/gpt-oss-20b` en delen die emmer met
                # elke andere run op deze sleutel. Alleen de agent-emmer pacen laat de rem dus
                # gewoon staan; wat je dan meet is Groq's rem op de classifiers.
                if args.token_floor:
                    pace("openai/gpt-oss-20b", args.token_floor)
                    if args.provider == "groq" and args.model and args.model != "openai/gpt-oss-20b":
                        pace(args.model, args.token_floor)
                # HET BEURTTYPE ZIT IN DE MARKER. `latency_meter.py` selecteert op een PREFIX van
                # message_id; zonder het type in die prefix is "p50 per beurttype gemeten met het
                # vastgelegde instrument" onmogelijk en zou er een tweede, eigen query voor nodig
                # zijn. Die staat de run niet toe.
                r = core.run_turn(cal, phone, beurt["inbound"],
                                  f"{tag}-{s['type']}-{sid}T{beurt['n']}", fresh_ov(),
                                  expected_build_id=expected_build_id)
                if R36 is not None:
                    stage_log[-1]['sent'] = True
                r["n"] = beurt["n"]
                r["inbound"] = beurt["inbound"]
                if r.get("measurement_error"):
                    # Preserve the rejected response without another fallible DB
                    # read first. Null is explicitly unmeasured, never an empty DB.
                    r["snap"] = None
                    r["snapshot_status"] = "skipped_measurement_error"
                else:
                    r["snap"] = core.snapshot(phone, cals, t0)
                r["n429"] = count_429(r)
                r["usage"] = usage_of(r)
                totaal_429 += r["n429"]
                turns.append(r)
                print(f"  {sid}T{beurt['n']:<2} http={r.get('http')} "
                      f"fn={r.get('fn_duration_ms')}ms tools={r.get('toolCalls')} "
                      f"tok={r['usage']['total_tokens']} 429={r['n429']} "
                      f"model={r.get('llm_agent_model')}")
                if R36 is not None:
                    st = r.get('staging') or {}
                    if not (r.get('http') == 200 and st.get('record_only') is True
                            and st.get('staging_build') is True
                            and st.get('slug') == 'whatsapp-agent-staging'
                            and st.get('run_marker') == core.RUN_MARKER
                            and st.get('staging_build_id') == R36['binding']['build_id']
                            and st.get('meta_send_attempts_this_request') == 0
                            and st.get('meta_send_allowed_total') == 0):
                        r['measurement_error'] = r.get('measurement_error') or 'R36 strict staging refusal'
                if r.get("measurement_error"):
                    print(f"  MEETFOUT: {r['measurement_error']}. Gestopt.")
                    rejected = True
                    break
                if r.get("meta_allowed") not in (0, None) or r.get("meta_attempts") not in (0, None):
                    print("  ROOD: Meta-poging tijdens de meting. Gestopt.")
                    rejected = True
                    break

            bundel = {"scenario": sid, "candidate": tag, "provider": args.provider,
                      "model": args.model, "effort": effort, "phone": phone, "bind": bind, "prep": prep,
                      "facts": facts, "snap0": snap0, "turns": turns, "t0": t0}
            if R36 is not None:
                bundel['r36_binding'] = R36['binding']
                bundel['r36_planned_turns'] = s['beurten']
                bundel['r36_stage_log'] = stage_log
                if sid == 'S29' and turns and turns[-1]['n'] == 4 and not rejected:
                    try:
                        bundel['r36_postcommit_slots'] = core.r36_fresh_postcommit_slots(bundel)
                    except Exception as error:
                        bundel['r36_postcommit_error'] = str(error)
                # Provider TEST object is supplied as separately observed, hash-bound
                # evidence at score time. It is not fabricated from a URL/toolname.
            bundels.append(bundel)
            with open(os.path.join(outdir, f"{sid}.json"), "x", encoding="utf-8") as fh:
                json.dump(bundel, fh, indent=1, ensure_ascii=False, default=str)
        finally:
            # Keep inbound evidence for the latency meter; always release scenario bookings,
            # also when a turn/build is rejected or evidence persistence raises.
            core.teardown_phone(phone, keep_messages=True)
        if rejected:
            return 2

    meta = {
        "candidate": tag, "provider": args.provider, "model": args.model, "effort": effort,
        "scenarios": [b["scenario"] for b in bundels],
        "beurten": sum(len(b["turns"]) for b in bundels),
        "n429_totaal": totaal_429,
        "pacer": dict(_pace),
        "marker_prefix": f"{core.RUN_MARKER}-{tag}-",
        "modellen_op_de_lijn": sorted({t.get("llm_agent_model") for b in bundels
                                       for t in b["turns"] if t.get("llm_agent_model")}),
    }
    if R36 is not None:
        meta['r36_binding'] = R36['binding']
        meta['r36_s25_contract_open'] = True
    with open(os.path.join(outdir, "_meta.json"), "x", encoding="utf-8") as fh:
        json.dump(meta, fh, indent=2, ensure_ascii=False)
    print(f"\n{tag}: {meta['beurten']} beurten, {totaal_429} keer 429, "
          f"pacer {_pace['waits']} wachtbeurten ({round(_pace['wait_s'])} s)")
    print(f"modellen op de lijn: {meta['modellen_op_de_lijn']}")
    print(f"geschreven: {outdir}")
    return 0


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--candidate", required=True)
    ap.add_argument("--provider", default=None, choices=["groq", "openai", "gemini", "anthropic"])
    ap.add_argument("--model", default=None)
    ap.add_argument("--effort", default=None, choices=["low", "medium", "high", "xhigh", "max"],
                    help="R84: Claude-denkstand, alleen met --provider anthropic")
    ap.add_argument("--scenarios", default=None)
    ap.add_argument("--token-floor", type=int, default=150000)
    return run_candidate(ap.parse_args())


if __name__ == "__main__":
    raise SystemExit(main())
