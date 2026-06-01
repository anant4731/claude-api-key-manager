# Keymaster — Claude API key manager

A local-first dashboard for managing your Anthropic API keys, tracking spend and tokens per key, and detecting when a key is being used for something other than its stated purpose.

## What it does

- **Connect once.** Paste your Anthropic Admin API key into the app on first run; it's encrypted at rest and persisted across refreshes. Switch accounts or disconnect from the in-app account menu.
- **Auto-inventory.** Every key in your connected organization is auto-synced (id, name, status, partial hint). The key's name — set in the Anthropic Console — is treated as its purpose.
- **Purpose clarity check.** Each name is auto-classified at sync time as having a clear purpose or being a placeholder (e.g. `api-key-1-2-3`). Unclear-purpose keys get flagged in the UI; classification is disabled for them until you rename in Console.
- **Spend & token tracking.** Requests that go through the built-in proxy are logged with model, token counts, latency, and cost (computed from the public Claude pricing table).
- **Purpose alignment.** Each proxied request is classified by Haiku as on-purpose or off-purpose relative to the key's name. Drift away from 100% on-purpose means the key is being used for something else.
- **Local only.** SQLite under `.data/`. Keys encrypted at rest with AES-256-GCM. Nothing leaves your machine except the calls forwarded to Anthropic.

## Setup

1. `npm install`
2. `npm run dev` and open <http://localhost:4002> — the app will redirect to a Connect screen.
3. Click "Open Console" to generate an Admin API key at [console.anthropic.com/settings/admin-keys](https://console.anthropic.com/settings/admin-keys). Your account must be an organization (Console → Settings → Organization) — individual accounts can't use the Admin API.
4. Paste the key back. The app verifies it, stores it encrypted, and pulls your full key inventory.

That's the whole setup. No `.env.local` editing required.

> **Encryption key.** If `ENCRYPTION_KEY` is not set in env, Keymaster generates a 32-byte key on first boot and stores it at `.data/.encryption-key` (mode 0600, gitignored). Back this file up — losing it makes stored credentials unrecoverable. For production deployments, set `ENCRYPTION_KEY` in env yourself.

## Using the proxy

For keys you want purpose-tracked, click "Enable proxy" on the key's detail page and paste its secret (Anthropic only shows the secret once at creation). Then point any Anthropic SDK at the local proxy with the issued proxy token:

```sh
export ANTHROPIC_BASE_URL=http://localhost:4002/api/proxy
export ANTHROPIC_API_KEY=prx-...
```

The proxy forwards to `api.anthropic.com`, records the request, and asynchronously asks Haiku whether the request matches the key's stated purpose. Streaming (SSE) is supported transparently.

## Architecture notes

- **Why a proxy?** Anthropic's Admin API exposes usage and cost but not request *content*, so it cannot answer "is this key being used for what I created it for?" The proxy is the only way to attribute spend to a purpose. Keys you don't enroll for proxying show metadata only.
- **Why no OAuth?** Anthropic doesn't offer OAuth for the Admin API. Admin keys must be created in Console. The app handles this with a single in-app paste step and persists the credential.
- **Why heuristic clarity check?** Running an LLM call to grade every key's name at sync time would be slow and require an extra credential. Pattern matching catches the obvious cases (placeholders, single-word names, digit-only IDs); ambiguous cases default to "clear" so you don't lose tracking on legitimate names.

## Stack

Next.js 16 (App Router, Turbopack) · React 19 · TypeScript · Tailwind v4 · Radix UI primitives · Drizzle ORM + libSQL (SQLite) · Recharts · Anthropic SDK.

## Scripts

- `npm run dev` — dev server (port 4002)
- `npm run build` — production build
- `npm run start` — production server (port 4002)
- `npm run lint` — eslint
