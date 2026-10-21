#!/usr/bin/env python3
"""Send a simulated offline purchase to GA4 using the Measurement Protocol.

Learning project: shows how a purchase that happened outside the website (for example in a
CRM or a shop) can be sent to GA4 as an event. It uses only the Python standard library.

Credentials come from environment variables (never commit them):
    GA4_MEASUREMENT_ID   e.g. G-XXXXXXXXXX   (GA4 property > Data streams > your web stream)
    GA4_API_SECRET       created under the same data stream > Measurement Protocol API secrets

Examples:
    # Show the payload without sending anything
    python3 scripts/measurement_protocol.py --dry-run

    # Validate against Google's debug endpoint (returns validation messages, records nothing)
    python3 scripts/measurement_protocol.py --debug

    # Send for real (shows up in GA4 reports after a delay; Realtime may show it sooner)
    python3 scripts/measurement_protocol.py

Notes:
    * client_id should match a real GA4 client ID if you want the event tied to a visitor.
      With a made-up client_id the event is recorded as a separate user.
    * timestamp_micros can backdate an event, but only within a short window (see Google's docs).
    * Measurement Protocol is meant to supplement, not replace, tracking on the site.
"""
import argparse
import json
import os
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
import uuid

ENDPOINT = "https://www.google-analytics.com/mp/collect"
DEBUG_ENDPOINT = "https://www.google-analytics.com/debug/mp/collect"

SAMPLE_ITEMS = [
    {
        "item_id": "BK-101",
        "item_name": "Cloud Security Handbook",
        "item_category": "Books",
        "price": 29.0,
        "quantity": 1,
    }
]


def validate_inputs(client_id, transaction_id, value, currency, items):
    """Return a list of human-readable problems (empty list = looks fine)."""
    problems = []
    if not client_id:
        problems.append("client_id is required")
    if not transaction_id:
        problems.append("transaction_id is required")
    try:
        if float(value) < 0:
            problems.append("value must not be negative")
    except (TypeError, ValueError):
        problems.append("value must be a number")
    if not (isinstance(currency, str) and len(currency) == 3 and currency.isalpha()):
        problems.append("currency must be a 3-letter code such as EUR")
    if not items:
        problems.append("items must contain at least one item")
    else:
        for index, item in enumerate(items):
            if "item_id" not in item and "item_name" not in item:
                problems.append("items[%d] needs item_id or item_name" % index)
    return problems


def build_payload(client_id, transaction_id, value, currency, items,
                  timestamp_micros=None, user_id=None):
    """Build the JSON body for a GA4 'purchase' event."""
    payload = {
        "client_id": client_id,
        "events": [
            {
                "name": "purchase",
                "params": {
                    "transaction_id": transaction_id,
                    "value": float(value),
                    "currency": currency.upper(),
                    "items": items,
                    "engagement_time_msec": 1,
                },
            }
        ],
    }
    if user_id:
        payload["user_id"] = user_id
    if timestamp_micros:
        payload["timestamp_micros"] = int(timestamp_micros)
    return payload


def send(payload, measurement_id, api_secret, debug=False, timeout=10):
    """POST the payload. Returns (status_code, response_text)."""
    base = DEBUG_ENDPOINT if debug else ENDPOINT
    query = urllib.parse.urlencode({"measurement_id": measurement_id, "api_secret": api_secret})
    request = urllib.request.Request(
        base + "?" + query,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            return response.status, response.read().decode("utf-8")
    except urllib.error.HTTPError as error:
        return error.code, error.read().decode("utf-8", errors="replace")


def parse_args(argv):
    parser = argparse.ArgumentParser(description="Send a simulated offline purchase to GA4 (Measurement Protocol).")
    parser.add_argument("--client-id", default=None, help="GA4 client ID (default: random)")
    parser.add_argument("--transaction-id", default=None, help="Unique order ID (default: generated)")
    parser.add_argument("--value", type=float, default=29.0)
    parser.add_argument("--currency", default="EUR")
    parser.add_argument("--items-json", default=None, help="Path to a JSON file with an items array")
    parser.add_argument("--user-id", default=None)
    parser.add_argument("--hours-ago", type=float, default=0.0, help="Backdate the event by this many hours")
    parser.add_argument("--dry-run", action="store_true", help="Print the payload and exit")
    parser.add_argument("--debug", action="store_true", help="Use the validation endpoint (nothing is recorded)")
    return parser.parse_args(argv)


def main(argv=None):
    args = parse_args(sys.argv[1:] if argv is None else argv)

    client_id = args.client_id or "%d.%d" % (int(time.time()), uuid.uuid4().int % 10**9)
    transaction_id = args.transaction_id or "OFFLINE-%s" % uuid.uuid4().hex[:10].upper()

    if args.items_json:
        with open(args.items_json, "r", encoding="utf-8") as handle:
            items = json.load(handle)
    else:
        items = SAMPLE_ITEMS

    problems = validate_inputs(client_id, transaction_id, args.value, args.currency, items)
    if problems:
        for problem in problems:
            print("Input problem: " + problem, file=sys.stderr)
        return 2

    timestamp = None
    if args.hours_ago:
        timestamp = int((time.time() - args.hours_ago * 3600) * 1_000_000)

    payload = build_payload(client_id, transaction_id, args.value, args.currency, items,
                            timestamp_micros=timestamp, user_id=args.user_id)

    if args.dry_run:
        print(json.dumps(payload, indent=2))
        return 0

    measurement_id = os.environ.get("GA4_MEASUREMENT_ID")
    api_secret = os.environ.get("GA4_API_SECRET")
    if not measurement_id or not api_secret:
        print("Set GA4_MEASUREMENT_ID and GA4_API_SECRET (or use --dry-run).", file=sys.stderr)
        return 2

    try:
        status, body = send(payload, measurement_id, api_secret, debug=args.debug)
    except (urllib.error.URLError, TimeoutError) as error:
        print("Network problem: %s" % error, file=sys.stderr)
        return 1

    print("HTTP %d" % status)
    if body.strip():
        print(body)
    return 0 if 200 <= status < 300 else 1


if __name__ == "__main__":
    sys.exit(main())
