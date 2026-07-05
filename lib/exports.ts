import { randomUUID } from 'crypto';
import { createHmac, timingSafeEqual } from 'crypto';

const TTL_MS = 5 * 60 * 1000; // 5 minutes
const HMAC_ALGO = 'sha256';

// Rate limiting: fixed window per IP
const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute
const RATE_LIMIT_MAX = 10; // max 10 requests per window
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();
let rateLimitCleanupTimer: ReturnType<typeof setInterval> | null = null;
function ensureRateLimitCleanup() {
  if (rateLimitCleanupTimer) return;
  rateLimitCleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, val] of rateLimitStore) {
      if (now > val.resetAt) rateLimitStore.delete(key);
    }
    if (rateLimitStore.size === 0 && rateLimitCleanupTimer) {
      clearInterval(rateLimitCleanupTimer);
      rateLimitCleanupTimer = null;
    }
  }, RATE_LIMIT_WINDOW_MS);
}

export function checkRateLimit(clientIp: string): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const entry = rateLimitStore.get(clientIp);
  if (!entry || now > entry.resetAt) {
    rateLimitStore.set(clientIp, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    ensureRateLimitCleanup();
    return { allowed: true, remaining: RATE_LIMIT_MAX - 1, resetAt: now + RATE_LIMIT_WINDOW_MS };
  }
  entry.count++;
  if (entry.count > RATE_LIMIT_MAX) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }
  return { allowed: true, remaining: RATE_LIMIT_MAX - entry.count, resetAt: entry.resetAt };
}

interface StoredFile {
  buffer: Buffer;
  contentType: string;
  fileName: string;
  expiresAt: number;
  consumed: boolean;
}

const store = new Map<string, StoredFile>();

// Cleanup expired entries periodically
const CLEANUP_INTERVAL = 60_000;
let cleanupTimer: ReturnType<typeof setInterval> | null = null;
function ensureCleanup() {
  if (cleanupTimer) return;
  cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, val] of store) {
      if (now > val.expiresAt || val.consumed) store.delete(key);
    }
    if (store.size === 0 && cleanupTimer) {
      clearInterval(cleanupTimer);
      cleanupTimer = null;
    }
  }, CLEANUP_INTERVAL);
}

export function getHmacSecret(): string {
  return process.env.EXPORT_LINK_HMAC_SECRET || '';
}

export function storeFile(buffer: Buffer, contentType: string, fileName: string): string {
  const id = randomUUID();
  const expiresAt = Date.now() + TTL_MS;
  store.set(id, { buffer, contentType, fileName, expiresAt, consumed: false });
  ensureCleanup();
  return id;
}

export function signExportUrl(id: string): string {
  const secret = getHmacSecret();
  const expiry = Date.now() + TTL_MS;
  const payload = `${id}:${expiry}`;
  const hmac = createHmac(HMAC_ALGO, secret).update(payload).digest('hex');
  return `${id}?expiry=${expiry}&hmac=${hmac}`;
}

export function verifyAndConsume(id: string, expiry: string, hmac: string): StoredFile | null {
  const secret = getHmacSecret();
  if (!secret) return null;

  // Verify HMAC
  const payload = `${id}:${expiry}`;
  const expected = createHmac(HMAC_ALGO, secret).update(payload).digest('hex');
  if (expected.length !== hmac.length) return null;
  try {
    if (!timingSafeEqual(Buffer.from(expected), Buffer.from(hmac))) return null;
  } catch { return null; }

  // Check TTL
  const expiryNum = parseInt(expiry, 10);
  if (isNaN(expiryNum) || Date.now() > expiryNum) return null;

  // Retrieve and consume
  const entry = store.get(id);
  if (!entry || entry.consumed) return null;
  entry.consumed = true;
  return entry;
}
