import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  createHash,
} from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { dirname } from "node:path";

const FALLBACK_KEY_PATH = ".data/.encryption-key";

let cachedKey: Buffer | null = null;

function resolveKey(): Buffer {
  if (cachedKey) return cachedKey;

  const fromEnv = process.env.ENCRYPTION_KEY?.trim();
  if (fromEnv) {
    cachedKey = decodeKey(fromEnv);
    return cachedKey;
  }

  if (existsSync(FALLBACK_KEY_PATH)) {
    const raw = readFileSync(FALLBACK_KEY_PATH, "utf8").trim();
    cachedKey = decodeKey(raw);
    return cachedKey;
  }

  const key = randomBytes(32);
  try {
    mkdirSync(dirname(FALLBACK_KEY_PATH), { recursive: true });
    writeFileSync(FALLBACK_KEY_PATH, key.toString("base64"), {
      mode: 0o600,
    });
    console.warn(
      `[keymaster] Generated a new encryption key at ${FALLBACK_KEY_PATH}. Back it up — losing it makes stored credentials unrecoverable.`
    );
  } catch (e) {
    console.warn(
      "[keymaster] Could not persist encryption key to disk; using ephemeral in-memory key:",
      e
    );
  }
  cachedKey = key;
  return cachedKey;
}

function decodeKey(raw: string): Buffer {
  const buf = Buffer.from(raw, "base64");
  return buf.length === 32 ? buf : createHash("sha256").update(raw).digest();
}

export function encrypt(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", resolveKey(), iv);
  const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString("base64");
}

export function decrypt(ciphertext: string): string {
  const buf = Buffer.from(ciphertext, "base64");
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const enc = buf.subarray(28);
  const decipher = createDecipheriv("aes-256-gcm", resolveKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString(
    "utf8"
  );
}

export function maskKey(plaintext: string): string {
  if (plaintext.length <= 12) return "•".repeat(plaintext.length);
  return `${plaintext.slice(0, 10)}…${plaintext.slice(-4)}`;
}
