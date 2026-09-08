#!/bin/zsh
cd ~/Projects/ba-launch-worktrees/launch-2026-09/bakeoff
R05="/Users/mathewgroen/Bookings Assistant/.reliability/launch_run_2026_09/R05"
BA="/Users/mathewgroen/Bookings Assistant"
TYPES=(info policy book reschedule cancel multi_calendar multi_service ambiguity name_takeover fabricated_slot payment_link)
{
echo "=== START $(date -u +%FT%TZ) ==="
run_one () {
  local tag=$1 prov=$2 model=$3
  if [ -n "$model" ]; then
    python3 runner.py --candidate $tag --provider $prov --model "$model" --token-floor 150000
  else
    python3 runner.py --candidate $tag --provider $prov --token-floor 0
  fi
  echo "--- LATENCY $tag, instrument _automation/latency_meter.py ---"
  python3 "$BA/_automation/latency_meter.py" --marker BA-LR-2026-09-$tag --min-n 30 \
      --json "$R05/latency_${tag}_TOTAAL.json" | grep -E "n_pairs|p50 |STATUS"
  echo "exit_totaal_$tag=$?"
  for t in $TYPES; do
    echo "--- LATENCY $tag / $t ---"
    python3 "$BA/_automation/latency_meter.py" --marker BA-LR-2026-09-$tag-$t --min-n 2 \
        --json "$R05/latency_${tag}_${t}.json" | grep -E "n_pairs \(de meting\)|^  p50 |STATUS"
  done
  python3 - "$tag" <<'PY'
import sys, os
sys.path.insert(0, os.path.expanduser("~/Projects/ba-launch-worktrees/launch-2026-09/bakeoff"))
import core
for s in core.load_suite()["scenarios"]:
    core.teardown_phone(s["telefoon"])
print("volle opruiming na", sys.argv[1], "klaar")
PY
  echo "=== $tag klaar $(date -u +%FT%TZ) ==="
}
run_one C1 groq "openai/gpt-oss-20b"
run_one C2 groq "openai/gpt-oss-120b"
run_one C3 groq "qwen/qwen3.8-27b"
run_one C4 gemini ""
echo "=== ALLES KLAAR $(date -u +%FT%TZ) ==="
} >> "$R05/run_log.txt" 2>&1
