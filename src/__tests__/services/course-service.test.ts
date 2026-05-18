import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ChatProviderFactory } from '@/services/ai/ChatProviderFactory';
import { CourseService } from '@/services/CourseService';

vi.mock('@/services/ai/ChatProviderFactory', () => ({
  ChatProviderFactory: {
    create: vi.fn(),
  },
}));

vi.mock('@tavily/core', () => ({
  tavily: vi.fn(() => ({
    search: vi.fn(),
  })),
}));

describe('CourseService.generateModulesFromAI', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('passes an onFinish callback to the AI provider so persistence runs before the stream closes', async () => {
    const saveSpy = vi
      .spyOn(CourseService, 'saveGeneratedCourseData')
      .mockResolvedValue(undefined);

    const streamCourse = vi.fn().mockResolvedValue({
      object: Promise.resolve({ modules: [] }),
      toTextStreamResponse: vi.fn(),
    });

    vi.mocked(ChatProviderFactory.create).mockReturnValue({
      streamCourse,
    } as never);

    await CourseService.generateModulesFromAI({
      userId: 'user-1',
      courseId: 'course-1',
    });

    const options = vi.mocked(streamCourse).mock.calls[0]?.[0];

    expect(options).toEqual(
      expect.objectContaining({
        userId: 'user-1',
        onFinish: expect.any(Function),
      })
    );

    await options.onFinish?.({
      object: {
        modules: [
          {
            title: 'Introduction',
            lessons: [
              {
                lessonTitle: 'Lesson 1',
                content: 'Welcome to the course',
              },
            ],
          },
        ],
      },
      error: undefined,
      response: {} as never,
      usage: {} as never,
      providerMetadata: undefined,
      warnings: undefined,
    });

    expect(saveSpy).toHaveBeenCalledWith('course-1', {
      modules: [
        {
          title: 'Introduction',
          lessons: [
            {
              lessonTitle: 'Lesson 1',
              content: 'Welcome to the course',
            },
          ],
        },
      ],
    });
  });
});
