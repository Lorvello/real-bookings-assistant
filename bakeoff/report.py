#!/usr/bin/env python3
"""
LAUNCH-RUN 2026-09 / R5-A. DE OPLEVERING.

Schrijft BAKEOFF_RESULTS.md (een vergelijkingstabel) en de HTML-keurpagina voor Mathew
(human gate H4): 20 transcripten van de twee beste kandidaten, per transcript goedkeuren of
afkeuren, en bij afkeuren een zin waarom.

DE PRIJZEN. De tokens zijn GEMETEN (uit het `usage`-veld van de leverancier zelf, per call).
De PRIJS per token is dat niet: die komt van de prijslijst van de leverancier, met bron en
datum erbij. Waar geen prijs te verifieren was, staat er geen bedrag, alleen het tokenaantal.
"""
from __future__ import annotations

import argparse
import html
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import core  # noqa: E402

# Bron: console.groq.com/docs/models, opgehaald 2026-09-06. USD per 1 miljoen tokens.
PRIJS = {
    "openai/gpt-oss-20b": {"in": 0.075, "out": 0.30, "bron": "console.groq.com/docs/models 2026-09-06"},
    "openai/gpt-oss-120b": {"in": 0.15, "out": 0.60, "bron": "console.groq.com/docs/models 2026-09-06"},
    "qwen/qwen3.8-27b": {"in": 0.80, "out": 4.00, "bron": "console.groq.com/docs/models 2026-09-06"},
    # R84 (2026-10-24): Claude Haiku 5.5, tarief bij een prompt tot 100K tokens. Cache-lezen 0,1x en
    # cache-schrijven (5 minuten) 1,25x van de invoerprijs; netGuard telt beide apart per call.
    "claude-haiku-5-5": {"in": 0.10, "out": 0.50, "cache_read": 0.01, "cache_write": 0.125,
                         "bron": "Anthropic, Haiku 5.5-migratiegids (claude-api skill) 2026-10-24"},
}
CLASSIFIER_MODEL = "openai/gpt-oss-20b"  # staat hard in de code, wisselt niet mee


def load(tag: str) -> dict:
    p = os.path.join(core.R05, f"score_{tag}.json")
    with open(p, encoding="utf-8") as fh:
        return json.load(fh)


def kosten(tag: str, score: dict) -> dict:
    """Kosten per volledige boekingsconversatie, uit de ECHTE usage-velden per call.
    De agent-calls gaan op het kandidaat-model, de classifier-stemmen staan HARD op
    gpt-oss-20b (businessDataGuard.ts / ownerEscalationClassifier.ts) en wisselen dus NIET
    mee. Ze worden apart geprijsd, anders leest de rekening als een eigenschap van het
    kandidaat-model terwijl hij voor een deel van een ander model is."""
    d = os.path.join(core.R05, "runs", tag)
    model = (score.get("meta") or {}).get("model") or ""
    ap = ac = cp = cc = 0
    a_read = a_write = 0  # R84: agent-tokens uit de cache gelezen en naar de cache geschreven
    a_max_prompt = 0  # R84: het grootste agent-prompt; boven 100K geldt het hogere Claude-tarief
    n = 0
    for sid, info in score["tokens"]["per_scenario"].items():
        if info["type"] != "book":
            continue
        with open(os.path.join(d, f"{sid}.json"), encoding="utf-8") as fh:
            b = json.load(fh)
        n += 1
        for t in b["turns"]:
            for c in ((t.get("llm_usage") or {}).get("per_call") or []):
                if c.get("label") == "llm.agent":
                    ap += c.get("prompt_tokens") or 0
                    ac += c.get("completion_tokens") or 0
                    a_read += c.get("cached_tokens") or 0
                    a_write += c.get("cache_write_tokens") or 0
                    a_max_prompt = max(a_max_prompt, c.get("prompt_tokens") or 0)
                else:
                    cp += c.get("prompt_tokens") or 0
                    cc += c.get("completion_tokens") or 0
    if n == 0:
        return {"conversaties": 0}
    out = {
        "conversaties": n,
        "agent_prompt_tokens_per_conversatie": round(ap / n),
        "agent_completion_tokens_per_conversatie": round(ac / n),
        "classifier_tokens_per_conversatie": round((cp + cc) / n),
        "totaal_tokens_per_conversatie": round((ap + ac + cp + cc) / n),
        "model": model,
    }
    p = PRIJS.get(model)
    pc = PRIJS.get(CLASSIFIER_MODEL)
    if p:
        if "cache_read" in p:
            # prompt_tokens is het HELE prompt (netGuard telt cache-lezen en -schrijven erbij op).
            vers = max(ap - a_read - a_write, 0)
            agent_in = vers * p["in"] + a_read * p["cache_read"] + a_write * p["cache_write"]
            out["agent_cache_read_tokens_per_conversatie"] = round(a_read / n)
            out["agent_cache_write_tokens_per_conversatie"] = round(a_write / n)
            if a_max_prompt > 100_000:
                out["prijswaarschuwing"] = (f"agent-prompt van {a_max_prompt} tokens: boven 100K rekent Claude "
                                            "het hogere tarief; deze telling is dan te laag")
        else:
            # Groq en de rest: elk prompt-token tegen het volle tarief (de bestaande, voorzichtige telling).
            agent_in = ap * p["in"]
        agent_usd = (agent_in / n) / 1e6 + (ac / n) * p["out"] / 1e6
        clf_usd = ((cp / n) * pc["in"] / 1e6 + (cc / n) * pc["out"] / 1e6) if pc else None
        out["usd_agent_per_conversatie"] = round(agent_usd, 6)
        out["usd_classifiers_per_conversatie"] = round(clf_usd, 6) if clf_usd is not None else None
        out["usd_totaal_per_conversatie"] = round(agent_usd + (clf_usd or 0), 6)
        out["prijsbron"] = p["bron"]
    else:
        out["usd_totaal_per_conversatie"] = None
        out["prijsbron"] = "GEEN geverifieerde prijs; alleen tokens gemeten"
    return out


