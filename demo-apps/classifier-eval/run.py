"""
End-to-end test for Keymaster's purpose-alignment classifier.

For each case in the cases file, this script:
  1. Sends the prompt through the local Keymaster proxy using your proxy token
     (so it travels exactly the same path a real client would).
  2. Polls .data/app.db for the matching `requests` row to appear.
  3. Waits for `classification` to flip from "pending" to its final value.
  4. Prints actual vs expected and the classifier's stated reason.
  5. Writes a JSON report to ./results.json.

Setup (in the Keymaster repo root):
  - Keymaster running:           npm run dev
  - A key registered with a stored secret (so the proxy can forward AND the
    classifier can actually run — see src/lib/classifier.ts).
  - The key's name must be classified as "clear" purpose. Names like
    "api-key-1" get auto-flagged unclear and skipped (classification defaults
    to on_purpose with a fixed reason).

Env:
  ANTHROPIC_BASE_URL=http://localhost:4002/api/proxy
  ANTHROPIC_API_KEY=prx-...                # the proxy token

Run:
  python run.py --cases cases.example.json
  python run.py --cases cases.example.json --db ../../.data/app.db
"""

from __future__ import annotations

import argparse
import json
import os
import sqlite3
import sys
import time
from pathlib import Path
from typing import Any

from anthropic import Anthropic, APIStatusError


def resolve_key(db_path: Path, proxy_token: str) -> tuple[str, str, str]:
    """Return (api_key_id, name, purpose_clarity) for the given proxy token."""
    conn = sqlite3.connect(str(db_path))
    try:
        row = conn.execute(
            "SELECT id, name, purpose_clarity, encrypted_key FROM api_keys WHERE proxy_token = ?",
            (proxy_token,),
        ).fetchone()
    finally:
        conn.close()
    if not row:
        raise SystemExit(f"no api_keys row matched proxy_token {proxy_token[:10]}…")
    key_id, name, clarity, enc = row
    if not enc:
        print(
            f"warning: key '{name}' has no stored secret. The proxy will reject the request.",
            file=sys.stderr,
        )
    if clarity != "clear":
        print(
            f"warning: key '{name}' has purpose_clarity={clarity!r}. "
            "The classifier will short-circuit to on_purpose with a fixed reason. "
            "Rename to a clearly-purposed name in the dashboard for a real test.",
            file=sys.stderr,
        )
    return key_id, name, clarity


def latest_ts(conn: sqlite3.Connection, key_id: str) -> str:
    row = conn.execute(
        "SELECT COALESCE(MAX(timestamp), '') FROM requests WHERE api_key_id = ?",
        (key_id,),
    ).fetchone()
    return row[0]


def wait_for_new_row(
    db_path: Path, key_id: str, prev_max_ts: str, timeout: float
) -> dict[str, Any] | None:
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        conn = sqlite3.connect(str(db_path))
        try:
            row = conn.execute(
                """SELECT id, timestamp, classification, classification_reason,
                          status_code, prompt_excerpt
                     FROM requests
                    WHERE api_key_id = ? AND timestamp > ?
                    ORDER BY timestamp DESC
                    LIMIT 1""",
                (key_id, prev_max_ts),
            ).fetchone()
        finally:
            conn.close()
        if row:
            return {
                "id": row[0],
                "timestamp": row[1],
                "classification": row[2],
                "reason": row[3],
                "status_code": row[4],
                "prompt_excerpt": row[5],
            }
        time.sleep(0.25)
    return None


def wait_for_classification(
    db_path: Path, request_id: str, timeout: float
) -> dict[str, Any] | None:
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        conn = sqlite3.connect(str(db_path))
        try:
            row = conn.execute(
                "SELECT classification, classification_reason FROM requests WHERE id = ?",
                (request_id,),
            ).fetchone()
        finally:
            conn.close()
        if row and row[0] != "pending":
            return {"classification": row[0], "reason": row[1]}
        time.sleep(0.5)
    return None


def send_case(client: Anthropic, case: dict[str, Any], model: str) -> None:
    system = case.get("system") or "You are a helpful assistant."
    prompt = case["prompt"]
    # Fire and discard; we don't care about the reply, just that it lands in the DB.
    client.messages.create(
        model=model,
        max_tokens=case.get("max_tokens", 256),
        system=system,
        messages=[{"role": "user", "content": prompt}],
    )


def colour(label: str) -> str:
    if label == "on_purpose":
        return f"\x1b[32m{label}\x1b[0m"
    if label == "off_purpose":
        return f"\x1b[31m{label}\x1b[0m"
    if label == "failed":
        return f"\x1b[33m{label}\x1b[0m"
    return label


