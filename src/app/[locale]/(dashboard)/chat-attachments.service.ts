import type { ChatFileUIPart } from '@/types/chat-attachments';
import { inventoryService } from './inventory/inventory.service';

export async function uploadChatAttachments(
  files: File[],
  chatId: string
): Promise<ChatFileUIPart[]> {
  if (files.length === 0) return [];

  const uploadResponses = await Promise.all(
    files.map((file) =>
      inventoryService.upload({ file, folderPath: ['ai-chats', chatId] })
    )
  );
  const entries = uploadResponses.map((response) => response.data);
  const signedResponses = await inventoryService.shareEntries({
    fileIds: entries.map((entry) => entry.id),
  });
  const signedUrlByFileId = new Map(
    signedResponses.data.map((item) => [item.fileId, item.signedUrl])
  );

  return entries.map((entry, index) => {
    if (!entry.objectKey) {
      throw new Error('Uploaded file is missing an object key.');
    }

    const sourceFile = files[index];
    return {
      bucket: entry.bucket,
      fileId: entry.id,
      fileSize: entry.fileSize,
      filename: entry.name,
      mediaType: entry.mimeType || sourceFile?.type,
      objectKey: entry.objectKey,
      type: 'file',
      url: signedUrlByFileId.get(entry.id) ?? entry.objectKey,
    };
  });
}