def md_table(tags: list[str], scores: dict, jury: dict, kost: dict, lat: dict) -> str:
    kop = ("| kandidaat | model | harde poorten | p50 functie | p95 functie | p50 DoD-klok | "
           "jury /25 | tokens/boeking | USD/boeking | 429 |")
    lijn = "|---|---|---|---|---|---|---|---|---|---|"
    rijen = []
    for t in tags:
        s = scores[t]
        h = s["harde_poorten"]
        lt = s["latency_totaal"]
        j = (jury.get("per_kandidaat") or {}).get(t) or {}
        k = kost.get(t) or {}
        dod = lat.get(t) or {}
        rijen.append(
            f"| {t} | `{(s['meta'] or {}).get('model') or 'via secrets'}` | "
            f"**{h['percentage']}%** ({h['teller']}/{h['noemer']}) | "
            f"{lt['p50_fn_ms']} ms | {lt['p95_fn_ms']} ms | "
            f"{dod.get('p50_s', 'n.v.t.')} s | "
            f"{j.get('gemiddelde', 'n.v.t.')} (n={j.get('n_geldig', 0)}) | "
            f"{k.get('totaal_tokens_per_conversatie', 'n.v.t.')} | "
            f"{k.get('usd_totaal_per_conversatie', 'niet geprijsd')} | {s['n429']} |")
    return "\n".join([kop, lijn] + rijen)


def keurpagina(tags: list[str], out_path: str, n_per_kandidaat: int = 10) -> int:
    """De HTML-keurpagina voor human gate H4. Zonder uitleg te gebruiken: per transcript
    goedkeuren of afkeuren, en bij afkeuren EEN zin waarom. Alles blijft in de browser staan
    (localStorage) en er is EEN knop die het hele oordeel als tekst kopieert."""
    suite = core.load_suite()
    byid = {s["id"]: s for s in suite["scenarios"]}
    items = []
    for tag in tags:
        d = os.path.join(core.R05, "runs", tag)
        gekozen = [s["id"] for s in suite["scenarios"]
                   if os.path.exists(os.path.join(d, f"{s['id']}.json"))][:n_per_kandidaat]
        for sid in gekozen:
            with open(os.path.join(d, f"{sid}.json"), encoding="utf-8") as fh:
                b = json.load(fh)
            beurten = []
            for t in b["turns"]:
                beurten.append({
                    "klant": t["inbound"],
                    "agent": t.get("reply") or "(leeg antwoord)",
                    "tools": t.get("toolCalls") or [],
                    "ms": t.get("fn_duration_ms"),
                })
            last = b["turns"][-1].get("snap") or {}
            db = []
            for r in (last.get("bookings") or []):
                db.append(f"{str(r.get('start_time'))[:16]} - {r.get('status')} - "
                          f"{r.get('customer_name')}")
            items.append({
                "id": f"{tag}-{sid}",
                "kandidaat": tag,
                "scenario": sid,
                "titel": byid[sid]["titel"],
                "taal": byid[sid]["taal"],
                "beurten": beurten,
                "db": db or ["(geen boekingen)"],
            })
    data = json.dumps(items, ensure_ascii=False)
    page = TEMPLATE.replace("__DATA__", data).replace("__N__", str(len(items)))
    with open(out_path, "w", encoding="utf-8") as fh:
        fh.write(page)
    return len(items)


