import type { UIMessage } from 'ai';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LessonReferenceService } from '@/services/LessonReferenceService';
import type { ChatLessonReferenceUIPart } from '@/types/chat-lesson-references';
import {
  hasChatLessonReferenceParts,
  hydrateChatLessonReferenceContent,
  hydrateChatLessonReferenceSummaries,
  sanitizeChatLessonReferenceParts,
} from '@/utils/chat-lesson-references';

vi.mock('@/services/LessonReferenceService', () => ({
  LessonReferenceService: {
    getLessonReferencePayloads: vi.fn(),
    getLessonReferenceSummaries: vi.fn(),
  },
}));

const lessonReferenceMock = LessonReferenceService as unknown as {
  getLessonReferencePayloads: ReturnType<typeof vi.fn>;
  getLessonReferenceSummaries: ReturnType<typeof vi.fn>;
};

const messageWithLessonReference = (): UIMessage => ({
  id: 'msg-lesson-1',
  role: 'user',
  parts: [
    {
      type: 'data-lesson-reference',
      id: 'lesson-1',
      data: {
        courseId: 'course-1',
        courseTitle: 'Biology 101',
        lessonId: 'lesson-1',
        lessonTitle: 'Cell Biology',
        moduleTitle: 'Foundations',
      },
    } as ChatLessonReferenceUIPart,
    { type: 'text', text: 'Summarize this lesson.' },
  ],
});

describe('chat lesson reference helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('detects lesson reference parts without treating files as lesson references', () => {
    expect(hasChatLessonReferenceParts([messageWithLessonReference()])).toBe(
      true
    );
    expect(
      hasChatLessonReferenceParts([
        {
          id: 'msg-file',
          role: 'user',
          parts: [
            {
              fileId: 'file-1',
              mediaType: 'application/pdf',
              type: 'file',
              url: 'users/user-1/file.pdf',
            } as UIMessage['parts'][number],
          ],
        },
      ])
    ).toBe(false);
  });

  it('hydrates lesson reference parts with Markdown for model calls', async () => {
    lessonReferenceMock.getLessonReferencePayloads.mockResolvedValueOnce([
      {
        courseId: 'course-1',
        courseTitle: 'Biology 101',
        lessonId: 'lesson-1',
        lessonTitle: 'Cell Biology',
        markdown: '## Cell Biology\n\nCells use **ATP**.',
        moduleTitle: 'Foundations',
      },
    ]);

    const hydrated = await hydrateChatLessonReferenceContent({
      messages: [messageWithLessonReference()],
      userId: 'user-1',
    });

    expect(lessonReferenceMock.getLessonReferencePayloads).toHaveBeenCalledWith(
      {
        lessonIds: ['lesson-1'],
        userId: 'user-1',
      }
    );
    expect(hydrated[0].parts[0]).toMatchObject({
      type: 'data-lesson-reference',
      data: {
        courseId: 'course-1',
        courseTitle: 'Biology 101',
        lessonId: 'lesson-1',
        lessonTitle: 'Cell Biology',
        markdown: '## Cell Biology\n\nCells use **ATP**.',
        moduleTitle: 'Foundations',
      },
    });
  });

  it('removes hydrated lesson Markdown before persistence', () => {
    const sanitized = sanitizeChatLessonReferenceParts([
      {
        ...messageWithLessonReference(),
        parts: [
          {
            type: 'data-lesson-reference',
            id: 'lesson-1',
            data: {
              courseId: 'course-1',
              courseTitle: 'Biology 101',
              lessonId: 'lesson-1',
              lessonTitle: 'Cell Biology',
              markdown: '## Cell Biology\n\nCells use **ATP**.',
              moduleTitle: 'Foundations',
            },
          } as ChatLessonReferenceUIPart,
          { type: 'text', text: 'Summarize this lesson.' },
        ],
      },
    ]);

    expect(JSON.stringify(sanitized)).not.toContain('Cells use');
    expect(sanitized[0].parts[0]).toMatchObject({
      type: 'data-lesson-reference',
      data: {
        courseId: 'course-1',
        courseTitle: 'Biology 101',
        lessonId: 'lesson-1',
        lessonTitle: 'Cell Biology',
        moduleTitle: 'Foundations',
      },
    });
  });

  it('hydrates lesson reference summaries without exposing Markdown for fetched chats', async () => {
    lessonReferenceMock.getLessonReferenceSummaries.mockResolvedValueOnce([
      {
        courseId: 'course-1',
        courseTitle: 'Biology 101',
        lessonId: 'lesson-1',
        lessonTitle: 'Cell Biology Updated',
        moduleTitle: 'Foundations',
      },
    ]);

    const hydrated = await hydrateChatLessonReferenceSummaries({
      messages: [messageWithLessonReference()],
      userId: 'user-1',
    });

    expect(
      lessonReferenceMock.getLessonReferenceSummaries
    ).toHaveBeenCalledWith({
      lessonIds: ['lesson-1'],
      userId: 'user-1',
    });
    expect(hydrated[0].parts[0]).toMatchObject({
      type: 'data-lesson-reference',
      data: {
        lessonId: 'lesson-1',
        lessonTitle: 'Cell Biology Updated',
      },
    });
    expect(JSON.stringify(hydrated)).not.toContain('markdown');
  });
});
