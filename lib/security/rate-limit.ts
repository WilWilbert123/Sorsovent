/**
 * Sliding-window in-memory rate limiter for API routes and Server Actions.
 * Protects authentication, post/comment/event creation, push notifications, and uploads.
 */

interface RateLimitEntry {
  timestamps: number[];
}

const store = new Map<string, RateLimitEntry>();
let lastCleanup = Date.now();

function cleanupExpired(now: number, maxWindowMs: number) {
  if (now - lastCleanup < 60_000) return;
  lastCleanup = now;
  for (const [key, entry] of store.entries()) {
    const valid = entry.timestamps.filter((t) => now - t < maxWindowMs);
    if (valid.length === 0) {
      store.delete(key);
    } else {
      entry.timestamps = valid;
    }
  }
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now();
  cleanupExpired(now, Math.max(windowMs, 300_000));

  const existing = store.get(key) || { timestamps: [] };
  const validTimestamps = existing.timestamps.filter((t) => now - t < windowMs);

  if (validTimestamps.length >= limit) {
    const oldest = validTimestamps[0] || now;
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((oldest + windowMs - now) / 1000)
    );
    store.set(key, { timestamps: validTimestamps });
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds,
    };
  }

  validTimestamps.push(now);
  store.set(key, { timestamps: validTimestamps });

  return {
    allowed: true,
    remaining: Math.max(0, limit - validTimestamps.length),
    retryAfterSeconds: 0,
  };
}

export function getClientIp(request?: Request | null): string {
  if (!request) return "unknown";
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || "unknown";
  }
  return request.headers.get("x-real-ip") || "unknown";
}

