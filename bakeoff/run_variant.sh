#!/bin/zsh
# R6-PRE: EEN variantrun. Alles schrijft in BA_BAKEOFF_OUT (nooit meer in R05).
set -e
cd ~/Projects/ba-launch-worktrees/launch-2026-09/bakeoff
TAG=$1
BA="/Users/mathewgroen/Bookings Assistant"
export BA_BAKEOFF_OUT="${BA_BAKEOFF_OUT:-$BA/.reliability/launch_run_2026_09/R06PRE}"
echo "=== $TAG START $(date -u +%FT%TZ)  meetmoment vastgelegd ==="
python3 runner.py --candidate "$TAG" --provider groq --model "openai/gpt-oss-20b" --token-floor 150000
echo "--- LATENCY $TAG ---"
python3 "$BA/_automation/latency_meter.py" --marker BA-LR-2026-09-$TAG --min-n 30 \
    --json "$BA_BAKEOFF_OUT/latency_${TAG}_TOTAAL.json" | grep -E "n_pairs|p50|p95|STATUS" || true
python3 score.py "$TAG"
python3 - "$TAG" <<'PY'
import sys, os
sys.path.insert(0, os.path.expanduser("~/Projects/ba-launch-worktrees/launch-2026-09/bakeoff"))
import core
for s in core.load_suite()["scenarios"]:
    core.teardown_phone(s["telefoon"])
print("volle opruiming na", sys.argv[1])
PY
echo "=== $TAG KLAAR $(date -u +%FT%TZ) ==="