TEMPLATE = """<!doctype html>
<html lang="nl"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Bookings Assistant, keuring van de bake-off</title>
<style>
 :root{--bg:#f6f6f4;--card:#fff;--ink:#1b1b1a;--muted:#6b6b66;--line:#e2e2dd;
       --ja:#137a3f;--nee:#b02a1e;--klant:#eef2f7;--agent:#eaf6ee}
 *{box-sizing:border-box}
 body{margin:0;background:var(--bg);color:var(--ink);
      font:15px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif}
 header{position:sticky;top:0;background:var(--bg);border-bottom:1px solid var(--line);
        padding:14px 18px;z-index:5}
 h1{font-size:17px;margin:0 0 4px}
 .sub{color:var(--muted);font-size:13px}
 main{max-width:820px;margin:0 auto;padding:16px}
 .kaart{background:var(--card);border:1px solid var(--line);border-radius:10px;
        padding:14px 16px;margin:0 0 14px}
 .kop{display:flex;justify-content:space-between;align-items:baseline;gap:10px;margin-bottom:8px}
 .kop b{font-size:15px}
 .tag{font-size:12px;color:var(--muted)}
 .beurt{margin:8px 0}
 .klant,.agent{padding:8px 11px;border-radius:9px;margin:3px 0;white-space:pre-wrap}
 .klant{background:var(--klant)}
 .agent{background:var(--agent)}
 .meta{font-size:12px;color:var(--muted);margin-top:2px}
 .db{font-size:12px;color:var(--muted);border-top:1px dashed var(--line);
     margin-top:10px;padding-top:8px}
 .knoppen{display:flex;gap:8px;margin-top:10px;align-items:center;flex-wrap:wrap}
 button{font:inherit;padding:7px 14px;border-radius:8px;border:1px solid var(--line);
        background:#fff;cursor:pointer}
 button.ja.aan{background:var(--ja);color:#fff;border-color:var(--ja)}
 button.nee.aan{background:var(--nee);color:#fff;border-color:var(--nee)}
 input[type=text]{flex:1;min-width:220px;padding:7px 10px;border:1px solid var(--line);
                  border-radius:8px;font:inherit}
 .verborgen{display:none}
 footer{max-width:820px;margin:0 auto;padding:8px 16px 60px}
 .balk{position:sticky;bottom:0;background:var(--bg);border-top:1px solid var(--line);
       padding:10px 16px;display:flex;gap:10px;align-items:center;justify-content:space-between}
</style></head><body>
<header>
  <h1>Keuring van de bake-off</h1>
  <div class="sub">Per gesprek: goed of niet goed. Bij "niet goed" een zin waarom.
  Onderaan staat een knop die alles kopieert.</div>
</header>
<main id="lijst"></main>
<div class="balk"><span id="stand"></span>
  <button onclick="kopieer()">Kopieer het hele oordeel</button></div>
<footer class="sub">De keuze over het model is van jou; deze pagina verzamelt alleen je oordeel
per gesprek.</footer>
<script>
const ITEMS = __DATA__;
const KEY = "ba-bakeoff-keuring-v1";
let st = {};
try { st = JSON.parse(localStorage.getItem(KEY) || "{}"); } catch (e) { st = {}; }
function bewaar(){ try { localStorage.setItem(KEY, JSON.stringify(st)); } catch(e){} teken_stand(); }
function teken_stand(){
  const n = ITEMS.length;
  const k = Object.values(st).filter(x => x && x.oordeel).length;
  document.getElementById("stand").textContent = k + " van " + n + " beoordeeld";
}
function zet(id, oordeel){
  st[id] = Object.assign({}, st[id], {oordeel: oordeel});
  document.querySelectorAll('[data-id="'+id+'"] button').forEach(b => b.classList.remove("aan"));
  document.querySelector('[data-id="'+id+'"] button.'+oordeel).classList.add("aan");
  const veld = document.querySelector('[data-id="'+id+'"] .waarom');
  veld.classList.toggle("verborgen", oordeel !== "nee");
  bewaar();
}
function reden(id, v){ st[id] = Object.assign({}, st[id], {waarom: v}); bewaar(); }
function kopieer(){
  const regels = ITEMS.map(i => {
    const s = st[i.id] || {};
    return i.id + " (" + i.scenario + ", " + i.titel + "): " +
      (s.oordeel === "ja" ? "GOED" : s.oordeel === "nee" ? "NIET GOED - " + (s.waarom||"") : "nog niet beoordeeld");
  });
  navigator.clipboard.writeText(regels.join("\\n")).then(
    () => alert("Gekopieerd. Plak het in de chat."),
    () => alert("Kopieren lukte niet; selecteer de tekst zelf."));
}
const lijst = document.getElementById("lijst");
ITEMS.forEach(i => {
  const s = st[i.id] || {};
  const d = document.createElement("div");
  d.className = "kaart"; d.setAttribute("data-id", i.id);
  let h = '<div class="kop"><b>' + i.titel + '</b><span class="tag">' + i.scenario +
          ' &middot; ' + i.taal + ' &middot; gesprek ' + i.kandidaat + '</span></div>';
  i.beurten.forEach(b => {
    h += '<div class="beurt"><div class="klant">' + esc(b.klant) + '</div>' +
         '<div class="agent">' + esc(b.agent) + '</div>' +
         '<div class="meta">' + (b.ms ? b.ms + ' ms' : '') +
         (b.tools.length ? ' &middot; ' + b.tools.join(", ") : ' &middot; geen tools') + '</div></div>';
  });
  h += '<div class="db">In de agenda na afloop: ' + i.db.map(esc).join(" | ") + '</div>';
  h += '<div class="knoppen"><button class="ja' + (s.oordeel==="ja"?" aan":"") +
       '" onclick="zet(\\'' + i.id + '\\',\\'ja\\')">Goed</button>' +
       '<button class="nee' + (s.oordeel==="nee"?" aan":"") +
       '" onclick="zet(\\'' + i.id + '\\',\\'nee\\')">Niet goed</button>' +
       '<input type="text" class="waarom' + (s.oordeel==="nee"?"":" verborgen") +
       '" placeholder="Waarom niet goed? Een zin." value="' + esc(s.waarom||"") +
       '" oninput="reden(\\'' + i.id + '\\', this.value)"></div>';
  d.innerHTML = h;
  lijst.appendChild(d);
});
function esc(t){ const p = document.createElement("span"); p.textContent = t == null ? "" : t;
  return p.innerHTML; }
teken_stand();
</script></body></html>
"""


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--candidates", required=True)
    ap.add_argument("--best", default=None, help="de twee beste, komma-gescheiden")
    args = ap.parse_args()
    tags = [t.strip() for t in args.candidates.split(",")]
    scores = {t: load(t) for t in tags}
    jury_path = os.path.join(core.R05, "jury.json")
    jury = json.load(open(jury_path, encoding="utf-8")) if os.path.exists(jury_path) else {}
    lat_path = os.path.join(core.R05, "latency_per_kandidaat.json")
    lat = json.load(open(lat_path, encoding="utf-8")) if os.path.exists(lat_path) else {}
    kost = {t: kosten(t, scores[t]) for t in tags}
    with open(os.path.join(core.R05, "kosten.json"), "w", encoding="utf-8") as fh:
        json.dump(kost, fh, indent=1, ensure_ascii=False)
    print(md_table(tags, scores, jury, kost, lat))

    best = [t.strip() for t in args.best.split(",")] if args.best else tags[:2]
    out = os.path.join(core.R05, "keurpagina.html")
    n = keurpagina(best, out)
    print(f"\nkeurpagina: {out}  ({n} transcripten van {best})")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
