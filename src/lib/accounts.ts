import { randomUUID } from "node:crypto";
import { db } from "./db";
import { accounts, type Account } from "./db/schema";
import { eq } from "drizzle-orm";
import { encrypt, decrypt } from "./crypto";
import { getOrganization, AdminApiError } from "./anthropic-admin";

export async function getActiveAccount(): Promise<Account | null> {
  const rows = await db().select().from(accounts).limit(1);
  return rows[0] ?? null;
}

export async function getActiveAdminKey(): Promise<string | null> {
  const acc = await getActiveAccount();
  if (!acc) return null;
  try {
    return decrypt(acc.encryptedAdminKey);
  } catch (e) {
    console.error("[keymaster] Failed to decrypt admin key — encryption key changed?", e);
    return null;
  }
}

export async function requireAdminKey(): Promise<string> {
  const key = await getActiveAdminKey();
  if (!key) throw new Error("No account connected");
  return key;
}

function partial(raw: string) {
  if (raw.length <= 16) return raw;
  return `${raw.slice(0, 14)}…${raw.slice(-4)}`;
}

export async function connectAccount(rawAdminKey: string): Promise<Account> {
  const k = rawAdminKey.trim();
  if (!k.startsWith("sk-ant-admin")) {
    throw new Error("Admin keys start with 'sk-ant-admin'. Generate one at platform.claude.com/settings/admin-keys (requires an organization, not an individual account).");
  }

  let org: { id: string; name: string };
  try {
    const resp = await getOrganization(k);
    org = { id: resp.id, name: resp.name };
  } catch (e) {
    if (e instanceof AdminApiError && e.status === 401) {
      throw new Error("Anthropic rejected that admin key. Double-check the value, and that your account is an organization (Console → Settings → Organization).");
    }
    throw e instanceof Error ? e : new Error(String(e));
  }


  const existing = await getActiveAccount();
  if (existing) {
    await db().delete(accounts).where(eq(accounts.id, existing.id));
  }

  const row: Account = {
    id: randomUUID(),
    encryptedAdminKey: encrypt(k),
    partialAdminKeyHint: partial(k),
    orgId: org.id,
    orgName: org.name,
    connectedAt: new Date().toISOString(),
    lastSyncedAt: null,
  };
  await db().insert(accounts).values(row);
  return row;
}

export async function disconnectAccount(): Promise<void> {
  const acc = await getActiveAccount();
  if (acc) await db().delete(accounts).where(eq(accounts.id, acc.id));
}

export async function markSynced(accountId: string) {
  await db()
    .update(accounts)
    .set({ lastSyncedAt: new Date().toISOString() })
    .where(eq(accounts.id, accountId));
}
