import { randomUUID } from "node:crypto";
import { db, ensureDbReady } from "./db";
import {
  apiKeyAssignments,
  apiKeys,
  users,
  type ApiKey,
  type User,
  type UserRole,
} from "./db/schema";
import { eq, desc, count, and } from "drizzle-orm";
import { hashPassword, verifyPassword } from "./auth";

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function validEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function hasAnyUser(): Promise<boolean> {
  await ensureDbReady();
  const rows = await db().select({ c: count() }).from(users);
  return (rows[0]?.c ?? 0) > 0;
}

export async function listUsers(): Promise<User[]> {
  await ensureDbReady();
  return db().select().from(users).orderBy(desc(users.createdAt));
}

export async function getUserById(id: string): Promise<User | null> {
  await ensureDbReady();
  const rows = await db().select().from(users).where(eq(users.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function getUserByEmail(email: string): Promise<User | null> {
  await ensureDbReady();
  const norm = normalizeEmail(email);
  const rows = await db()
    .select()
    .from(users)
    .where(eq(users.email, norm))
    .limit(1);
  return rows[0] ?? null;
}

export type CreateUserInput = {
  email: string;
  password: string;
  displayName?: string;
  role: UserRole;
  createdBy?: string | null;
};

export async function createUser(input: CreateUserInput): Promise<User> {
  await ensureDbReady();
  const email = normalizeEmail(input.email);
  if (!validEmail(email)) {
    throw new Error("Please enter a valid email address.");
  }
  if (input.role !== "admin" && input.role !== "user") {
    throw new Error("Role must be 'admin' or 'user'.");
  }
  const existing = await getUserByEmail(email);
  if (existing) {
    throw new Error("A user with that email already exists.");
  }
  const passwordHash = await hashPassword(input.password);
  const id = randomUUID();
  const now = new Date().toISOString();
  await db().insert(users).values({
    id,
    email,
    displayName: input.displayName?.trim() ?? "",
    role: input.role,
    passwordHash,
    createdAt: now,
    createdBy: input.createdBy ?? null,
    lastLoginAt: null,
  });
  const row = await getUserById(id);
  if (!row) throw new Error("User creation failed.");
  return row;
}

export async function deleteUser(id: string): Promise<void> {
  await ensureDbReady();
  const target = await getUserById(id);
  if (!target) throw new Error("User not found.");
  if (target.role === "admin") {
    const adminCount = await countAdmins();
    if (adminCount <= 1) {
      throw new Error("Cannot delete the last admin.");
    }
  }
  await db().delete(users).where(eq(users.id, id));
}

export async function countAdmins(): Promise<number> {
  await ensureDbReady();
  const rows = await db()
    .select({ c: count() })
    .from(users)
    .where(eq(users.role, "admin"));
  return rows[0]?.c ?? 0;
}

export async function changeUserRole(id: string, role: UserRole): Promise<void> {
  await ensureDbReady();
  const target = await getUserById(id);
  if (!target) throw new Error("User not found.");
  if (target.role === "admin" && role !== "admin") {
    const adminCount = await countAdmins();
    if (adminCount <= 1) {
      throw new Error("Cannot demote the last admin.");
    }
  }
  await db().update(users).set({ role }).where(eq(users.id, id));
}

export async function authenticateUser(
  email: string,
  password: string
): Promise<User | null> {
  await ensureDbReady();
  const user = await getUserByEmail(email);
  if (!user) return null;
  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) return null;
  await db()
    .update(users)
    .set({ lastLoginAt: new Date().toISOString() })
    .where(eq(users.id, user.id));
  return user;
}

export async function changePassword(
  id: string,
  newPassword: string
): Promise<void> {
  await ensureDbReady();
  const hash = await hashPassword(newPassword);
  await db().update(users).set({ passwordHash: hash }).where(eq(users.id, id));
}

// ---- Key assignments ---------------------------------------------------

export async function assignKeyToUser(
  apiKeyId: string,
  userId: string,
  assignedBy: string | null
): Promise<void> {
  await ensureDbReady();
  const now = new Date().toISOString();
  // Idempotent insert (PRIMARY KEY collision is ignored)
  try {
    await db().insert(apiKeyAssignments).values({
      apiKeyId,
      userId,
      assignedAt: now,
      assignedBy,
    });
  } catch {
    // Assignment already exists — that's fine
  }
}

export async function unassignKeyFromUser(
  apiKeyId: string,
  userId: string
): Promise<void> {
  await ensureDbReady();
  await db()
    .delete(apiKeyAssignments)
    .where(
      and(
        eq(apiKeyAssignments.apiKeyId, apiKeyId),
        eq(apiKeyAssignments.userId, userId)
      )
    );
}

export async function listKeyIdsForUser(userId: string): Promise<string[]> {
  await ensureDbReady();
  const rows = await db()
    .select({ id: apiKeyAssignments.apiKeyId })
    .from(apiKeyAssignments)
    .where(eq(apiKeyAssignments.userId, userId));
  return rows.map((r) => r.id);
}

export async function listAssigneesOfKey(apiKeyId: string): Promise<User[]> {
  await ensureDbReady();
  const rows = await db()
    .select({ u: users })
    .from(apiKeyAssignments)
    .innerJoin(users, eq(users.id, apiKeyAssignments.userId))
    .where(eq(apiKeyAssignments.apiKeyId, apiKeyId));
  return rows.map((r) => r.u);
}

export async function listKeysForUser(userId: string): Promise<ApiKey[]> {
  await ensureDbReady();
  const rows = await db()
    .select({ k: apiKeys })
    .from(apiKeyAssignments)
    .innerJoin(apiKeys, eq(apiKeys.id, apiKeyAssignments.apiKeyId))
    .where(eq(apiKeyAssignments.userId, userId))
    .orderBy(desc(apiKeys.createdAt));
  return rows.map((r) => r.k);
}
