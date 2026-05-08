import { describe, expect, it, vi } from 'vitest';
import { POST } from '@/app/api/v1/ai/courses/route';

const streamCourseMock = vi.fn().mockResolvedValue({
  toTextStreamResponse: vi.fn().mockReturnValue(new Response()),
});

vi.mock('@/services/CourseService', () => ({
  CourseService: {
    generateModulesFromAI: streamCourseMock,
  },
}));

vi.mock('@/lib/api/middlewares', () => ({
  withAuth:
    (handler: any) =>
    (req: Request, ...args: any[]) =>
      handler(
        req,
        {
          user: { id: 'user-1', role: 'TEACHER' },
          session: {},
        },
        ...args
      ),
  withRoles: (_roles: string[], handler: any) => handler,
}));

describe('POST /api/v1/ai/courses', () => {
  it('passes apiKey through to streamCourse', async () => {
    const request = new Request('http://localhost/api/v1/ai/courses', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        fileId: '123e4567-e89b-12d3-a456-426614174000',
        courseId: '123e4567-e89b-12d3-a456-426614174001',
        apiKey: 'test-key',
      }),
    });

    await POST(request);

    expect(streamCourseMock).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        fileId: '123e4567-e89b-12d3-a456-426614174000',
        courseId: '123e4567-e89b-12d3-a456-426614174001',
        apiKey: 'test-key',
      })
    );
  });
});
