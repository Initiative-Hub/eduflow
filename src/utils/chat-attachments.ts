import type { UIMessage } from 'ai';
import { StorageService } from '@/services/StorageService';
import type { ChatFileUIPart } from '@/types/chat-attachments';

type ChatAttachmentUrl = Awaited<
  ReturnType<typeof StorageService.createChatAttachmentUrls>
>[number];

type ChatAttachmentPayload = Awaited<
  ReturnType<typeof StorageService.getChatAttachmentPayloads>
>[number];

export const isChatFilePart = (
  part: UIMessage['parts'][number]
): part is ChatFileUIPart => part.type === 'file';

export const hasChatFileParts = (messages: UIMessage[]) =>
  messages.some((message) => message.parts.some(isChatFilePart));

const getStableObjectKey = (part: ChatFileUIPart) => {
  const objectKey = part.objectKey;
  if (objectKey) return objectKey;

  if (part.url.startsWith('data:') || /^https?:\/\//i.test(part.url)) {
    return undefined;
  }

  return part.url;
};

export const sanitizeChatAttachmentUrls = (messages: UIMessage[]) =>
  messages.map((message) => ({
    ...message,
    parts: message.parts.map((part) => {
      if (!isChatFilePart(part)) return part;

      const objectKey = getStableObjectKey(part);
      return {
        ...part,
        ...(objectKey ? { objectKey } : {}),
        url: objectKey ?? '',
      };
    }),
  })) as UIMessage[];

const getAttachmentByFileId = (attachments: ChatAttachmentUrl[]) => {
  const byFileId = new Map<string, ChatAttachmentUrl>();

  for (const attachment of attachments) {
    byFileId.set(attachment.fileId, attachment);
  }

  return byFileId;
};

const getPayloadByFileId = (payloads: ChatAttachmentPayload[]) => {
  const byFileId = new Map<string, ChatAttachmentPayload>();

  for (const payload of payloads) {
    byFileId.set(payload.fileId, payload);
  }

  return byFileId;
};

const getFileIds = (messages: UIMessage[]) =>
  Array.from(
    new Set(
      messages.flatMap((message) =>
        message.parts.flatMap((part) => {
          if (!isChatFilePart(part)) return [];
          const fileId = part.fileId;
          return fileId ? [fileId] : [];
        })
      )
    )
  );

const getFileRefs = (messages: UIMessage[]) =>
  Array.from(
    new Map(
      messages.flatMap((message) =>
        message.parts.flatMap((part) => {
          if (!isChatFilePart(part) || !part.fileId) return [];
          return [
            [
              part.fileId,
              {
                courseId: part.courseId,
                fileId: part.fileId,
              },
            ],
          ];
        })
      )
    ).values()
  );

const toDataUrl = (bytes: Uint8Array, mediaType: string) =>
  `data:${mediaType};base64,${Buffer.from(bytes).toString('base64')}`;

export async function hydrateChatAttachmentUrls({
  messages,
  userId,
}: {
  messages: UIMessage[];
  userId: string;
}) {
  const fileIds = getFileIds(messages);
  const fileRefs = getFileRefs(messages);

  if (fileIds.length === 0) {
    if (hasChatFileParts(messages)) {
      throw new Error('File attachment not found');
    }

    return messages;
  }

  const attachments = await StorageService.createChatAttachmentUrls({
    fileIds,
    fileRefs,
    userId,
  });
  const attachmentsByFileId = getAttachmentByFileId(attachments);

  return messages.map((message) => ({
    ...message,
    parts: message.parts.map((part) => {
      if (!isChatFilePart(part)) return part;

      const fileId = part.fileId;
      const attachment = fileId ? attachmentsByFileId.get(fileId) : undefined;
      if (!attachment) {
        throw new Error('File attachment not found');
      }

      return {
        ...part,
        bucket: attachment.bucket,
        fileId: attachment.fileId,
        filename: attachment.name,
        mediaType: attachment.mimeType ?? part.mediaType,
        objectKey: attachment.objectKey,
        url: attachment.signedUrl,
      };
    }),
  })) as UIMessage[];
}

export async function hydrateChatAttachmentDataUrls({
  messages,
  userId,
}: {
  messages: UIMessage[];
  userId: string;
}) {
  const fileIds = getFileIds(messages);
  const fileRefs = getFileRefs(messages);
  if (fileIds.length === 0) {
    if (hasChatFileParts(messages)) {
      throw new Error('File attachment not found');
    }

    return messages;
  }

  const payloads = await StorageService.getChatAttachmentPayloads({
    fileIds,
    fileRefs,
    userId,
  });
  const payloadsByFileId = getPayloadByFileId(payloads);

  return messages.map((message) => ({
    ...message,
    parts: message.parts.map((part) => {
      if (!isChatFilePart(part)) return part;

      const fileId = part.fileId;
      const payload = fileId ? payloadsByFileId.get(fileId) : undefined;
      if (!payload) {
        throw new Error('File attachment not found');
      }

      const mediaType = payload.mimeType ?? part.mediaType;
      return {
        ...part,
        fileId: payload.fileId,
        filename: payload.name || part.filename,
        mediaType,
        objectKey: payload.objectKey,
        url: toDataUrl(payload.bytes, mediaType),
      };
    }),
  })) as UIMessage[];
}
