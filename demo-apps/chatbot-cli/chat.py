"""
Streaming CLI chatbot for Claude, routed through the Keymaster proxy.

Setup:
    export ANTHROPIC_BASE_URL=http://localhost:4002/api/proxy
    export ANTHROPIC_API_KEY=prx-...           # proxy token from Keymaster
    pip install -r requirements.txt
    python chat.py

The conversation lives in memory for the session. Ctrl-D or `/exit` to quit;
`/reset` clears the history; `/system <text>` sets a system prompt.
"""

from __future__ import annotations

import os
import sys
from typing import List

from anthropic import Anthropic, APIStatusError, APIConnectionError

MODEL = os.environ.get("ANTHROPIC_MODEL", "claude-haiku-4-5")
MAX_TOKENS = int(os.environ.get("ANTHROPIC_MAX_TOKENS", "1024"))


def banner() -> None:
    base = os.environ.get("ANTHROPIC_BASE_URL", "(default: api.anthropic.com)")
    print(f"chatbot-cli  -  model={MODEL}  base_url={base}")
    print("Type a message and press enter. Commands: /exit  /reset  /system <text>")
    print("-" * 64)


def main() -> int:
    if not os.environ.get("ANTHROPIC_API_KEY"):
        print("error: ANTHROPIC_API_KEY is not set", file=sys.stderr)
        return 2

    client = Anthropic()  # picks up ANTHROPIC_API_KEY and ANTHROPIC_BASE_URL from env
    history: List[dict] = []
    system_prompt = "You are a concise, friendly assistant. Keep replies short."

    banner()
    while True:
        try:
            user = input("you> ").strip()
        except (EOFError, KeyboardInterrupt):
            print()
            return 0
        if not user:
            continue
        if user in ("/exit", "/quit"):
            return 0
        if user == "/reset":
            history.clear()
            print("(history cleared)")
            continue
        if user.startswith("/system "):
            system_prompt = user[len("/system ") :].strip()
            print(f"(system prompt set: {system_prompt!r})")
            continue

        history.append({"role": "user", "content": user})
        print("claude> ", end="", flush=True)

        try:
            with client.messages.stream(
                model=MODEL,
                max_tokens=MAX_TOKENS,
                system=system_prompt,
                messages=history,
            ) as stream:
                reply_chunks: List[str] = []
                for text in stream.text_stream:
                    sys.stdout.write(text)
                    sys.stdout.flush()
                    reply_chunks.append(text)
                print()
                history.append({"role": "assistant", "content": "".join(reply_chunks)})
        except APIStatusError as e:
            print(f"\n[api error {e.status_code}] {e.message}", file=sys.stderr)
            history.pop()  # don't keep the unanswered turn in history
        except APIConnectionError as e:
            print(f"\n[connection error] {e}", file=sys.stderr)
            history.pop()


if __name__ == "__main__":
    sys.exit(main())
