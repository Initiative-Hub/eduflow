import { redis } from '@/lib/redis/client';

export class CacheService {
  static async getCache<T>(key: string): Promise<T | null> {
    const cachedValue = await redis.get(key);

    if (!cachedValue) {
      return null;
    }

    return JSON.parse(cachedValue) as T;
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
      await redis.set(key, payload, { EX: options.ttlSeconds });
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
    const MAX_PROMPTS = 10;
    const cacheKey = `guest_usage:${guestSessionId}`;

    try {
      const rawUsage = await redis.get(cacheKey);
      const currentUsage = Number(rawUsage ?? 0);

      if (!rawUsage || currentUsage <= 0) {
        await redis.set(cacheKey, '1', { EX: 86400 });
        return { allowed: true, remaining: MAX_PROMPTS - 1 };
      }

      if (currentUsage >= MAX_PROMPTS) {
        return {
          allowed: false,
          message: 'Limit reached. Please register to unlock full features.',
          remaining: 0,
        };
      }

      const nextUsage = await redis.incr(cacheKey);

      return { allowed: true, remaining: MAX_PROMPTS - nextUsage };
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
