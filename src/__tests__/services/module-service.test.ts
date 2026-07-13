import { beforeEach, describe, expect, it, vi } from 'vitest';
import { prisma } from '@/lib/prisma';
import { ModuleService } from '@/services/ModuleService';

const mocks = vi.hoisted(() => ({
  containPermission: vi.fn(() => true),
  getCoursePermissions: vi.fn(),
  module: {
    findFirst: vi.fn(),
    findMany: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock('@/lib/permissions/course-permission', () => ({
  getCoursePermissions: mocks.getCoursePermissions,
}));

vi.mock('@/lib/prisma', () => ({
  prisma: { module: mocks.module },
}));

describe('ModuleService soft deletion', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCoursePermissions.mockResolvedValue({
      containPermission: mocks.containPermission,
    });
  });

  it('lists only active modules and active lessons', async () => {
    mocks.module.findMany.mockResolvedValue([]);

    await ModuleService.getModulesByCourse('course-1', 'user-1');

    expect(prisma.module.findMany).toHaveBeenCalledWith({
      where: {
        courseId: 'course-1',
        deletedAt: null,
        course: { deletedAt: null },
      },
      orderBy: { orderIndex: 'asc' },
      select: {
        id: true,
        courseId: true,
        title: true,
        orderIndex: true,
        itemLayout: true,
        lessons: {
          where: { deletedAt: null },
          orderBy: { orderIndex: 'asc' },
          select: {
            id: true,
            title: true,
            orderIndex: true,
          },
        },
      },
    });
  });

  it('finds an active module before soft deleting it', async () => {
    const moduleRecord = { courseId: 'course-1', id: 'module-1' };
    mocks.module.findFirst.mockResolvedValue(moduleRecord);
    mocks.module.findUnique.mockResolvedValue(moduleRecord);
    mocks.module.update.mockResolvedValue({ id: 'module-1' });

    await ModuleService.deleteModule('module-1', 'user-1');

    expect(prisma.module.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'module-1',
        deletedAt: null,
        course: { deletedAt: null },
      },
      select: { id: true, courseId: true },
    });
    expect(prisma.module.update).toHaveBeenCalledWith({
      where: { id: 'module-1' },
      data: { deletedAt: expect.any(Date) },
      select: { id: true },
    });
  });
});
