import { Redis } from '@upstash/redis';

// A per-key request counter over a fixed window that is shared by every server instance.
//
// proxy.ts keeps its own counter in the memory of ONE instance, so under load (several
// instances) the real per-IP allowance is that limit times the number of instances, and it
// resets whenever an instance is recycled. /api/ai already has a durable daily limit
// (lib/ai-rate-limit.ts); /api/url-to-pdf — a server-side fetch of an arbitrary address — had
// only the in-memory one. This is the durable counterpart for it.
//
// Same Upstash database and the same Vercel-injected variable names as lib/ai-rate-limit.ts.
// A Redis outage falls back to an in-memory counter: weaker, but never an open door.

export interface WindowStore {
  /** Count one more request under `key`; returns the new count and the seconds left in the window. */
  hit(key: string, windowSeconds: number): Promise<{ count: number; ttlSeconds: number }>;
}

export interface WindowLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

export function createMemoryWindowStore(now: () => number = Date.now): WindowStore {
  const store = new Map<string, { count: number; resetAt: number }>();
  let hits = 0;
  return {
    async hit(key, windowSeconds) {
      const t = now();
      // Swept on volume, not on a timer (same reasoning as proxy.ts's rateMap).
      if (++hits % 500 === 0) for (const [k, v] of store) if (t > v.resetAt) store.delete(k);
      const entry = store.get(key);
      if (!entry || t > entry.resetAt) {
        store.set(key, { count: 1, resetAt: t + windowSeconds * 1000 });
        return { count: 1, ttlSeconds: windowSeconds };
      }
      entry.count++;
      return { count: entry.count, ttlSeconds: Math.max(1, Math.ceil((entry.resetAt - t) / 1000)) };
    },
  };
}

export function createRedisWindowStore(redis: Pick<Redis, 'pipeline' | 'expire'>): WindowStore {
  return {
    async hit(key, windowSeconds) {
      const pipeline = redis.pipeline();
      pipeline.incr(key);
      pipeline.ttl(key);
      const [count, ttl] = await pipeline.exec<[number, number]>();
      // The window starts with the first request; also repair a key left without an expiry.
      if (count === 1 || ttl < 0) await redis.expire(key, windowSeconds);
      return { count, ttlSeconds: ttl < 0 ? windowSeconds : ttl };
    },
  };
}

const UPSTASH_REDIS_URL = process.env.UPSTASH_REDIS_KV_REST_API_URL;
const UPSTASH_REDIS_TOKEN = process.env.UPSTASH_REDIS_KV_REST_API_TOKEN;
let defaultStore: WindowStore | null = null;
const fallbackStore = createMemoryWindowStore();

function getDefaultStore(): WindowStore {
  if (!defaultStore) {
    defaultStore = UPSTASH_REDIS_URL && UPSTASH_REDIS_TOKEN
      ? createRedisWindowStore(new Redis({ url: UPSTASH_REDIS_URL, token: UPSTASH_REDIS_TOKEN }))
      : fallbackStore;
  }
  return defaultStore;
}

export async function checkWindowLimit(opts: {
  /** Namespace, e.g. "url2pdf" — keeps this counter apart from every other one. */
  name: string;
  key: string;
  limit: number;
  windowSeconds: number;
  store?: WindowStore;
  fallback?: WindowStore;
}): Promise<WindowLimitResult> {
  const fullKey = `wl:${opts.name}:${opts.key}`;
  let hit: { count: number; ttlSeconds: number };
  try {
    hit = await (opts.store ?? getDefaultStore()).hit(fullKey, opts.windowSeconds);
  } catch (e) {
    console.error(`[window-rate-limit] store error for ${opts.name}; falling back to in-memory:`, e);
    hit = await (opts.fallback ?? fallbackStore).hit(fullKey, opts.windowSeconds);
  }
  return {
    allowed: hit.count <= opts.limit,
    remaining: Math.max(0, opts.limit - hit.count),
    retryAfterSeconds: hit.ttlSeconds,
  };
}
