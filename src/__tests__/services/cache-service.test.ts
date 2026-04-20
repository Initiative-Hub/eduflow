import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CacheService } from '@/services/CacheService';

vi.hoisted(() => {
  process.env.UPSTASH_REDIS_REST_URL = 'https://example.upstash.io';
  process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token';
});

const mockRedis = vi.hoisted(() => ({
  get: vi.fn(),
  set: vi.fn().mockResolvedValue('OK'),
  del: vi.fn().mockResolvedValue(1),
}));

const mockRateLimit = vi.hoisted(() => ({
  limit: vi.fn(),
}));

const mockRedisClientConstructor = vi.hoisted(() =>
  Object.assign(
    vi.fn(function MockRedis() {
      return mockRedis;
    }),
    {
      fromEnv: vi.fn(() => mockRedis),
    }
  )
);

const mockRateLimitConstructor = vi.hoisted(() =>
  Object.assign(
    vi.fn(function MockRateLimit() {
      return mockRateLimit;
    }),
    {
      fixedWindow: vi.fn(),
    }
  )
);

vi.mock('@upstash/redis', () => ({
  Redis: mockRedisClientConstructor,
}));

vi.mock('@upstash/ratelimit', () => ({
  MultiRegionRatelimit: mockRateLimitConstructor,
}));

describe('CacheService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('stores JSON values with ttl when setCache is called', async () => {
    await CacheService.setCache(
      'user:1',
      { id: 'user-1' },
      { ttlSeconds: 300 }
    );

    expect(mockRedis.set).toHaveBeenCalledWith(
      'user:1',
      JSON.stringify({ id: 'user-1' }),
      { ex: 300 }
    );
  });

  it('returns parsed values from getCache', async () => {
    mockRedis.get.mockResolvedValueOnce(JSON.stringify({ ok: true }));

    const result = await CacheService.getCache<{ ok: boolean }>('flag');

    expect(mockRedis.get).toHaveBeenCalledWith('flag');
    expect(result).toEqual({ ok: true });
  });

  it('returns null when getCache misses', async () => {
    mockRedis.get.mockResolvedValueOnce(null);

    const result = await CacheService.getCache('missing');

    expect(result).toBeNull();
  });

  it('refreshes cache by deleting old value before setting new one', async () => {
    await CacheService.refreshCache('session:1', { active: true }, 120);

    expect(mockRedis.del).toHaveBeenCalledWith('session:1');
    expect(mockRedis.set).toHaveBeenCalledWith(
      'session:1',
      JSON.stringify({ active: true }),
      { ex: 120 }
    );

    const deleteOrder = mockRedis.del.mock.invocationCallOrder[0];
    const setOrder = mockRedis.set.mock.invocationCallOrder[0];

    expect(deleteOrder).toBeLessThan(setOrder);
  });

  it('allows the first guest request with a 24 hour rate limit', async () => {
    mockRateLimit.limit.mockResolvedValueOnce({ success: true, remaining: 9 });

    const result = await CacheService.checkGuestLimit('guest-1');

    expect(mockRateLimit.limit).toHaveBeenCalledWith('guest_usage:guest-1');
    expect(result).toEqual({ allowed: true, remaining: 9 });
  });

  it('denies the guest request when the limit is exceeded', async () => {
    mockRateLimit.limit.mockResolvedValueOnce({ success: false, remaining: 0 });

    const result = await CacheService.checkGuestLimit('guest-1');

    expect(result).toEqual({
      allowed: false,
      message: 'Limit reached. Please register to unlock full features.',
      remaining: 0,
    });
  });

  it('fails closed when the rate limit backend errors', async () => {
    mockRateLimit.limit.mockRejectedValueOnce(new Error('backend unavailable'));

    const result = await CacheService.checkGuestLimit('guest-1');

    expect(result).toEqual({
      allowed: false,
      message: 'Service temporarily unavailable.',
      remaining: 0,
    });
  });
});
