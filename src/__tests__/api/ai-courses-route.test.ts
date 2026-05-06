import { describe, expect, it, vi } from 'vitest';
import { POST } from '@/app/api/v1/ai/courses/route';

const streamCourseMock = vi.fn().mockResolvedValue({
  toTextStreamResponse: vi.fn().mockReturnValue(new Response()),
});

vi.mock('@/services/ai/AIGatewayService', () => ({
  AIGatewayService: class {
    streamCourse = streamCourseMock;
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
        fileId: '00000000-0000-0000-0000-000000000000',
        apiKey: 'test-key',
      }),
    });

    await POST(request);

    expect(streamCourseMock).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        fileId: '00000000-0000-0000-0000-000000000000',
        apiKey: 'test-key',
      })
    );
  });
});
