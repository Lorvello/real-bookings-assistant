#!/bin/zsh
cd ~/Projects/ba-launch-worktrees/launch-2026-09/bakeoff
R05="/Users/mathewgroen/Bookings Assistant/.reliability/launch_run_2026_09/R05"
BA="/Users/mathewgroen/Bookings Assistant"
TYPES=(info policy book reschedule cancel multi_calendar multi_service ambiguity name_takeover fabricated_slot payment_link)
{
echo "=== HERMETING START $(date -u +%FT%TZ) ==="
run_one () {
  local tag=$1 prov=$2 model=$3
  if [ -n "$model" ]; then
    python3 runner.py --candidate $tag --provider $prov --model "$model" --token-floor 150000
  else
    python3 runner.py --candidate $tag --provider $prov --token-floor 150000
  fi
  echo "--- LATENCY $tag ---"
  python3 "$BA/_automation/latency_meter.py" --marker BA-LR-2026-09-$tag --min-n 30 \
      --json "$R05/latency_${tag}_TOTAAL.json" | grep -E "n_pairs \(de meting\)|^  p50 |STATUS"
  for t in $TYPES; do
    python3 "$BA/_automation/latency_meter.py" --marker BA-LR-2026-09-$tag-$t --min-n 2 \
        --json "$R05/latency_${tag}_${t}.json" > /dev/null 2>&1
  done
  python3 - "$tag" <<'PY'
import sys, os
sys.path.insert(0, os.path.expanduser("~/Projects/ba-launch-worktrees/launch-2026-09/bakeoff"))
import core
for s in core.load_suite()["scenarios"]:
    core.teardown_phone(s["telefoon"])
print("volle opruiming na", sys.argv[1])
PY
  echo "=== $tag klaar $(date -u +%FT%TZ) ==="
}
run_one C4 gemini ""
run_one C1 groq "openai/gpt-oss-20b"
echo "=== HERMETING KLAAR $(date -u +%FT%TZ) ==="
} >> "$R05/run_log.txt" 2>&1
