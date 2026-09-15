import { Redis } from '@upstash/redis';

const DAILY_WINDOW_MS = 24 * 60 * 60 * 1000;
const DAILY_WINDOW_SECONDS = 24 * 60 * 60;
const DAILY_LIMIT = 15;
const KEY_PREFIX = 'ai_rl:';

// Vercel injects the Upstash Redis vars with a `KV` segment in the middle.
// Redis.fromEnv() looks for UPSTASH_REDIS_REST_URL/UPSTASH_REDIS_REST_TOKEN,
// which are NOT present here, so the real names are passed explicitly.
const UPSTASH_REDIS_URL = process.env.UPSTASH_REDIS_KV_REST_API_URL;
const UPSTASH_REDIS_TOKEN = process.env.UPSTASH_REDIS_KV_REST_API_TOKEN;

let redisClient: Redis | null = null;

function getRedis(): Redis | null {
  if (!UPSTASH_REDIS_URL || !UPSTASH_REDIS_TOKEN) return null;
  if (!redisClient) {
    redisClient = new Redis({ url: UPSTASH_REDIS_URL, token: UPSTASH_REDIS_TOKEN });
  }
  return redisClient;
}

// In-memory fallback (kept as a private helper). Weaker than Redis, better than
// nothing: a Redis outage must never open the door to unlimited AI requests.
const store = new Map<string, { count: number; resetAt: number }>();
let cleanupTimer: ReturnType<typeof setInterval> | null = null;

function ensureCleanup() {
  if (cleanupTimer) return;
  cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, val] of store) {
      if (now > val.resetAt) store.delete(key);
    }
    if (store.size === 0 && cleanupTimer) {
      clearInterval(cleanupTimer);
      cleanupTimer = null;
    }
  }, 60_000);
}

function checkAiRateLimitInMemory(clientIp: string): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const entry = store.get(clientIp);
  if (!entry || now > entry.resetAt) {
    store.set(clientIp, { count: 1, resetAt: now + DAILY_WINDOW_MS });
    ensureCleanup();
    return { allowed: true, remaining: DAILY_LIMIT - 1, resetAt: now + DAILY_WINDOW_MS };
  }
  entry.count++;
  if (entry.count > DAILY_LIMIT) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }
  return { allowed: true, remaining: DAILY_LIMIT - entry.count, resetAt: entry.resetAt };
}

function refundAiRateLimitInMemory(clientIp: string): void {
  const entry = store.get(clientIp);
  if (!entry) return;
  entry.count = Math.max(0, entry.count - 1);
}

// QA-001: the counter increments before the OpenRouter call, so a provider-side
// failure (network error or non-2xx response) must give the token back — otherwise
// a run of provider outages burns through a user's daily quota on nothing but error
// responses. Best-effort: a failure here is logged and swallowed, never surfaced to
// the caller, since the AI-call error is already the thing being reported.
export async function refundAiRateLimit(clientIp: string): Promise<void> {
  const redis = getRedis();
  if (!redis) {
    refundAiRateLimitInMemory(clientIp);
    return;
  }
  try {
    const key = KEY_PREFIX + clientIp;
    const newCount = await redis.decr(key);
    // A burst of refunds (or a refund racing a fresh window reset) must never push
    // the counter negative — that would silently grant extra requests beyond the
    // daily limit on the next check.
    if (newCount < 0) await redis.set(key, 0, { keepTtl: true });
  } catch (e) {
    console.error('[ai-rate-limit] Upstash Redis error during refund; falling back to in-memory:', e);
    refundAiRateLimitInMemory(clientIp);
  }
}

export async function checkAiRateLimit(clientIp: string): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  const redis = getRedis();
  if (!redis) {
    console.error('[ai-rate-limit] UPSTASH_REDIS_KV_REST_API_URL/UPSTASH_REDIS_KV_REST_API_TOKEN not configured; falling back to in-memory limit');
    return checkAiRateLimitInMemory(clientIp);
  }
  try {
    const key = KEY_PREFIX + clientIp;
    const pipeline = redis.pipeline();
    pipeline.incr(key);
    pipeline.ttl(key);
    const [count, ttl] = await pipeline.exec<[number, number]>();
    // Anchor the sliding window on the first request (INCR == 1) or repair a
    // key without an expiry (should not happen, but guard anyway).
    if (count === 1 || ttl < 0) {
      await redis.expire(key, DAILY_WINDOW_SECONDS);
    }
    const effectiveTtl = ttl < 0 ? DAILY_WINDOW_SECONDS : ttl;
    const resetAt = Date.now() + effectiveTtl * 1000;
    if (count > DAILY_LIMIT) {
      return { allowed: false, remaining: 0, resetAt };
    }
    return { allowed: true, remaining: DAILY_LIMIT - count, resetAt };
  } catch (e) {
    console.error('[ai-rate-limit] Upstash Redis error; falling back to in-memory limit:', e);
    return checkAiRateLimitInMemory(clientIp);
  }
}
