import type { DataUIPart, TextPart, UIMessage } from 'ai';
import { LessonReferenceService } from '@/services/LessonReferenceService';
import type {
  ChatLessonReferenceData,
  ChatLessonReferenceUIPart,
} from '@/types/chat-lesson-references';

export const isChatLessonReferencePart = (
  part: UIMessage['parts'][number]
): part is ChatLessonReferenceUIPart =>
  part.type === 'data-lesson-reference' &&
  typeof (part as ChatLessonReferenceUIPart).data?.lessonId === 'string';

export const hasChatLessonReferenceParts = (messages: UIMessage[]) =>
  messages.some((message) =>
    message.parts.some((part) => isChatLessonReferencePart(part))
  );

const getLessonIds = (messages: UIMessage[]) =>
  Array.from(
    new Set(
      messages.flatMap((message) =>
        message.parts.flatMap((part) =>
          isChatLessonReferencePart(part) ? [part.data.lessonId] : []
        )
      )
    )
  );

const getLessonDataById = (items: ChatLessonReferenceData[]) => {
  const byLessonId = new Map<string, ChatLessonReferenceData>();

  for (const item of items) {
    byLessonId.set(item.lessonId, item);
  }

  return byLessonId;
};

const formatLessonReferenceForModel = (data: ChatLessonReferenceData) =>
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

// Since AI SDK on server can not handle custom data parts,
// we need to convert lesson reference parts into text parts for the model.
export const convertLessonReferenceDataPart = (
  part: DataUIPart<Record<string, unknown>>
): TextPart | undefined => {
  const lessonPart = part as UIMessage['parts'][number];
  if (!isChatLessonReferencePart(lessonPart)) {
    return undefined;
  }

  return {
    type: 'text',
    text: formatLessonReferenceForModel(lessonPart.data),
  };
};

function mergeLessonReferenceData({
  messages,
  references,
}: {
  messages: UIMessage[];
  references: ChatLessonReferenceData[];
}) {
  const lessonDataById = getLessonDataById(references);

  return messages.map((message) => ({
    ...message,
    parts: message.parts.map((part) => {
      if (!isChatLessonReferencePart(part)) return part;

      const lesson = lessonDataById.get(part.data.lessonId);
      if (!lesson) {
        throw new Error('Lesson reference not found');
      }

      return {
        ...part,
        data: lesson,
      };
    }),
  })) as UIMessage[];
}

export const sanitizeChatLessonReferenceParts = (messages: UIMessage[]) =>
  messages.map((message) => ({
    ...message,
    parts: message.parts.map((part) => {
      if (!isChatLessonReferencePart(part)) return part;

      const { markdown: _markdown, ...data } = part.data;

      return {
        ...part,
        data,
      };
    }),
  }));

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
