import Anthropic from "@anthropic-ai/sdk";
import { db } from "./db";
import { apiKeys, requests } from "./db/schema";
import { eq } from "drizzle-orm";
import { decrypt } from "./crypto";
import { env } from "./env";

const SYSTEM = `You are an auditor. You will be given:
  1. The PURPOSE of an API key (taken directly from its display name set in the Anthropic Console).
  2. A short excerpt from a request made using that key.
Decide whether the request appears to be in service of the stated purpose, or is being used for some other purpose.
Reply with strict JSON only: {"on_purpose": true|false, "reason": "one sentence"}.
If the excerpt is too vague to judge, default to on_purpose=true with reason "insufficient signal".`;

export async function classifyRequest(requestId: string) {
  const rows = await db()
    .select({ r: requests, k: apiKeys })
    .from(requests)
    .innerJoin(apiKeys, eq(requests.apiKeyId, apiKeys.id))
    .where(eq(requests.id, requestId));
  const row = rows[0];
  if (!row) return;
  const { r, k } = row;
  if (r.classification !== "pending") return;

  if (k.purposeClarity !== "clear") {
    await db()
      .update(requests)
      .set({
        classification: "on_purpose",
        classificationReason:
          k.purposeClarity === "unclear"
            ? "purpose unclear — rename the key in Console to enable classification"
            : "purpose unknown — sync the key to evaluate clarity",
      })
      .where(eq(requests.id, requestId));
    return;
  }

  if (!k.encryptedKey) {
    await db()
      .update(requests)
      .set({
        classification: "on_purpose",
        classificationReason: "cannot classify without stored key",
      })
      .where(eq(requests.id, requestId));
    return;
  }

  try {
    const client = new Anthropic({ apiKey: decrypt(k.encryptedKey) });
    const resp = await client.messages.create({
      model: env().CLASSIFIER_MODEL,
      max_tokens: 200,
      system: SYSTEM,
      messages: [
        {
          role: "user",
          content: `PURPOSE: ${k.name}\n\nREQUEST EXCERPT:\n${r.promptExcerpt.slice(0, 2000)}`,
        },
      ],
    });
    const text =
      resp.content
        .filter((b): b is Anthropic.TextBlock => b.type === "text")
        .map((b) => b.text)
        .join("")
        .trim() ?? "";
    const parsed = parseJson(text);
    await db()
      .update(requests)
      .set({
        classification: parsed.on_purpose ? "on_purpose" : "off_purpose",
        classificationReason: parsed.reason.slice(0, 240),
      })
      .where(eq(requests.id, requestId));
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await db()
      .update(requests)
      .set({
        classification: "failed",
        classificationReason: `classifier error: ${msg.slice(0, 200)}`,
      })
      .where(eq(requests.id, requestId));
  }
}

function parseJson(text: string): { on_purpose: boolean; reason: string } {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return { on_purpose: true, reason: "could not parse response" };
  try {
    const obj = JSON.parse(match[0]);
    return {
      on_purpose: Boolean(obj.on_purpose),
      reason: String(obj.reason ?? ""),
    };
  } catch {
    return { on_purpose: true, reason: "could not parse response" };
  }
}
