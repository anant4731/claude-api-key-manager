import { randomUUID } from "node:crypto";
import { db } from "./db";
import { apiKeys, requests, type ApiKey } from "./db/schema";
import { eq, desc, sql, and, gte } from "drizzle-orm";
import { encrypt } from "./crypto";
import { updateApiKey as updateAdminKey } from "./anthropic-admin";
import { getActiveAdminKey } from "./accounts";
import { analyzeNameClarity } from "./purpose-clarity";

export type KeyWithStats = ApiKey & {
  stats: KeyStats;
};

export type KeyStats = {
  totalCostCents: number;
  totalTokens: number;
  onPurposeCostCents: number;
  offPurposeCostCents: number;
  pendingCostCents: number;
  onPurposePct: number;
  offPurposePct: number;
  pendingPct: number;
  requestCount: number;
  lastRequestAt: string | null;
  monthToDateCostCents: number;
  monthStartIso: string;
};

export function getMonthStartIso(now = new Date()): string {
  const d = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0)
  );
  return d.toISOString();
}

function emptyStats(): KeyStats {
  return {
    totalCostCents: 0,
    totalTokens: 0,
    onPurposeCostCents: 0,
    offPurposeCostCents: 0,
    pendingCostCents: 0,
    onPurposePct: 100,
    offPurposePct: 0,
    pendingPct: 0,
    requestCount: 0,
    lastRequestAt: null,
    monthToDateCostCents: 0,
    monthStartIso: getMonthStartIso(),
  };
}

export async function getKeyStats(apiKeyId: string): Promise<KeyStats> {
  const monthStart = getMonthStartIso();

  const [classRows, mtdRow] = await Promise.all([
    db()
      .select({
        classification: requests.classification,
        cost: sql<number>`COALESCE(SUM(${requests.costCents}), 0)`.as("cost"),
        tokens: sql<number>`COALESCE(SUM(${requests.inputTokens} + ${requests.outputTokens} + ${requests.cacheReadTokens} + ${requests.cacheWriteTokens}), 0)`.as(
          "tokens"
        ),
        count: sql<number>`COUNT(*)`.as("count"),
        last: sql<string | null>`MAX(${requests.timestamp})`.as("last"),
      })
      .from(requests)
      .where(eq(requests.apiKeyId, apiKeyId))
      .groupBy(requests.classification),
    db()
      .select({
        cost: sql<number>`COALESCE(SUM(${requests.costCents}), 0)`.as("cost"),
      })
      .from(requests)
      .where(
        and(
          eq(requests.apiKeyId, apiKeyId),
          gte(requests.timestamp, monthStart)
        )
      ),
  ]);

  const stats = emptyStats();
  stats.monthToDateCostCents = mtdRow[0]?.cost ?? 0;

  if (classRows.length === 0) return stats;

  stats.onPurposePct = 0;
  for (const r of classRows) {
    stats.totalCostCents += r.cost;
    stats.totalTokens += r.tokens;
    stats.requestCount += r.count;
    if (r.last && (!stats.lastRequestAt || r.last > stats.lastRequestAt)) {
      stats.lastRequestAt = r.last;
    }
    if (r.classification === "on_purpose") stats.onPurposeCostCents = r.cost;
    else if (r.classification === "off_purpose") stats.offPurposeCostCents = r.cost;
    else stats.pendingCostCents += r.cost;
  }

  const denom = stats.totalCostCents || 1;
  stats.onPurposePct = (stats.onPurposeCostCents / denom) * 100;
  stats.offPurposePct = (stats.offPurposeCostCents / denom) * 100;
  stats.pendingPct = (stats.pendingCostCents / denom) * 100;

  return stats;
}

export async function listKeys(): Promise<KeyWithStats[]> {
  const keys = await db().select().from(apiKeys).orderBy(desc(apiKeys.createdAt));
  const out = await Promise.all(
    keys.map(async (k) => ({ ...k, stats: await getKeyStats(k.id) }))
  );
  return out;
}

export async function getKey(id: string): Promise<KeyWithStats | null> {
  const rows = await db().select().from(apiKeys).where(eq(apiKeys.id, id));
  const k = rows[0];
  if (!k) return null;
  return { ...k, stats: await getKeyStats(k.id) };
}

export async function getKeyByProxyToken(token: string): Promise<ApiKey | null> {
  const rows = await db()
    .select()
    .from(apiKeys)
    .where(eq(apiKeys.proxyToken, token));
  return rows[0] ?? null;
}

export async function enableProxy(
  id: string,
  rawKey: string
): Promise<void> {
  const k = rawKey.trim();
  if (!k.startsWith("sk-ant-api")) {
    throw new Error("This should be a regular API key starting with 'sk-ant-api…'.");
  }
  const rows = await db().select().from(apiKeys).where(eq(apiKeys.id, id));
  const existing = rows[0];
  if (!existing) throw new Error("Key not found");

  if (existing.partialKeyHint) {
    const prefix = existing.partialKeyHint.split("…")[0];
    if (prefix && !k.startsWith(prefix.slice(0, 12))) {
      throw new Error(
        `That secret doesn't match this key's hint (${existing.partialKeyHint}). Did you paste the value for a different key?`
      );
    }
  }

  await db()
    .update(apiKeys)
    .set({ encryptedKey: encrypt(k) })
    .where(eq(apiKeys.id, id));
}

