# classifier-eval

End-to-end test of Keymaster's purpose-alignment classifier. Sends each prompt
through the real proxy, reads the resulting row out of `.data/app.db`, and
shows what the classifier decided alongside what you expected.

## Pre-flight

The classifier only actually runs when **all** of these are true (see
`src/lib/classifier.ts`):

1. Keymaster is running (`npm run dev`).
2. The key you're testing has a stored secret (proxy enabled in the dashboard).
3. The key's `purpose_clarity` is `"clear"` — names like `api-key-1` get
   auto-flagged as unclear and the classifier short-circuits to `on_purpose`.

If any of those is false, you'll still get a row in the DB but the
classification reason will tell you why no real grading happened.

## Setup

```sh
pip install -r requirements.txt
export ANTHROPIC_BASE_URL=http://localhost:4002/api/proxy
export ANTHROPIC_API_KEY=prx-...   # proxy token from the key's detail page
```

## Run

```sh
# defaults: ./cases.example.json, db at ../../.data/app.db
python run.py

# custom cases file and DB path
python run.py --cases my-cases.json --db /abs/path/to/.data/app.db
```

You'll see a line per case with the actual classification (coloured),
whether it agreed with your `expected`, and the classifier's one-line reason.
A summary of agreement percentage and full per-case results land in
`results.json`.

## Writing cases

`cases.example.json` is a JSON array. Each case:

```json
{
  "name": "short-label",
  "expected": "on_purpose",        // or "off_purpose"; omit to just observe
  "system": "optional system prompt",
  "prompt": "the user message that will be sent",
  "max_tokens": 256                // optional
}
```

The classifier only sees `promptExcerpt` — system prompt + last 4 messages,
capped at ~2000 chars — so very long prompts get truncated. Keep cases focused.

## Caveats

- The classifier runs **async** after the proxy returns. The harness polls
  `requests.classification` and waits up to `--class-timeout` seconds
  (default 30) for it to flip away from `pending`.
- Each case sends a real request to Anthropic via the proxy — there's a small
  real-money cost per case.
- If you re-run the same cases, you'll accumulate request rows. The harness
  uses `MAX(timestamp)` to find the new row, so re-runs are fine; just clear
  the dashboard view if it gets noisy.
