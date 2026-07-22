import type { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const getCoursePermissions = vi.fn();
const moduleFindFirst = vi.fn();
const createCourseContentGenerationControl = vi.fn();
const getCourseContentGenerationControl = vi.fn();
const requestCourseContentSearchSkip = vi.fn();

vi.mock('@/lib/api/middlewares', () => ({
  withAuth:
    (handler: any) =>
    (req: Request, ...args: any[]) =>
      handler(req, { user: { id: 'user-1' } }, ...args),
  withRoles:
    (_roles: string[], handler: any) =>
    (req: Request, ...args: any[]) =>
      handler(req, { user: { id: 'user-1' } }, ...args),
}));

vi.mock('@/lib/permissions/course-permission', () => ({
  getCoursePermissions,
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    module: {
      findFirst: moduleFindFirst,
      update: vi.fn(),
    },
  },
}));

vi.mock('@/services/CourseService', () => ({
  CourseService: {
    generateCourseContentStream: vi.fn(() => new ReadableStream()),
  },
}));

vi.mock('@/lib/course-content/generation-control', () => ({
  createCourseContentGenerationControl,
  getCourseContentGenerationControl,
  requestCourseContentSearchSkip,
}));

vi.mock('@/lib/upstash/redis/client', () => ({
  hasUpstashRestEnv: () => true,
}));

function jsonRequest(body: unknown): NextRequest {
  return {
    headers: {
      get: () => 'application/json',
    },
    json: async () => body,
  } as unknown as NextRequest;
}

describe('course content permission route enforcement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getCoursePermissions.mockResolvedValue({
      withoutPermission: (permission: string) =>
        permission === 'COURSE_CONTENT_CREATE' ||
        permission === 'COURSE_CONTENT_UPDATE',
    });
    moduleFindFirst.mockResolvedValue({
      id: 'module-1',
      courseId: 'course-1',
      itemLayout: [],
    });
  });

  it('rejects AI course content generation when content create is missing', async () => {
    const { POST } = await import('@/app/api/v1/ai/courses/route');

    const response = await POST(
      jsonRequest({
        fileId: '11111111-1111-4111-8111-111111111111',
        courseId: '22222222-2222-4222-8222-222222222222',
      })
    );

    expect(response.status).toBe(403);
  });

  it('returns a search skip control ID with an authorized content stream', async () => {
    getCoursePermissions.mockResolvedValue({
      withoutPermission: () => false,
    });
    createCourseContentGenerationControl.mockResolvedValue('control-123');

    const { POST } = await import('@/app/api/v1/ai/courses/route');
    const response = await POST(
      jsonRequest({
        fileId: '11111111-1111-4111-8111-111111111111',
        courseId: '22222222-2222-4222-8222-222222222222',
      })
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('X-Course-Content-Generation-Control')).toBe(
      'control-123'
    );
  });

  it("rejects a search skip request for another user's generation", async () => {
    getCourseContentGenerationControl.mockResolvedValue({
      courseId: '22222222-2222-4222-8222-222222222222',
      userId: 'another-user',
      skipSearch: false,
    });

    const { POST } = await import(
      '@/app/api/v1/ai/courses/[generationId]/skip-search/route'
    );
    const response = await POST(new Request('https://example.com'), {
      params: Promise.resolve({
        generationId: '33333333-3333-4333-8333-333333333333',
      }),
    });

    expect(response.status).toBe(403);
    expect(requestCourseContentSearchSkip).not.toHaveBeenCalled();
  });

  it('rejects module indent changes without content update permission', async () => {
    const { PATCH } = await import(
      '@/app/api/v1/modules/[moduleId]/indent/route'
    );

    const response = await PATCH(
      jsonRequest({ itemId: 'lesson-1', indent: 1 }),
      {
        params: Promise.resolve({ moduleId: 'module-1' }),
      }
    );

    expect(response.status).toBe(403);
  });

  it('rejects module reorder without content update permission', async () => {
    const { PATCH } = await import(
      '@/app/api/v1/modules/[moduleId]/order/route'
    );

    const response = await PATCH(
      jsonRequest({ items: [{ id: 'lesson-1', orderIndex: 0 }] }),
      {
        params: Promise.resolve({ moduleId: 'module-1' }),
      }
    );

    expect(response.status).toBe(403);
  });
});
