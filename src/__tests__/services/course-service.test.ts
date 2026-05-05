import { beforeEach, describe, expect, it, vi } from 'vitest';
import { prisma } from '@/lib/prisma';
import { CourseService } from '@/services/CourseService';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    course: {
      findMany: vi.fn(),
    },
  },
}));

describe('CourseService', () => {
  const prismaMock = prisma as unknown as {
    course: {
      findMany: ReturnType<typeof vi.fn>;
    };
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('queries courses by ownerId when listing owned courses', async () => {
    prismaMock.course.findMany.mockResolvedValue([]);

    await CourseService.getCoursesByOwner('teacher-1');

    expect(prisma.course.findMany).toHaveBeenCalledWith({
      where: { ownerId: 'teacher-1' },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: {
            modules: true,
            enrollments: true,
          },
        },
      },
    });
  });
});
