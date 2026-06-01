import { db, ensureDbReady } from "./db";
import { apiKeyAssignments, apiKeys, requests, type ApiKey } from "./db/schema";
import { and, desc, eq, gte, inArray, sql } from "drizzle-orm";
import { getKeyStats, getMonthStartIso, type KeyStats } from "./keys";

export type UserKeyWithStats = ApiKey & { stats: KeyStats };

export async function listKeysForUserWithStats(
  userId: string
): Promise<UserKeyWithStats[]> {
  await ensureDbReady();
  const rows = await db()
    .select({ k: apiKeys })
    .from(apiKeyAssignments)
    .innerJoin(apiKeys, eq(apiKeys.id, apiKeyAssignments.apiKeyId))
    .where(eq(apiKeyAssignments.userId, userId))
    .orderBy(desc(apiKeys.createdAt));
  const keys = rows.map((r) => r.k);
  return Promise.all(
    keys.map(async (k) => ({ ...k, stats: await getKeyStats(k.id) }))
  );
}

export type UserAggregateStats = {
  totalCostCents: number;
  totalTokens: number;
  onPurposeCostCents: number;
  offPurposeCostCents: number;
  pendingCostCents: number;
  monthToDateCostCents: number;
  monthlyBudgetCents: number;
  requestCount: number;
  keyCount: number;
};

export function aggregateUserStats(
  keys: UserKeyWithStats[]
): UserAggregateStats {
  const out: UserAggregateStats = {
    totalCostCents: 0,
    totalTokens: 0,
    onPurposeCostCents: 0,
    offPurposeCostCents: 0,
    pendingCostCents: 0,
    monthToDateCostCents: 0,
    monthlyBudgetCents: 0,
    requestCount: 0,
    keyCount: keys.length,
  };
  for (const k of keys) {
    out.totalCostCents += k.stats.totalCostCents;
    out.totalTokens += k.stats.totalTokens;
    out.onPurposeCostCents += k.stats.onPurposeCostCents;
    out.offPurposeCostCents += k.stats.offPurposeCostCents;
    out.pendingCostCents += k.stats.pendingCostCents;
    out.monthToDateCostCents += k.stats.monthToDateCostCents;
    out.monthlyBudgetCents += k.monthlyBudgetCents;
    out.requestCount += k.stats.requestCount;
  }
  return out;
}

export async function listRecentRequestsForUser(userId: string, limit = 25) {
  await ensureDbReady();
  const keyIdRows = await db()
    .select({ id: apiKeyAssignments.apiKeyId })
    .from(apiKeyAssignments)
    .where(eq(apiKeyAssignments.userId, userId));
  const keyIds = keyIdRows.map((r) => r.id);
  if (keyIds.length === 0) return [];
  return db()
    .select({
      request: requests,
      keyName: apiKeys.name,
      keyId: apiKeys.id,
    })
    .from(requests)
    .innerJoin(apiKeys, eq(apiKeys.id, requests.apiKeyId))
    .where(inArray(requests.apiKeyId, keyIds))
    .orderBy(desc(requests.timestamp))
    .limit(limit);
}

export async function getDailySeriesForUser(
  userId: string,
  days = 14
): Promise<{ date: string; cost: number; tokens: number }[]> {
  await ensureDbReady();
  const keyIdRows = await db()
    .select({ id: apiKeyAssignments.apiKeyId })
    .from(apiKeyAssignments)
    .where(eq(apiKeyAssignments.userId, userId));
  const keyIds = keyIdRows.map((r) => r.id);
  if (keyIds.length === 0) return [];

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
    .where(
      and(
        inArray(requests.apiKeyId, keyIds),
        gte(requests.timestamp, sinceIso)
      )
    )
    .groupBy(sql`substr(${requests.timestamp}, 1, 10)`)
    .orderBy(sql`substr(${requests.timestamp}, 1, 10)`);

  return rows;
}

export function monthStart(): string {
  return getMonthStartIso();
}
