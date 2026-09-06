import { beforeEach, describe, expect, it, vi } from 'vitest';
import { prisma } from '@/lib/prisma';
import { LessonService } from '@/services/LessonService';

const mocks = vi.hoisted(() => ({
  containPermission: vi.fn<(permission: string) => boolean>(() => true),
  withoutPermission: vi.fn<(permission: string) => boolean>(() => false),
  getCoursePermissions: vi.fn(),
  module: {
    findFirst: vi.fn(),
  },
  lesson: {
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock('@/lib/permissions/course-permission', () => ({
  getCoursePermissions: mocks.getCoursePermissions,
}));

vi.mock('@/lib/prisma', () => ({
  prisma: { lesson: mocks.lesson, module: mocks.module },
}));

describe('LessonService soft deletion', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCoursePermissions.mockResolvedValue({
      containPermission: mocks.containPermission,
      withoutPermission: mocks.withoutPermission,
    });
  });

  it('rejects lesson creation when course content create permission is missing', async () => {
    mocks.module.findFirst.mockResolvedValue({ courseId: 'course-1' });
    mocks.withoutPermission.mockImplementation((permission: string) => {
      return permission === 'COURSE_CONTENT_CREATE';
    });

    await expect(
      LessonService.createLesson({
        moduleId: 'module-1',
        title: 'Lesson 1',
        userId: 'user-1',
      })
    ).rejects.toThrow('Forbidden');
  });

  it('loads only an active lesson in an active module and course', async () => {
    const lessonRecord = {
      id: 'lesson-1',
      module: { courseId: 'course-1' },
      title: 'Lesson',
    };
    mocks.lesson.findFirst.mockResolvedValue(lessonRecord);
    mocks.lesson.findUnique.mockResolvedValue(lessonRecord);

    await LessonService.getLessonById('lesson-1', 'user-1');

    expect(prisma.lesson.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'lesson-1',
        deletedAt: null,
        module: {
          deletedAt: null,
          course: { deletedAt: null },
        },
      },
      include: {
        module: { select: { courseId: true } },
      },
    });
  });

  it('finds an active lesson before soft deleting it', async () => {
    const lessonRecord = {
      id: 'lesson-1',
      module: { courseId: 'course-1' },
    };
    mocks.lesson.findFirst.mockResolvedValue(lessonRecord);
    mocks.lesson.findUnique.mockResolvedValue(lessonRecord);
    mocks.lesson.update.mockResolvedValue({ id: 'lesson-1' });

    await LessonService.deleteLesson('lesson-1', 'user-1');

    expect(prisma.lesson.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'lesson-1',
        deletedAt: null,
        module: {
          deletedAt: null,
          course: { deletedAt: null },
        },
      },
      select: {
        id: true,
        module: { select: { courseId: true } },
      },
    });
    expect(prisma.lesson.update).toHaveBeenCalledWith({
      where: { id: 'lesson-1' },
      data: { deletedAt: expect.any(Date) },
      select: { id: true },
    });
  });

  it('rejects lesson updates when course content update permission is missing', async () => {
    mocks.lesson.findFirst.mockResolvedValue({
      id: 'lesson-1',
      module: { courseId: 'course-1' },
    });
    mocks.containPermission.mockImplementation((permission: string) => {
      return permission !== 'COURSE_CONTENT_UPDATE';
    });

    await expect(
      LessonService.updateLesson('lesson-1', 'user-1', {
        title: 'Updated lesson',
      })
    ).rejects.toThrow('Unauthorized: Missing COURSE_CONTENT_UPDATE permission');
  });

  it('rejects lesson deletion when course content delete permission is missing', async () => {
    mocks.lesson.findFirst.mockResolvedValue({
      id: 'lesson-1',
      module: { courseId: 'course-1' },
    });
    mocks.containPermission.mockImplementation((permission: string) => {
      return permission !== 'COURSE_CONTENT_DELETE';
    });

    await expect(
      LessonService.deleteLesson('lesson-1', 'user-1')
    ).rejects.toThrow('Unauthorized: Missing COURSE_CONTENT_DELETE permission');
  });
});
