import {
  randomBytes,
  scrypt as scryptCb,
  timingSafeEqual,
  createHash,
  randomUUID,
  type ScryptOptions,
} from "node:crypto";
import { cookies } from "next/headers";
import { db, ensureDbReady } from "./db";
import { sessions, users, type User } from "./db/schema";
import { and, eq, gt, lt } from "drizzle-orm";

// Wrap node:crypto's callback-based scrypt as a Promise so we can use options.
// promisify(scrypt) doesn't pick up the options overload reliably across @types/node versions.
function scryptAsync(
  password: string | Buffer,
  salt: Buffer,
  keylen: number,
  options: ScryptOptions
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scryptCb(password, salt, keylen, options, (err, derived) => {
      if (err) reject(err);
      else resolve(derived as Buffer);
    });
  });
}

// We use Node's built-in scrypt for password hashing. It's memory-hard
// (like bcrypt) and ships with Node so we don't need a native module.
// Hash format: scrypt$N$saltHex$hashHex
const SCRYPT_COST = 16384; // N
const SCRYPT_BLOCK = 8; // r
const SCRYPT_PARALLEL = 1; // p
const HASH_LEN = 64;

export const SESSION_COOKIE = "keymaster_session";
const SESSION_TTL_DAYS = 14;

export async function hashPassword(password: string): Promise<string> {
  if (password.length < 8) {
    throw new Error("Password must be at least 8 characters.");
  }
  const salt = randomBytes(16);
  const derived = await scryptAsync(password, salt, HASH_LEN, {
    N: SCRYPT_COST,
    r: SCRYPT_BLOCK,
    p: SCRYPT_PARALLEL,
  });
  return `scrypt$${SCRYPT_COST}$${salt.toString("hex")}$${derived.toString("hex")}`;
}

export async function verifyPassword(
  password: string,
  stored: string
): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 4 || parts[0] !== "scrypt") return false;
  const cost = Number(parts[1]);
  const salt = Buffer.from(parts[2], "hex");
  const expected = Buffer.from(parts[3], "hex");
  if (!Number.isFinite(cost) || salt.length === 0 || expected.length === 0) {
    return false;
  }
  let derived: Buffer;
  try {
    derived = await scryptAsync(password, salt, expected.length, {
      N: cost,
      r: SCRYPT_BLOCK,
      p: SCRYPT_PARALLEL,
    });
  } catch {
    return false;
  }
  if (derived.length !== expected.length) return false;
  return timingSafeEqual(derived, expected);
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function generateSessionToken(): string {
  return randomBytes(32).toString("base64url");
}

export async function createSession(userId: string): Promise<string> {
  await ensureDbReady();
  const token = generateSessionToken();
  const tokenHash = hashToken(token);
  const now = new Date();
  const expires = new Date(now);
  expires.setUTCDate(expires.getUTCDate() + SESSION_TTL_DAYS);

  await db().insert(sessions).values({
    id: randomUUID(),
    userId,
    tokenHash,
    createdAt: now.toISOString(),
    expiresAt: expires.toISOString(),
  });
  return token;
}

export async function setSessionCookie(token: string) {
  const jar = await cookies();
  const expires = new Date();
  expires.setUTCDate(expires.getUTCDate() + SESSION_TTL_DAYS);
  jar.set({
    name: SESSION_COOKIE,
    value: token,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires,
  });
}

export async function clearSessionCookie() {
  const jar = await cookies();
  jar.set({
    name: SESSION_COOKIE,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

export async function getCurrentUser(): Promise<User | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  await ensureDbReady();
  const tokenHash = hashToken(token);
  const nowIso = new Date().toISOString();
  const rows = await db()
    .select({ user: users, session: sessions })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.tokenHash, tokenHash), gt(sessions.expiresAt, nowIso)))
    .limit(1);
  return rows[0]?.user ?? null;
}

export async function requireUser(): Promise<User> {
  const u = await getCurrentUser();
  if (!u) throw new Error("Not authenticated");
  return u;
}

export async function requireAdmin(): Promise<User> {
  const u = await requireUser();
  if (u.role !== "admin") throw new Error("Forbidden: admin only");
  return u;
}

export async function destroySessionByToken(token: string) {
  await ensureDbReady();
  const tokenHash = hashToken(token);
  await db().delete(sessions).where(eq(sessions.tokenHash, tokenHash));
}

export async function pruneExpiredSessions() {
  await ensureDbReady();
  const nowIso = new Date().toISOString();
  await db().delete(sessions).where(lt(sessions.expiresAt, nowIso));
}
