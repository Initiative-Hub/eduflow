import type { SourceDocumentUIPart, TextUIPart, UIMessage } from 'ai';
import {
  type LessonReferenceData,
  LessonReferenceService,
} from '@/services/LessonReferenceService';
import {
  getLessonMetadata,
  isLessonSourcePart,
  LESSON_REFERENCE_MEDIA_TYPE,
  withChatMetadata,
} from '@/utils/chat-part-metadata';

export const hasChatLessonReferenceParts = (messages: UIMessage[]) =>
  messages.some((message) => message.parts.some(isLessonSourcePart));

const getLessonIds = (messages: UIMessage[]) =>
  Array.from(
    new Set(
      messages.flatMap((message) =>
        message.parts.flatMap((part) =>
          isLessonSourcePart(part) ? [part.sourceId] : []
        )
      )
    )
  );

const getLessonDataById = (items: LessonReferenceData[]) => {
  const byLessonId = new Map<string, LessonReferenceData>();

  for (const item of items) {
    byLessonId.set(item.lessonId, item);
  }

  return byLessonId;
};

const formatLessonReferenceForModel = (data: LessonReferenceData) =>
  [
    '<lesson-reference>',
    `Course: ${data.courseTitle}`,
    data.moduleTitle ? `Module: ${data.moduleTitle}` : null,
    `Lesson: ${data.lessonTitle}`,
    '',
    data.markdown?.trim() || 'No lesson content was available.',
    '</lesson-reference>',
  ]
    .filter((line): line is string => line !== null)
    .join('\n');

export function toLessonSourceDocument(
  data: LessonReferenceData
): SourceDocumentUIPart {
  return withChatMetadata(
    {
      type: 'source-document',
      sourceId: data.lessonId,
      mediaType: LESSON_REFERENCE_MEDIA_TYPE,
      title: data.lessonTitle,
      filename: data.lessonTitle,
    },
    {
      courseId: data.courseId,
      courseTitle: data.courseTitle,
      lessonId: data.lessonId,
      lessonTitle: data.lessonTitle,
      markdown: data.markdown,
      moduleTitle: data.moduleTitle,
    }
  );
}

function mergeLessonReferenceData({
  messages,
  references,
}: {
  messages: UIMessage[];
  references: LessonReferenceData[];
}) {
  const lessonDataById = getLessonDataById(references);

  return messages.map((message) => ({
    ...message,
    parts: message.parts.map((part) => {
      if (!isLessonSourcePart(part)) return part;

      const lesson = lessonDataById.get(part.sourceId);
      if (!lesson) {
        throw new Error('Lesson reference not found');
      }

      return withChatMetadata(
        {
          ...part,
          title: lesson.lessonTitle,
          filename: lesson.lessonTitle,
          mediaType: LESSON_REFERENCE_MEDIA_TYPE,
        },
        {
          courseId: lesson.courseId,
          courseTitle: lesson.courseTitle,
          lessonId: lesson.lessonId,
          lessonTitle: lesson.lessonTitle,
          markdown: lesson.markdown,
          moduleTitle: lesson.moduleTitle,
        }
      );
    }),
  })) as UIMessage[];
}

export const sanitizeChatLessonReferenceParts = (messages: UIMessage[]) =>
  messages.map((message) => ({
    ...message,
    parts: message.parts.map((part) => {
      if (!isLessonSourcePart(part)) return part;

      const metadata = getLessonMetadata(part);
      if (!metadata) return part;

      const { markdown: _markdown, ...safeMetadata } = metadata;
      return {
        ...part,
        providerMetadata: {
          ...part.providerMetadata,
          eduflow: safeMetadata,
        },
      };
    }),
  })) as UIMessage[];

export function convertLessonSourcesToTextParts(messages: UIMessage[]) {
  return messages.map((message) => ({
    ...message,
    parts: message.parts.flatMap((part) => {
      if (!isLessonSourcePart(part)) return [part];

      const metadata = getLessonMetadata(part);
      if (!metadata?.lessonId) return [];

      const textPart: TextUIPart = {
        type: 'text',
        text: formatLessonReferenceForModel({
          courseId: metadata.courseId ?? '',
          courseTitle: metadata.courseTitle ?? 'Unknown course',
          lessonId: metadata.lessonId,
          lessonTitle: metadata.lessonTitle ?? part.title,
          markdown: metadata.markdown,
          moduleTitle: metadata.moduleTitle,
        }),
      };

      return [textPart];
    }),
  })) as UIMessage[];
}

export async function hydrateChatLessonReferenceSummaries({
  messages,
  userId,
}: {
  messages: UIMessage[];
  userId: string;
}) {
  const lessonIds = getLessonIds(messages);
  if (lessonIds.length === 0) return messages;

  const references = await LessonReferenceService.getLessonReferenceSummaries({
    lessonIds,
    userId,
  });

  return mergeLessonReferenceData({ messages, references });
}

export async function hydrateChatLessonReferenceContent({
  messages,
  userId,
}: {
  messages: UIMessage[];
  userId: string;
}) {
  const lessonIds = getLessonIds(messages);
  if (lessonIds.length === 0) return messages;

  const references = await LessonReferenceService.getLessonReferencePayloads({
    lessonIds,
    userId,
  });

  return mergeLessonReferenceData({ messages, references });
}
