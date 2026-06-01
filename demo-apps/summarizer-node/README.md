# summarizer-node

Batch text summarizer. Reads a file (or stdin), asks Claude for a tight summary,
prints it to stdout. All requests are routed through the local Keymaster proxy
so spend, tokens, and purpose-alignment show up in the dashboard.

## Setup

```sh
npm install
export ANTHROPIC_BASE_URL=http://localhost:4002/api/proxy
export ANTHROPIC_API_KEY=prx-...   # proxy token from Keymaster
```

## Use

```sh
node summarize.mjs README.md
node summarize.mjs --bullets article.txt
node summarize.mjs --words 60 long-doc.md
cat post.md | node summarize.mjs -
```

| Flag           | Default              | Meaning                              |
| -------------- | -------------------- | ------------------------------------ |
| `--bullets`    | off                  | 5 bullets instead of a paragraph     |
| `--words N`    | 120                  | Target paragraph length              |
| `--model ID`   | `claude-haiku-4-5`   | Override the model                   |

## Tip

Register the corresponding key in Keymaster with a name like `doc-summarizer`
so the purpose-alignment classifier has something specific to grade against.
A summarizer key that suddenly starts answering chat questions will show up
as off-purpose drift in the dashboard.
