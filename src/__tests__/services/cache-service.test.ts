import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockRedis = vi.hoisted(() => ({
  connect: vi.fn().mockResolvedValue(undefined),
  on: vi.fn(),
  isOpen: false,
  get: vi.fn(),
  set: vi.fn().mockResolvedValue('OK'),
  del: vi.fn().mockResolvedValue(1),
  incr: vi.fn(),
  expire: vi.fn(),
}));

vi.mock('redis', () => ({
  createClient: vi.fn(() => mockRedis),
}));

import { CacheService } from '@/services/CacheService';

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
      { EX: 300 }
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
      { EX: 120 }
    );

    const deleteOrder = mockRedis.del.mock.invocationCallOrder[0];
    const setOrder = mockRedis.set.mock.invocationCallOrder[0];

    expect(deleteOrder).toBeLessThan(setOrder);
  });
});
