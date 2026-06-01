import { NextRequest } from "next/server";
import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import { requests } from "@/lib/db/schema";
import { getKeyByProxyToken } from "@/lib/keys";
import { decrypt } from "@/lib/crypto";
import { costCents, type TokenUsage } from "@/lib/pricing";
import { classifyRequest } from "@/lib/classifier";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";

const FORWARD_HEADERS = new Set([
  "anthropic-version",
  "anthropic-beta",
  "anthropic-dangerous-direct-browser-access",
  "content-type",
  "accept",
]);

function jsonError(status: number, error: string) {
  return new Response(JSON.stringify({ type: "error", error: { message: error } }), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function extractProxyToken(req: NextRequest): string | null {
  const xkey = req.headers.get("x-api-key");
  if (xkey) return xkey.trim();
  const auth = req.headers.get("authorization");
  if (auth?.toLowerCase().startsWith("bearer "))
    return auth.slice(7).trim();
  return null;
}

function extractPromptExcerpt(body: unknown): string {
  if (!body || typeof body !== "object") return "";
  const messages = (body as { messages?: unknown }).messages;
  const system = (body as { system?: unknown }).system;
  const out: string[] = [];
  if (typeof system === "string") out.push(`[system] ${system}`);
  else if (Array.isArray(system)) {
    for (const s of system) {
      if (typeof s === "object" && s && "text" in s)
        out.push(`[system] ${String((s as { text: unknown }).text ?? "")}`);
    }
  }
  if (Array.isArray(messages)) {
    for (const m of messages.slice(-4)) {
      if (typeof m !== "object" || !m) continue;
      const role = String((m as { role?: unknown }).role ?? "");
      const content = (m as { content?: unknown }).content;
      if (typeof content === "string") out.push(`[${role}] ${content}`);
      else if (Array.isArray(content)) {
        for (const c of content) {
          if (typeof c === "object" && c && "text" in c)
            out.push(`[${role}] ${String((c as { text: unknown }).text ?? "")}`);
        }
      }
    }
  }
  return out.join("\n").slice(0, 4000);
}

type CapturedUsage = {
  input_tokens?: number;
  output_tokens?: number;
  cache_read_input_tokens?: number;
  cache_creation_input_tokens?: number;
};

function toTokenUsage(u: CapturedUsage): TokenUsage {
  return {
    inputTokens: u.input_tokens ?? 0,
    outputTokens: u.output_tokens ?? 0,
    cacheReadTokens: u.cache_read_input_tokens ?? 0,
    cacheWriteTokens: u.cache_creation_input_tokens ?? 0,
  };
}

export async function POST(req: NextRequest) {
  const token = extractProxyToken(req);
  if (!token) return jsonError(401, "missing x-api-key");
  const key = await getKeyByProxyToken(token);
  if (!key) return jsonError(401, "invalid proxy token");
  if (!key.encryptedKey)
    return jsonError(
      400,
      "key has no stored secret. Register it in the dashboard to enable proxying."
    );
  if (key.status !== "active")
    return jsonError(403, `key is ${key.status}`);

  let realKey: string;
  try {
    realKey = decrypt(key.encryptedKey);
  } catch (e) {
    return jsonError(500, `decrypt failed: ${String(e)}`);
  }

  let bodyText: string;
  try {
    bodyText = await req.text();
  } catch {
    return jsonError(400, "invalid body");
  }
  let body: unknown = {};
  try {
    body = JSON.parse(bodyText);
  } catch {
    return jsonError(400, "body must be JSON");
  }
  const isStream = Boolean((body as { stream?: unknown }).stream);
  const model = String((body as { model?: unknown }).model ?? "unknown");

  const forwardHeaders: Record<string, string> = {
    "x-api-key": realKey,
    "anthropic-version":
      req.headers.get("anthropic-version") ?? "2023-06-01",
    "content-type": "application/json",
  };
  for (const [k, v] of req.headers.entries()) {
    const kl = k.toLowerCase();
    if (FORWARD_HEADERS.has(kl) && !(kl in forwardHeaders)) {
      forwardHeaders[kl] = v;
    }
  }

  const start = Date.now();
  let upstream: Response;
  try {
    upstream = await fetch(ANTHROPIC_URL, {
      method: "POST",
      headers: forwardHeaders,
      body: bodyText,
    });
  } catch (e) {
    return jsonError(502, `upstream fetch failed: ${String(e)}`);
  }

  const reqId = randomUUID();
  const promptExcerpt = extractPromptExcerpt(body);

  const persist = async (
    usage: CapturedUsage,
    status: number,
    extraReason?: string
  ) => {
    const tokens = toTokenUsage(usage);
    const cost = costCents(model, tokens);
    await db()
      .insert(requests)
      .values({
        id: reqId,
        apiKeyId: key.id,
        timestamp: new Date().toISOString(),
        model,
        inputTokens: tokens.inputTokens,
        outputTokens: tokens.outputTokens,
        cacheReadTokens: tokens.cacheReadTokens,
        cacheWriteTokens: tokens.cacheWriteTokens,
        costCents: cost,
        promptExcerpt,
        classification: status >= 400 ? "failed" : "pending",
        classificationReason: extraReason ?? "",
        latencyMs: Date.now() - start,
        statusCode: status,
      });
    if (status < 400) {

      void classifyRequest(reqId).catch((e) =>
        console.error("classify err", e)
      );
    }
  };

  if (!isStream || !upstream.body) {
    const text = await upstream.text();
    let usage: CapturedUsage = {};
    let parseOk = true;
    try {
      const data = JSON.parse(text);
      if (data?.usage) usage = data.usage;
    } catch {
      parseOk = false;
    }
    void persist(
      usage,
      upstream.status,
      parseOk ? undefined : "non-JSON response"
    );
    return new Response(text, {
      status: upstream.status,
      headers: {
        "content-type":
          upstream.headers.get("content-type") ?? "application/json",
      },
    });
  }

  const captured: CapturedUsage = {};
  const decoder = new TextDecoder();
  let buffer = "";

  const transform = new TransformStream<Uint8Array, Uint8Array>({
    transform(chunk, controller) {
      controller.enqueue(chunk);
      buffer += decoder.decode(chunk, { stream: true });
      let idx;
      while ((idx = buffer.indexOf("\n\n")) !== -1) {
        const event = buffer.slice(0, idx);
        buffer = buffer.slice(idx + 2);
        for (const line of event.split("\n")) {
          if (!line.startsWith("data:")) continue;
          const data = line.slice(5).trim();
          if (!data || data === "[DONE]") continue;
          try {
            const parsed = JSON.parse(data);
            if (parsed.type === "message_start" && parsed.message?.usage) {
              const u = parsed.message.usage;
              captured.input_tokens = u.input_tokens ?? captured.input_tokens;
              captured.output_tokens = u.output_tokens ?? captured.output_tokens;
              captured.cache_read_input_tokens =
                u.cache_read_input_tokens ?? captured.cache_read_input_tokens;
              captured.cache_creation_input_tokens =
                u.cache_creation_input_tokens ??
                captured.cache_creation_input_tokens;
            } else if (parsed.type === "message_delta" && parsed.usage) {
              const u = parsed.usage;
              if (typeof u.output_tokens === "number")
                captured.output_tokens = u.output_tokens;
              if (typeof u.input_tokens === "number")
                captured.input_tokens = u.input_tokens;
            }
          } catch {
          }
        }
      }
    },
    flush() {
      void persist(captured, upstream.status);
    },
  });

  return new Response(upstream.body.pipeThrough(transform), {
    status: upstream.status,
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache",
      connection: "keep-alive",
    },
  });
}
