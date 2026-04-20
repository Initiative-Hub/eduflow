import { Ratelimit } from '@upstash/ratelimit';
import { getUpstashRestRedisClient } from '@/lib/upstash/redis/client';

const redis = getUpstashRestRedisClient();
const guestRatelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, '24 h'),
  analytics: false,
});

export class CacheService {
  static async getCache<T>(key: string): Promise<T | null> {
    const cachedValue = await redis.get<T>(key);

    if (!cachedValue) {
      return null;
    }

    return cachedValue;
  }

  static async setCache<T>(
    key: string,
    value: T,
    options?: { ttlSeconds?: number; reset?: boolean }
  ) {
    if (options?.reset) {
      await redis.del(key);
    }

    const payload = JSON.stringify(value);

    if (options?.ttlSeconds) {
      await redis.set(key, payload, { ex: options.ttlSeconds });
      return;
    }

    await redis.set(key, payload);
  }

  static async deleteCache(key: string) {
    return redis.del(key);
  }

  static async refreshCache<T>(key: string, value: T, ttlSeconds?: number) {
    await redis.del(key);
    await CacheService.setCache(key, value, { ttlSeconds });
  }

  /**
   * Checks the rate limit for a guest session.
   * Max 10 prompts per 24 hours.
   */
  static async checkGuestLimit(guestSessionId: string) {
    try {
      const cacheKey = `guest_usage:${guestSessionId}`;
      const result = await guestRatelimit.limit(cacheKey);

      if (!result.success) {
        return {
          allowed: false,
          message: 'Limit reached. Please register to unlock full features.',
          remaining: 0,
        };
      }

      return { allowed: true, remaining: result.remaining };
    } catch (error) {
      console.error('Redis error checking limit:', error);
      return {
        allowed: false,
        message: 'Service temporarily unavailable.',
        remaining: 0,
      };
    }
  }
}
