# chatbot-cli

Tiny streaming chat REPL that talks to Claude through your local Keymaster proxy.

## Setup

```sh
pip install -r requirements.txt
cp .env.example .env   # then edit, or just export the vars in your shell
export ANTHROPIC_BASE_URL=http://localhost:4002/api/proxy
export ANTHROPIC_API_KEY=prx-...   # the proxy token from Keymaster
python chat.py
```

## Commands

| Input            | Effect                              |
| ---------------- | ----------------------------------- |
| `<message>`      | Send a turn, stream the reply       |
| `/system <text>` | Replace the system prompt           |
| `/reset`         | Clear in-memory history             |
| `/exit` / Ctrl-D | Quit                                |

## What Keymaster sees

Each turn is logged in the Keymaster dashboard with model, token counts, latency,
and cost. Because the proxy classifies requests against the key's name,
register the key in Keymaster with a descriptive name like `cli-chat-assistant`
so the purpose-alignment check has something meaningful to grade.
