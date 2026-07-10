import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ShareResourceType } from '@/generated/prisma';
import { prisma } from '@/lib/prisma';
import { StudyShareService } from '@/services/StudyShareService';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    sharedResource: {
      findFirst: vi.fn(),
    },
  },
}));

const prismaMock = prisma as unknown as {
  sharedResource: {
    findFirst: ReturnType<typeof vi.fn>;
  };
};

describe('StudyShareService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns public interactive content with owner metadata for CTA decisions', async () => {
    prismaMock.sharedResource.findFirst.mockResolvedValue({
      ownerUserId: 'user-owner',
      payload: {
        description: 'Explore a water cycle model.',
        html: '<main>Water cycle</main>',
        title: 'Water cycle',
      },
      sourceChatId: 'chat-1',
    });

    const result =
      await StudyShareService.getPublicInteractiveContent('share-1');

    expect(prismaMock.sharedResource.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'share-1',
        resourceType: ShareResourceType.STUDY_INTERACTIVE_CONTENT,
        revokedAt: null,
        OR: [{ expiresAt: null }, { expiresAt: { gt: expect.any(Date) } }],
      },
      select: {
        ownerUserId: true,
        payload: true,
        sourceChatId: true,
      },
    });
    expect(result).toEqual({
      content: {
        description: 'Explore a water cycle model.',
        html: '<main>Water cycle</main>',
        title: 'Water cycle',
      },
      ownerUserId: 'user-owner',
      sourceChatId: 'chat-1',
    });
  });
});
