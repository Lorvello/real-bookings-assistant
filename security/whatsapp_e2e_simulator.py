#!/usr/bin/env python3
"""whatsapp_e2e_simulator.py: real signed E2E WhatsApp webhook simulator.

Built for WHATSAPP_E2E_TEST_INFRA Item 5 (Tier 2). Bookings Assistant's own automated
QA (GOAL_PROMPT_SEQUENCED_ROADMAP.md) always called the internal process_whatsapp_message
RPC directly with calendar_id as a parameter, which structurally bypasses the real
webhook's gating logic (phone-to-owner resolution, entitlement gating, bot-toggle
gating; see supabase/functions/whatsapp-webhook/index.ts lines 354-513). This tool
closes that blind spot: it builds a Meta-shaped inbound webhook payload byte-for-byte
the way whatsapp-webhook/index.ts actually parses it, signs it with the real Meta App
Secret exactly like Meta does, and POSTs it to the real production webhook URL. The
INBOUND leg never touches Meta's servers (it is a direct signed POST to our own edge
function); the OUTBOUND leg is the agent's real reply sent for real via the Graph API.

SAFETY RULES (non-negotiable, see GOAL_PROMPT_WHATSAPP_E2E_TEST_INFRA.md section 2):
  - contact.wa_id is HARDCODED to Mathew's own consenting number and validated before
    every send. There is no CLI flag, env var, or code path that can change it.
  - No tight hot-loop. This script sends ONE inbound message per invocation; a
    multi-turn conversation driver (Item 6) must pace its own calls (a few per minute
    at most).
  - Never sends anything Meta would classify as business-initiated/template traffic;
    this only ever simulates a customer-initiated free-form text message.
  - The App Secret is read from ~/.config/ba/whatsapp_app_secret.key and is never
    printed, logged, or included in any evidence file.

Usage:
  python3 security/whatsapp_e2e_simulator.py send "hallo, ik wil een afspraak maken"
  python3 security/whatsapp_e2e_simulator.py send "hallo" --wait 25
  python3 security/whatsapp_e2e_simulator.py check-reply <inbound_message_id>

Requires: ~/.config/ba/whatsapp_app_secret.key, ~/.config/ba/supabase.pat (for the
DB read-back via the Supabase Management API; no service-role key needed).
"""
import argparse
import hashlib
import hmac
import json
import sys
import time
import uuid
from pathlib import Path

import requests

# SAFETY RULE (non-negotiable): every synthetic payload's destination is Mathew's own
# consenting number, hardcoded, never derived from anything else. See
# GOAL_PROMPT_WHATSAPP_E2E_TEST_INFRA.md section 2.
HARDCODED_TEST_WA_ID = "31638281482"

WEBHOOK_URL = "https://grdgjhkygzciwwrxgvgy.supabase.co/functions/v1/whatsapp-webhook"
PROJECT_REF = "grdgjhkygzciwwrxgvgy"
PHONE_NUMBER_ID = "1204872446033001"
WABA_ID = "860773763291531"

APP_SECRET_FILE = Path.home() / ".config" / "ba" / "whatsapp_app_secret.key"
SUPABASE_PAT_FILE = Path.home() / ".config" / "ba" / "supabase.pat"


def _load_secret(path: Path) -> str:
    if not path.exists():
        print(f"ERROR: secret file not found at {path}", file=sys.stderr)
        sys.exit(2)
    return path.read_text().strip()


def _validate_destination(wa_id: str) -> None:
    """SAFETY RULE gate: refuses to build/send any payload for any number but the
    hardcoded self-test number. Called before every payload construction."""
    if wa_id != HARDCODED_TEST_WA_ID:
        print(
            f"REFUSING: destination {wa_id!r} != hardcoded safe number {HARDCODED_TEST_WA_ID!r}",
            file=sys.stderr,
        )
        sys.exit(3)


def build_payload(message_text: str, message_id: str, contact_name: str = "E2E Simulator") -> dict:
    """Builds the exact entry/changes/value/messages+contacts shape
    whatsapp-webhook/index.ts parses (payload.entry[0].changes[0].value.{messages,contacts,metadata})."""
    _validate_destination(HARDCODED_TEST_WA_ID)
    now = int(time.time())
    return {
        "object": "whatsapp_business_account",
        "entry": [
            {
                "id": WABA_ID,
                "changes": [
                    {
                        "value": {
                            "messaging_product": "whatsapp",
                            "metadata": {
                                "display_phone_number": "31851155243",
                                "phone_number_id": PHONE_NUMBER_ID,
                            },
                            "contacts": [
                                {
                                    "profile": {"name": contact_name},
                                    "wa_id": HARDCODED_TEST_WA_ID,
                                }
                            ],
                            "messages": [
                                {
                                    "from": HARDCODED_TEST_WA_ID,
                                    "id": message_id,
                                    "timestamp": str(now),
                                    "text": {"body": message_text},
                                    "type": "text",
                                }
                            ],
                        },
                        "field": "messages",
                    }
                ],
            }
        ],
    }


def sign(raw_body: str, app_secret: str) -> str:
    """HMAC-SHA256 over the exact raw body bytes, matching validateSignature() in
    whatsapp-webhook/index.ts (createHmac('sha256', APP_SECRET).update(payload))."""
    digest = hmac.new(app_secret.encode(), raw_body.encode(), hashlib.sha256).hexdigest()
    return f"sha256={digest}"


