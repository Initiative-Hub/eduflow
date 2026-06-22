import { beforeEach, describe, expect, it, vi } from 'vitest';
import { prisma } from '@/lib/prisma';
import { LessonService } from '@/services/LessonService';

const mocks = vi.hoisted(() => ({
  containPermission: vi.fn(() => true),
  getCoursePermissions: vi.fn(),
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
  prisma: { lesson: mocks.lesson },
}));

describe('LessonService soft deletion', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCoursePermissions.mockResolvedValue({
      containPermission: mocks.containPermission,
    });
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
});