def main() -> int:
    p = argparse.ArgumentParser()
    p.add_argument("--cases", default="cases.example.json", help="JSON file of test cases")
    p.add_argument(
        "--db",
        default=str(Path(__file__).resolve().parent.parent.parent / ".data" / "app.db"),
        help="Path to Keymaster SQLite DB",
    )
    p.add_argument("--model", default=os.environ.get("ANTHROPIC_MODEL", "claude-haiku-4-5"))
    p.add_argument(
        "--row-timeout",
        type=float,
        default=15.0,
        help="Seconds to wait for the request row to appear",
    )
    p.add_argument(
        "--class-timeout",
        type=float,
        default=30.0,
        help="Seconds to wait for classification to land",
    )
    p.add_argument("--out", default="results.json")
    args = p.parse_args()

    token = os.environ.get("ANTHROPIC_API_KEY", "")
    if not token.startswith("prx-"):
        print(
            "error: ANTHROPIC_API_KEY must be a Keymaster proxy token (starts with 'prx-').",
            file=sys.stderr,
        )
        return 2
    if not os.environ.get("ANTHROPIC_BASE_URL"):
        print(
            "error: ANTHROPIC_BASE_URL is not set. "
            "Set it to http://localhost:4002/api/proxy",
            file=sys.stderr,
        )
        return 2

    db_path = Path(args.db).resolve()
    if not db_path.exists():
        print(f"error: db not found at {db_path}", file=sys.stderr)
        return 2

    cases_path = Path(args.cases).resolve()
    if not cases_path.exists():
        print(f"error: cases file not found at {cases_path}", file=sys.stderr)
        return 2

    cases = json.loads(cases_path.read_text())
    if not isinstance(cases, list) or not cases:
        print("error: cases file must be a non-empty JSON array", file=sys.stderr)
        return 2

    key_id, key_name, clarity = resolve_key(db_path, token)
    client = Anthropic()

    print(f"key:    {key_name}  ({key_id[:8]}…)  clarity={clarity}")
    print(f"db:     {db_path}")
    print(f"cases:  {cases_path}  ({len(cases)} cases)")
    print("-" * 78)

    results: list[dict[str, Any]] = []
    for i, case in enumerate(cases, 1):
        name = case.get("name") or f"case-{i}"
        expected = case.get("expected")  # optional: "on_purpose" or "off_purpose"
        print(f"[{i}/{len(cases)}] {name} …", end=" ", flush=True)

        prev_max = ""
        conn = sqlite3.connect(str(db_path))
        try:
            prev_max = latest_ts(conn, key_id)
        finally:
            conn.close()

        try:
            send_case(client, case, args.model)
        except APIStatusError as e:
            print(f"\n  proxy error {e.status_code}: {e.message}")
            results.append(
                {"name": name, "error": f"proxy {e.status_code}: {e.message}"}
            )
            continue
        except Exception as e:
            print(f"\n  send error: {e}")
            results.append({"name": name, "error": f"send: {e}"})
            continue

        row = wait_for_new_row(db_path, key_id, prev_max, args.row_timeout)
        if not row:
            print(f"\n  no DB row appeared within {args.row_timeout}s")
            results.append({"name": name, "error": "row timeout"})
            continue

        if row["classification"] != "pending":
            classified = row
        else:
            updated = wait_for_classification(db_path, row["id"], args.class_timeout)
            if not updated:
                print(f"\n  classification still pending after {args.class_timeout}s")
                results.append(
                    {
                        "name": name,
                        "request_id": row["id"],
                        "error": "classification timeout",
                    }
                )
                continue
            classified = {**row, **updated}

        actual = classified["classification"]
        reason = classified["reason"]
        agree = "—" if expected is None else ("✓" if actual == expected else "✗")
        print(f"{colour(actual)}  {agree}")
        print(f"   reason: {reason}")
        results.append(
            {
                "name": name,
                "request_id": row["id"],
                "expected": expected,
                "actual": actual,
                "reason": reason,
                "status_code": classified.get("status_code"),
                "prompt_excerpt": classified.get("prompt_excerpt", "")[:300],
            }
        )

    print("-" * 78)
    with_exp = [r for r in results if r.get("expected")]
    if with_exp:
        correct = sum(1 for r in with_exp if r.get("actual") == r.get("expected"))
        print(f"agreement: {correct}/{len(with_exp)} = {correct / len(with_exp):.0%}")
    errs = [r for r in results if r.get("error")]
    if errs:
        print(f"errors: {len(errs)}")

    Path(args.out).write_text(json.dumps(results, indent=2))
    print(f"wrote {args.out}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