export async function disableProxy(id: string): Promise<void> {
  await db()
    .update(apiKeys)
    .set({ encryptedKey: null })
    .where(eq(apiKeys.id, id));
}

export async function syncKeyStatusToAnthropic(
  id: string,
  status: "active" | "inactive"
) {
  const rows = await db().select().from(apiKeys).where(eq(apiKeys.id, id));
  const k = rows[0];
  if (!k) throw new Error("Key not found");

  if (k.anthropicKeyId) {
    const adminKey = await getActiveAdminKey();
    if (adminKey) {
      await updateAdminKey(adminKey, k.anthropicKeyId, { status });
    }
  }
  await db().update(apiKeys).set({ status }).where(eq(apiKeys.id, id));
}

function partialHint(raw: string) {
  if (raw.length <= 12) return raw;
  return `${raw.slice(0, 10)}…${raw.slice(-4)}`;
}

export type ManualKeyInput = {
  name: string;
  rawKey: string;
  monthlyBudgetCents: number;
};

export async function registerManualKey(input: ManualKeyInput): Promise<ApiKey> {
  const name = input.name.trim();
  const raw = input.rawKey.trim();
  if (!name) throw new Error("Name is required.");
  if (!raw.startsWith("sk-ant-api")) {
    throw new Error(
      "Paste a regular API key starting with 'sk-ant-api…' (not an admin key)."
    );
  }
  if (
    !Number.isFinite(input.monthlyBudgetCents) ||
    input.monthlyBudgetCents < 1
  ) {
    throw new Error("Monthly budget must be at least $0.01.");
  }


  const dupes = await db()
    .select({ id: apiKeys.id })
    .from(apiKeys)
    .where(eq(apiKeys.partialKeyHint, partialHint(raw)));
  if (dupes.length > 0) {
    throw new Error(
      "A key with this secret is already registered. Open it from the keys list."
    );
  }

  const clarity = analyzeNameClarity(name);
  const id = randomUUID();
  const now = new Date().toISOString();

  await db().insert(apiKeys).values({
    id,
    accountId: null,
    anthropicKeyId: null,
    name,
    workspaceId: null,
    status: "active",
    partialKeyHint: partialHint(raw),
    encryptedKey: encrypt(raw),
    proxyToken: `prx-${randomUUID().replace(/-/g, "")}`,
    purposeClarity: clarity.clarity,
    purposeClarityReason: clarity.reason,
    purposeClarityCheckedFor: name,
    monthlyBudgetCents: Math.round(input.monthlyBudgetCents),
    createdAt: now,
    syncedAt: null,
  });

  const rows = await db().select().from(apiKeys).where(eq(apiKeys.id, id));
  return rows[0];
}

export async function updateKeyBudget(id: string, monthlyBudgetCents: number) {
  if (!Number.isFinite(monthlyBudgetCents) || monthlyBudgetCents < 1) {
    throw new Error("Monthly budget must be at least $0.01.");
  }
  await db()
    .update(apiKeys)
    .set({ monthlyBudgetCents: Math.round(monthlyBudgetCents) })
    .where(eq(apiKeys.id, id));
}

export async function deleteKey(id: string): Promise<void> {
  await db().delete(apiKeys).where(eq(apiKeys.id, id));
}

export async function renameManualKey(id: string, name: string): Promise<void> {
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Name cannot be empty.");
  const clarity = analyzeNameClarity(trimmed);
  await db()
    .update(apiKeys)
    .set({
      name: trimmed,
      purposeClarity: clarity.clarity,
      purposeClarityReason: clarity.reason,
      purposeClarityCheckedFor: trimmed,
    })
    .where(eq(apiKeys.id, id));
}

export async function listRecentRequests(apiKeyId: string, limit = 20) {
  return db()
    .select()
    .from(requests)
    .where(eq(requests.apiKeyId, apiKeyId))
    .orderBy(desc(requests.timestamp))
    .limit(limit);
}

export async function getDailySeries(
  apiKeyId: string,
  days = 14
): Promise<{ date: string; cost: number; tokens: number }[]> {
  const since = new Date();
  since.setUTCDate(since.getUTCDate() - days);
  const sinceIso = since.toISOString();

  const rows = await db()
    .select({
      date: sql<string>`substr(${requests.timestamp}, 1, 10)`.as("date"),
      cost: sql<number>`COALESCE(SUM(${requests.costCents}), 0)`.as("cost"),
      tokens: sql<number>`COALESCE(SUM(${requests.inputTokens} + ${requests.outputTokens} + ${requests.cacheReadTokens} + ${requests.cacheWriteTokens}), 0)`.as(
        "tokens"
      ),
    })
    .from(requests)
    .where(and(eq(requests.apiKeyId, apiKeyId), gte(requests.timestamp, sinceIso)))
    .groupBy(sql`substr(${requests.timestamp}, 1, 10)`)
    .orderBy(sql`substr(${requests.timestamp}, 1, 10)`);

  return rows;
}
