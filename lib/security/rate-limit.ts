import { Redis } from "@upstash/redis";
import { logger } from "@/lib/logger";

/**
 * Serverless-compatible rate limiting using Upstash Redis.
 *
 * In-memory Map-based rate limiting does not work on Vercel because
 * each serverless invocation may run on a different container with
 * isolated memory. Redis provides a shared state across all instances.
 */

let redisClient: Redis | null = null;

function getRedisClient(): Redis {
  if (redisClient) {
    return redisClient;
  }

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    // Fallback: warn once but don't throw. In development without Redis,
    // rate limiting is effectively disabled (every request is allowed).
    // In production, this should be a hard error.
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN must be set in production"
      );
    }
    logger.warn(
      "Redis not configured — rate limiting is disabled. Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN."
    );
    // Return a no-op Redis client that allows everything
    return new Proxy({} as Redis, {
      get() {
        return async () => null;
      },
    });
  }

  redisClient = new Redis({ url, token });
  return redisClient;
}

export function resetRedisClient(): void {
  redisClient = null;
}

export async function checkRateLimit(
  key: string,
  options: { limit: number; windowMs: number }
): Promise<{
  allowed: boolean;
  remaining: number;
  resetAt: number;
}> {
  const redis = getRedisClient();
  const now = Date.now();
  const windowKey = `ratelimit:${key}`;
  const windowExpiry = Math.ceil(options.windowMs / 1000);

  try {
    // Increment the counter for this key, creating it if it doesn't exist
    const currentCount = await redis.incr(windowKey);

    // Set expiry only on the first request in the window
    if (currentCount === 1) {
      await redis.expire(windowKey, windowExpiry);
    }

    // Get remaining TTL to compute resetAt
    const ttl = await redis.ttl(windowKey);
    const resetAt = now + (ttl > 0 ? ttl * 1000 : options.windowMs);

    if (currentCount > options.limit) {
      return {
        allowed: false,
        remaining: 0,
        resetAt,
      };
    }

    return {
      allowed: true,
      remaining: Math.max(options.limit - currentCount, 0),
      resetAt,
    };
  } catch (error) {
    logger.error({ err: error, key }, "Redis rate limit check failed");
    // Fail-open: if Redis is down, allow the request but log the failure
    return {
      allowed: true,
      remaining: 1,
      resetAt: now + options.windowMs,
    };
  }
}
