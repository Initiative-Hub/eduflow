import type { FileUIPart } from 'ai';
import {
  getFileMetadata,
  isStoredFilePart,
  withChatMetadata,
} from '@/utils/chat-part-metadata';
import { promptFilePartToFile } from '@/utils/chat-prompt-input-files';
import { inventoryService } from './inventory/inventory.service';

export async function uploadChatAttachments(
  files: FileUIPart[],
  chatId: string
): Promise<FileUIPart[]> {
  if (files.length === 0) return [];

  const storedFiles = files.filter(isStoredFilePart);

  const uploadableFiles = files.flatMap((part) => {
    if (isStoredFilePart(part)) return [];

    const file = promptFilePartToFile(part);
    return file ? [{ file, part }] : [];
  });

  let uploadedFiles: FileUIPart[] = [];

  if (uploadableFiles.length > 0) {
    const uploadResponses = await Promise.all(
      uploadableFiles.map(({ file }) =>
        inventoryService.upload({
          file,
          folderPath: ['ai-chats', chatId],
        })
      )
    );
    const entries = uploadResponses.map((response) => response.data);
    const signedResponses = await inventoryService.shareEntries({
      fileIds: entries.map((entry) => entry.id),
    });
    const signedUrlByFileId = new Map(
      signedResponses.data.map((item) => [item.fileId, item.signedUrl])
    );

    uploadedFiles = entries.map((entry, index) => {
      if (!entry.objectKey) {
        throw new Error('Uploaded file is missing an object key.');
      }

      const { file, part } = uploadableFiles[index];
      return withChatMetadata(
        {
          type: 'file',
          mediaType: entry.mimeType || file.type || part.mediaType,
          filename: entry.name || part.filename || file.name,
          url: signedUrlByFileId.get(entry.id) ?? entry.objectKey,
        },
        {
          ...getFileMetadata(part),
          bucket: entry.bucket,
          fileId: entry.id,
          fileSize: entry.fileSize,
          objectKey: entry.objectKey,
          source: 'chat-upload',
        }
      );
    });
  }

  return [...storedFiles, ...uploadedFiles];
}
