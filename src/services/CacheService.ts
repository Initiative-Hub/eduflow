import { createClient, type RedisClientType } from 'redis';

const globalForRedis = global as unknown as { redis: RedisClientType };

export const redis =
  globalForRedis.redis || createClient({ url: process.env.REDIS_URL });

redis.on('error', (err) => console.log('Redis Client Error', err));

if (!redis.isOpen) {
  redis.connect();
}

if (process.env.NODE_ENV !== 'production') {
  globalForRedis.redis = redis;
}

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
   * Max 5 prompts per 24 hours.
   */
  static async checkGuestLimit(guestSessionId: string) {
    const MAX_PROMPTS = 5;
    const cacheKey = `guest_usage:${guestSessionId}`;

    try {
      const currentUsage = await redis.incr(cacheKey);

      if (currentUsage === 1) {
        await redis.expire(cacheKey, 86400);
      }

      if (currentUsage > MAX_PROMPTS) {
        return {
          allowed: false,
          message: 'Limit reached. Please register to unlock full features.',
          remaining: 0,
        };
      }

      return { allowed: true, remaining: MAX_PROMPTS - currentUsage };
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
