# demo-apps

Two small Anthropic-SDK clients pointed at the local Keymaster proxy. They
exist to drive traffic through the proxy so you can see spend, tokens, latency,
and purpose-alignment populate in the dashboard.

| App                  | Language | Pattern              | Good as a key named… |
| -------------------- | -------- | -------------------- | -------------------- |
| `chatbot-cli/`       | Python   | Interactive, streaming | `cli-chat-assistant` |
| `summarizer-node/`   | Node     | Batch, non-streaming   | `doc-summarizer`     |

Both follow the README's setup:

```sh
export ANTHROPIC_BASE_URL=http://localhost:4002/api/proxy
export ANTHROPIC_API_KEY=prx-...   # proxy token from Keymaster
```

See each app's own README for usage. Use distinct proxy tokens (one per app)
so the dashboard can show per-purpose spend and so the alignment classifier has
a clean signal to grade.