def send_inbound(message_text: str) -> dict:
    _validate_destination(HARDCODED_TEST_WA_ID)
    app_secret = _load_secret(APP_SECRET_FILE)
    message_id = f"wamid.E2E_SIM_{uuid.uuid4().hex}"
    payload = build_payload(message_text, message_id)
    # json.dumps with separators to get a deterministic, compact raw body; the signature
    # is computed over exactly these bytes and the identical bytes are what gets POSTed.
    raw_body = json.dumps(payload, separators=(",", ":"))
    signature = sign(raw_body, app_secret)

    # Captured BEFORE the POST so check_reply can correlate the outbound reply by time
    # (whatsapp_messages has no reply-to/thread-id column linking outbound to a specific
    # inbound row; "the first outbound row created after this timestamp" is the correct
    # correlation for one turn, and is what makes check-reply safe to call repeatedly
    # across a multi-turn conversation in Item 6, rather than always returning whichever
    # outbound row happens to be latest).
    sent_at = time.time()
    print(f"[send] destination (hardcoded+validated): {HARDCODED_TEST_WA_ID}")
    print(f"[send] message_id: {message_id}")
    print(f"[send] POST {WEBHOOK_URL}")
    resp = requests.post(
        WEBHOOK_URL,
        data=raw_body.encode(),
        headers={
            "Content-Type": "application/json",
            "X-Hub-Signature-256": signature,
        },
        timeout=30,
    )
    print(f"[send] response: {resp.status_code} {resp.text[:300]}")
    return {"message_id": message_id, "status_code": resp.status_code, "body": resp.text, "sent_at": sent_at}


def sql_query(query: str) -> list:
    pat = _load_secret(SUPABASE_PAT_FILE)
    resp = requests.post(
        f"https://api.supabase.com/v1/projects/{PROJECT_REF}/database/query",
        headers={"Authorization": f"Bearer {pat}", "Content-Type": "application/json"},
        json={"query": query},
        timeout=30,
    )
    resp.raise_for_status()
    data = resp.json()
    if isinstance(data, dict) and "message" in data:
        raise RuntimeError(f"SQL query failed: {data['message']}")
    return data


def check_reply(inbound_message_id: str, wait_seconds: int = 20, poll_interval: int = 3, after_ts: float = None) -> dict:
    """Polls whatsapp_messages for the outbound reply that followed this inbound
    message on the same conversation, plus webhook_security_logs for the
    signature_validated + webhook_processed confirmation of the inbound leg itself.

    Correlation: whatsapp_messages has no reply-to/thread-id column, so the reply for
    ONE turn is identified as the earliest outbound row with created_at strictly after
    `after_ts` (the moment this script POSTed the inbound). Without `after_ts` (e.g. a
    standalone check-reply invocation) this falls back to "now minus wait_seconds",
    which is only reliable for a single isolated check, not mid-conversation polling.
    """
    _validate_destination(HARDCODED_TEST_WA_ID)
    deadline = time.time() + wait_seconds
    since_iso = None
    if after_ts is not None:
        since_iso = time.strftime("%Y-%m-%dT%H:%M:%S", time.gmtime(after_ts))
    result = {"inbound_confirmed": False, "outbound_reply": None, "security_log_events": []}

    log_rows = sql_query(
        """select event_type, severity, created_at from webhook_security_logs
        where event_type in ('signature_validated','webhook_processed')
        and created_at >= now() - interval '2 minutes'
        order by created_at desc limit 10;"""
    )
    result["security_log_events"] = log_rows
    result["inbound_confirmed"] = any(r["event_type"] == "signature_validated" for r in log_rows)

    time_filter = f"and wm.created_at > '{since_iso}'" if since_iso else "and wm.created_at >= now() - interval '2 minutes'"
    while time.time() < deadline:
        rows = sql_query(
            f"""select wm.id, wm.direction, wm.content, wm.created_at
            from whatsapp_messages wm
            join whatsapp_conversations wc on wc.id = wm.conversation_id
            join whatsapp_contacts c on c.id = wc.contact_id
            where c.phone_number = '{HARDCODED_TEST_WA_ID}'
            and wm.direction = 'outbound'
            {time_filter}
            order by wm.created_at asc limit 1;"""
        )
        if rows:
            result["outbound_reply"] = rows[0]
            break
        time.sleep(poll_interval)

    return result


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = parser.add_subparsers(dest="cmd", required=True)

    p_send = sub.add_parser("send", help="Send one synthetic signed inbound message and wait for the agent's reply")
    p_send.add_argument("message", help="The customer message text")
    p_send.add_argument("--wait", type=int, default=25, help="Seconds to wait for the outbound reply (default 25)")

    p_check = sub.add_parser("check-reply", help="Poll for the outbound reply to a prior send")
    p_check.add_argument("inbound_message_id")
    p_check.add_argument("--wait", type=int, default=20)

    args = parser.parse_args()

    if args.cmd == "send":
        sent = send_inbound(args.message)
        if sent["status_code"] != 200:
            print("FAIL: webhook did not return 200", file=sys.stderr)
            sys.exit(1)
        reply = check_reply(sent["message_id"], wait_seconds=args.wait, after_ts=sent["sent_at"])
        print(json.dumps({**sent, **reply}, indent=2, default=str))
    elif args.cmd == "check-reply":
        reply = check_reply(args.inbound_message_id, wait_seconds=args.wait)
        print(json.dumps(reply, indent=2, default=str))


if __name__ == "__main__":
    main()
