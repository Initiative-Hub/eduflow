import type { SourceDocumentUIPart, UIMessage } from 'ai';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LessonReferenceService } from '@/services/LessonReferenceService';
import {
  convertLessonSourcesToTextParts,
  hasChatLessonReferenceParts,
  hydrateChatLessonReferenceContent,
  hydrateChatLessonReferenceSummaries,
  sanitizeChatLessonReferenceParts,
} from '@/utils/chat-lesson-references';
import {
  getLessonMetadata,
  withChatMetadata,
} from '@/utils/chat-part-metadata';

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

const lessonSourcePart = (): SourceDocumentUIPart =>
  withChatMetadata(
    {
      type: 'source-document',
      sourceId: 'lesson-1',
      mediaType: 'application/x-eduflow-lesson-reference',
      title: 'Cell Biology',
      filename: 'Cell Biology',
    },
    {
      courseId: 'course-1',
      courseTitle: 'Biology 101',
      lessonId: 'lesson-1',
      lessonTitle: 'Cell Biology',
      moduleTitle: 'Foundations',
    }
  );

const messageWithLessonReference = (): UIMessage => ({
  id: 'msg-lesson-1',
  role: 'user',
  parts: [lessonSourcePart(), { type: 'text', text: 'Summarize this lesson.' }],
});

describe('chat lesson reference helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('detects lesson source documents without treating files as lesson references', () => {
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
              mediaType: 'application/pdf',
              type: 'file',
              url: 'users/user-1/file.pdf',
            },
          ],
        },
      ])
    ).toBe(false);
    expect(
      hasChatLessonReferenceParts([
        {
          id: 'msg-source',
          role: 'user',
          parts: [
            {
              type: 'source-document',
              sourceId: 'source-1',
              mediaType: 'text/markdown',
              title: 'External source',
            },
          ],
        },
      ])
    ).toBe(false);
  });

  it('hydrates lesson source documents with Markdown for model calls', async () => {
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
    const part = hydrated[0].parts[0] as SourceDocumentUIPart;

    expect(lessonReferenceMock.getLessonReferencePayloads).toHaveBeenCalledWith(
      {
        lessonIds: ['lesson-1'],
        userId: 'user-1',
      }
    );
    expect(part).toMatchObject({
      type: 'source-document',
      sourceId: 'lesson-1',
      title: 'Cell Biology',
    });
    expect(getLessonMetadata(part)).toMatchObject({
      courseId: 'course-1',
      lessonId: 'lesson-1',
      markdown: '## Cell Biology\n\nCells use **ATP**.',
      moduleTitle: 'Foundations',
    });
  });

  it('converts hydrated lesson source documents into model text context', async () => {
    lessonReferenceMock.getLessonReferencePayloads.mockResolvedValueOnce([
      {
        courseId: 'course-1',
        courseTitle: 'Biology 101',
        lessonId: 'lesson-1',
        lessonTitle: 'Cell Biology',
        markdown: 'Cells use ATP.',
        moduleTitle: 'Foundations',
      },
    ]);

    const hydrated = await hydrateChatLessonReferenceContent({
      messages: [messageWithLessonReference()],
      userId: 'user-1',
    });
    const converted = convertLessonSourcesToTextParts(hydrated);

    expect(converted[0].parts[0]).toMatchObject({
      type: 'text',
      text: expect.stringContaining('Cells use ATP.'),
    });
  });

  it('removes hydrated lesson Markdown before persistence', () => {
    const source = withChatMetadata(lessonSourcePart(), {
      courseId: 'course-1',
      courseTitle: 'Biology 101',
      lessonId: 'lesson-1',
      lessonTitle: 'Cell Biology',
      markdown: '## Cell Biology\n\nCells use **ATP**.',
      moduleTitle: 'Foundations',
    });
    const sanitized = sanitizeChatLessonReferenceParts([
      {
        ...messageWithLessonReference(),
        parts: [source, { type: 'text', text: 'Summarize this lesson.' }],
      },
    ]);
    const part = sanitized[0].parts[0] as SourceDocumentUIPart;

    expect(JSON.stringify(sanitized)).not.toContain('Cells use');
    expect(getLessonMetadata(part)).toMatchObject({
      courseId: 'course-1',
      lessonId: 'lesson-1',
      lessonTitle: 'Cell Biology',
      moduleTitle: 'Foundations',
    });
    expect(getLessonMetadata(part)).not.toHaveProperty('markdown');
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
    const part = hydrated[0].parts[0] as SourceDocumentUIPart;

    expect(
      lessonReferenceMock.getLessonReferenceSummaries
    ).toHaveBeenCalledWith({
      lessonIds: ['lesson-1'],
      userId: 'user-1',
    });
    expect(part).toMatchObject({
      type: 'source-document',
      sourceId: 'lesson-1',
      title: 'Cell Biology Updated',
    });
    expect(JSON.stringify(hydrated)).not.toContain('markdown');
  });
});
