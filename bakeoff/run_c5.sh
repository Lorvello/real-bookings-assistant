#!/bin/zsh
cd ~/Projects/ba-launch-worktrees/launch-2026-09/bakeoff
R05="/Users/mathewgroen/Bookings Assistant/.reliability/launch_run_2026_09/R05"
BA="/Users/mathewgroen/Bookings Assistant"
TYPES=(info policy book reschedule cancel multi_calendar multi_service ambiguity name_takeover fabricated_slot payment_link)
{
echo "=== C5 START $(date -u +%FT%TZ) ==="
python3 runner.py --candidate C5 --provider gemini --model gemini-2.5-flash-lite --token-floor 150000
echo "--- LATENCY C5 ---"
python3 "$BA/_automation/latency_meter.py" --marker BA-LR-2026-09-C5 --min-n 30 \
    --json "$R05/latency_C5_TOTAAL.json" | grep -E "n_pairs \(de meting\)|^  p50 |STATUS"
for t in $TYPES; do
  python3 "$BA/_automation/latency_meter.py" --marker BA-LR-2026-09-C5-$t --min-n 2 \
      --json "$R05/latency_C5_${t}.json" > /dev/null 2>&1
done
python3 - <<'PY'
import sys, os
sys.path.insert(0, os.path.expanduser("~/Projects/ba-launch-worktrees/launch-2026-09/bakeoff"))
import core
for s in core.load_suite()["scenarios"]:
    core.teardown_phone(s["telefoon"])
print("volle opruiming na C5")
PY
echo "=== C5 KLAAR $(date -u +%FT%TZ) ==="
} >> "$R05/run_log.txt" 2>&1
