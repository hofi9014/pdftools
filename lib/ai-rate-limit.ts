const DAILY_WINDOW_MS = 24 * 60 * 60 * 1000;
const DAILY_LIMIT = 15;
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

export function checkAiRateLimit(clientIp: string): { allowed: boolean; remaining: number; resetAt: number } {
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
