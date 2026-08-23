import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GameQuizAIService } from '@/services/GameQuizAIService';

const mocks = vi.hoisted(() => ({
  courseFindMany: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    course: { findMany: mocks.courseFindMany },
  },
}));

const USER_ID = 'user-1';
const COURSE_ID = '11111111-1111-4111-8111-111111111111';
const MODULE_ID = '22222222-2222-4222-8222-222222222222';
const LESSON_ID = '33333333-3333-4333-8333-333333333333';

const requiredPermissions = (role: 'COURSE_OWNER' | 'TEACHER') => [
  { permission: 'COURSE_CONTENT_VIEW', courseRole: { name: role } },
  {
    permission: 'AI_USE_COURSE_GENERATION',
    courseRole: { name: role },
  },
];

function sourceCourse(overrides: Record<string, unknown> = {}) {
  return {
    id: COURSE_ID,
    title: 'Biology',
    ownerId: USER_ID,
    permissions: requiredPermissions('COURSE_OWNER'),
    enrollments: [],
    modules: [
      {
        id: MODULE_ID,
        title: 'Cell biology',
        lessons: [{ id: LESSON_ID, title: 'Photosynthesis' }],
      },
    ],
    ...overrides,
  };
}

describe('GameQuizAIService source eligibility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns only owners and active teachers with both required permissions', async () => {
    const teacherCourse = sourceCourse({
      id: '55555555-5555-4555-8555-555555555555',
      title: 'Chemistry',
      ownerId: 'another-user',
      permissions: requiredPermissions('TEACHER'),
      enrollments: [{ role: { name: 'TEACHER' } }],
    });
    const missingPermissionCourse = sourceCourse({
      id: '66666666-6666-4666-8666-666666666666',
      title: 'Physics',
      permissions: [
        {
          permission: 'COURSE_CONTENT_VIEW',
          courseRole: { name: 'COURSE_OWNER' },
        },
      ],
    });
    mocks.courseFindMany.mockResolvedValue([
      sourceCourse(),
      teacherCourse,
      missingPermissionCourse,
    ]);

    await expect(GameQuizAIService.listSources(USER_ID)).resolves.toEqual({
      courses: [
        {
          id: COURSE_ID,
          title: 'Biology',
          modules: sourceCourse().modules,
        },
        {
          id: teacherCourse.id,
          title: teacherCourse.title,
          modules: teacherCourse.modules,
        },
      ],
    });
  });

  it('asks the database only for active, non-student memberships and non-deleted content', async () => {
    mocks.courseFindMany.mockResolvedValue([]);

    await GameQuizAIService.listSources(USER_ID);

    expect(mocks.courseFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          archivedAt: null,
          deletedAt: null,
          OR: [
            { ownerId: USER_ID },
            {
              enrollments: {
                some: {
                  memberId: USER_ID,
                  status: 'ACTIVE',
                  role: { name: { in: ['COURSE_OWNER', 'TEACHER'] } },
                },
              },
            },
          ],
        },
      })
    );
    const query = mocks.courseFindMany.mock.calls[0][0];
    expect(query.select.modules.where).toEqual({ deletedAt: null });
    expect(query.select.modules.select.lessons.where).toEqual({
      deletedAt: null,
    });
    expect(query.select.enrollments.where).toMatchObject({
      memberId: USER_ID,
      status: 'ACTIVE',
      role: { name: { in: ['COURSE_OWNER', 'TEACHER'] } },
    });
  });
});
