import { Ratelimit } from '@upstash/ratelimit';
import { getUpstashRestRedisClient } from '@/lib/upstash/redis/client';

let _redis: ReturnType<typeof getUpstashRestRedisClient> | null = null;
let _guestRatelimit: Ratelimit | null = null;

function getRedis() {
  if (!_redis) {
    _redis = getUpstashRestRedisClient();
  }
  return _redis;
}

function getRatelimit() {
  if (!_guestRatelimit) {
    _guestRatelimit = new Ratelimit({
      redis: getRedis(),
      limiter: Ratelimit.slidingWindow(10, '24 h'),
      analytics: false,
    });
  }
  return _guestRatelimit;
}

export class CacheService {
  static async getCache<T>(key: string): Promise<T | null> {
    const cachedValue = await getRedis().get<T>(key);

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
      await getRedis().del(key);
    }

    const payload = JSON.stringify(value);

    if (options?.ttlSeconds) {
      await getRedis().set(key, payload, { ex: options.ttlSeconds });
      return;
    }

    await getRedis().set(key, payload);
  }

  static async deleteCache(key: string) {
    return getRedis().del(key);
  }

  static async refreshCache<T>(key: string, value: T, ttlSeconds?: number) {
    await getRedis().del(key);
    await CacheService.setCache(key, value, { ttlSeconds });
  }

  /**
   * Checks the rate limit for a guest session.
   * Max 10 prompts per 24 hours.
   */
  static async checkGuestLimit(guestId: string) {
    try {
      const cacheKey = `guest_usage:${guestId}`;
      const result = await getRatelimit().limit(cacheKey);

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
