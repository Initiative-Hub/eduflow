import type { FileUIPart, UIMessage } from 'ai';
import { StorageService } from '@/services/StorageService';
import {
  getFileMetadata,
  isStoredFilePart,
  withChatMetadata,
} from '@/utils/chat-part-metadata';

type ChatAttachmentUrl = Awaited<
  ReturnType<typeof StorageService.createChatAttachmentUrls>
>[number];

type ChatAttachmentPayload = Awaited<
  ReturnType<typeof StorageService.getChatAttachmentPayloads>
>[number];

export const isChatFilePart = (
  part: UIMessage['parts'][number]
): part is FileUIPart => part.type === 'file';

export const hasChatFileParts = (messages: UIMessage[]) =>
  messages.some((message) => message.parts.some(isChatFilePart));

const getStableObjectKey = (part: FileUIPart) => {
  const metadata = getFileMetadata(part);
  if (metadata.objectKey) return metadata.objectKey;

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
      return withChatMetadata(
        {
          ...part,
          url: objectKey ?? '',
        },
        {
          ...getFileMetadata(part),
          ...(objectKey ? { objectKey } : {}),
        }
      );
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
          const fileId = getFileMetadata(part).fileId;
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
          if (!isChatFilePart(part)) return [];

          const metadata = getFileMetadata(part);
          if (!metadata.fileId) return [];

          return [
            [
              metadata.fileId,
              {
                courseId: metadata.courseId,
                fileId: metadata.fileId,
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
    if (
      messages.some((message) =>
        message.parts.some(
          (part) => isChatFilePart(part) && isStoredFilePart(part)
        )
      )
    ) {
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

      const metadata = getFileMetadata(part);
      const attachment = metadata.fileId
        ? attachmentsByFileId.get(metadata.fileId)
        : undefined;
      if (!attachment) {
        throw new Error('File attachment not found');
      }

      return withChatMetadata(
        {
          ...part,
          filename: attachment.name,
          mediaType: attachment.mimeType ?? part.mediaType,
          url: attachment.signedUrl,
        },
        {
          ...metadata,
          bucket: attachment.bucket,
          fileId: attachment.fileId,
          objectKey: attachment.objectKey,
        }
      );
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
    if (
      messages.some((message) =>
        message.parts.some(
          (part) => isChatFilePart(part) && isStoredFilePart(part)
        )
      )
    ) {
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

      const metadata = getFileMetadata(part);
      const payload = metadata.fileId
        ? payloadsByFileId.get(metadata.fileId)
        : undefined;
      if (!payload) {
        throw new Error('File attachment not found');
      }

      const mediaType = payload.mimeType ?? part.mediaType;
      return withChatMetadata(
        {
          ...part,
          filename: payload.name || part.filename,
          mediaType,
          url: toDataUrl(payload.bytes, mediaType),
        },
        {
          ...metadata,
          fileId: payload.fileId,
          objectKey: payload.objectKey,
        }
      );
    }),
  })) as UIMessage[];
}
