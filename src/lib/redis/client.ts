import { createClient, type RedisClientType } from 'redis';
import { PROD_MODE } from '@/constants/common';

const globalForRedis = global as unknown as { redis: RedisClientType };

export const redis =
  globalForRedis.redis || createClient({ url: process.env.REDIS_URL });

redis.on('error', (err) => console.log('Redis Client Error', err));

if (!redis.isOpen) {
  redis.connect();
}

if (!PROD_MODE) {
  globalForRedis.redis = redis;
}
