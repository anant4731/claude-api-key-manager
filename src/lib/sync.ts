import { db } from "./db";
import { apiKeys } from "./db/schema";
import { eq } from "drizzle-orm";
import { listApiKeys } from "./anthropic-admin";
import { randomUUID } from "node:crypto";
import { getActiveAccount, markSynced } from "./accounts";
import { decrypt } from "./crypto";
import { analyzeNameClarity } from "./purpose-clarity";

export async function syncFromAnthropic() {
  const account = await getActiveAccount();
  if (!account) throw new Error("No account connected");

  const adminKey = decrypt(account.encryptedAdminKey);
  const remote = await listApiKeys(adminKey);
  const now = new Date().toISOString();

  const local = await db()
    .select()
    .from(apiKeys)
    .where(eq(apiKeys.accountId, account.id));
  const byAnthropicId = new Map(local.map((k) => [k.anthropicKeyId, k]));

  let added = 0;
  let updated = 0;

  for (const r of remote) {
    const existing = byAnthropicId.get(r.id);
    if (existing) {
      const patch: Partial<typeof apiKeys.$inferInsert> = {
        name: r.name,
        workspaceId: r.workspace_id,
        status: r.status,
        partialKeyHint: r.partial_key_hint,
        syncedAt: now,
      };

      if (existing.purposeClarityCheckedFor !== r.name) {
        const c = analyzeNameClarity(r.name);
        patch.purposeClarity = c.clarity;
        patch.purposeClarityReason = c.reason;
        patch.purposeClarityCheckedFor = r.name;
      }
      await db().update(apiKeys).set(patch).where(eq(apiKeys.id, existing.id));
      updated++;
    } else {
      const c = analyzeNameClarity(r.name);
      await db()
        .insert(apiKeys)
        .values({
          id: randomUUID(),
          accountId: account.id,
          anthropicKeyId: r.id,
          name: r.name,
          workspaceId: r.workspace_id,
          status: r.status,
          partialKeyHint: r.partial_key_hint,
          encryptedKey: null,
          proxyToken: `prx-${randomUUID().replace(/-/g, "")}`,
          purposeClarity: c.clarity,
          purposeClarityReason: c.reason,
          purposeClarityCheckedFor: r.name,
          createdAt: r.created_at,
          syncedAt: now,
        });
      added++;
    }
  }

  const remoteIds = new Set(remote.map((r) => r.id));
  for (const localKey of local) {
    if (localKey.anthropicKeyId && !remoteIds.has(localKey.anthropicKeyId)) {
      await db().delete(apiKeys).where(eq(apiKeys.id, localKey.id));
    }
  }

  await markSynced(account.id);

  return { synced: remote.length, added, updated };
}
