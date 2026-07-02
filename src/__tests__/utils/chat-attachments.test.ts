import type { FileUIPart, UIMessage } from 'ai';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { StorageService } from '@/services/StorageService';
import {
  hydrateChatAttachmentDataUrls,
  hydrateChatAttachmentUrls,
  sanitizeChatAttachmentUrls,
} from '@/utils/chat-attachments';
import { getFileMetadata, withChatMetadata } from '@/utils/chat-part-metadata';

vi.mock('@/services/StorageService', () => ({
  StorageService: {
    getChatAttachmentPayloads: vi.fn(),
    createChatAttachmentUrls: vi.fn(),
  },
}));

const storageMock = StorageService as unknown as {
  createChatAttachmentUrls: ReturnType<typeof vi.fn>;
  getChatAttachmentPayloads: ReturnType<typeof vi.fn>;
};

const signedFilePart = (): FileUIPart =>
  withChatMetadata(
    {
      filename: 'notes.pdf',
      mediaType: 'application/pdf',
      type: 'file',
      url: 'https://s3.local/eduflow-inventory/users/user-1/file.pdf?X-Amz-Signature=secret',
    },
    {
      bucket: 'eduflow-inventory',
      fileId: 'file-1',
      objectKey: 'users/user-1/file.pdf',
    }
  );

const messageWithSignedFile = (): UIMessage => ({
  id: 'msg-1',
  role: 'user',
  parts: [signedFilePart(), { type: 'text', text: 'Summarize this.' }],
});

describe('chat attachment helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('replaces temporary signed URLs with stable object keys before persistence', () => {
    const sanitized = sanitizeChatAttachmentUrls([messageWithSignedFile()]);
    const serialized = JSON.stringify(sanitized);
    const part = sanitized[0].parts[0] as FileUIPart;

    expect(part).toMatchObject({
      type: 'file',
      url: 'users/user-1/file.pdf',
    });
    expect(getFileMetadata(part)).toMatchObject({
      bucket: 'eduflow-inventory',
      fileId: 'file-1',
      objectKey: 'users/user-1/file.pdf',
    });
    expect(serialized).not.toContain('X-Amz-Signature');
    expect(serialized).not.toContain('data:');
  });

  it('hydrates inventory file parts with fresh signed URLs for a user', async () => {
    storageMock.createChatAttachmentUrls.mockResolvedValueOnce([
      {
        bucket: 'eduflow-inventory',
        fileId: 'file-1',
        mimeType: 'application/pdf',
        name: 'notes.pdf',
        objectKey: 'users/user-1/file.pdf',
        signedUrl: 'https://s3.local/signed/file-1?X-Amz-Signature=fresh',
      },
    ]);

    const hydrated = await hydrateChatAttachmentUrls({
      messages: [messageWithSignedFile()],
      userId: 'user-1',
    });
    const part = hydrated[0].parts[0] as FileUIPart;

    expect(storageMock.createChatAttachmentUrls).toHaveBeenCalledWith({
      fileIds: ['file-1'],
      fileRefs: [{ courseId: undefined, fileId: 'file-1' }],
      userId: 'user-1',
    });
    expect(part).toMatchObject({
      filename: 'notes.pdf',
      mediaType: 'application/pdf',
      type: 'file',
      url: 'https://s3.local/signed/file-1?X-Amz-Signature=fresh',
    });
    expect(getFileMetadata(part)).toMatchObject({
      bucket: 'eduflow-inventory',
      fileId: 'file-1',
      objectKey: 'users/user-1/file.pdf',
    });
  });

  it('rejects file parts that cannot be resolved from the user inventory', async () => {
    storageMock.createChatAttachmentUrls.mockResolvedValueOnce([]);

    await expect(
      hydrateChatAttachmentUrls({
        messages: [messageWithSignedFile()],
        userId: 'user-1',
      })
    ).rejects.toThrow('File attachment not found');
  });

  it('hydrates inventory file parts with data URLs for model calls', async () => {
    const bytes = new Uint8Array([1, 2, 3]);
    storageMock.getChatAttachmentPayloads.mockResolvedValueOnce([
      {
        bytes,
        fileId: 'file-1',
        mimeType: 'application/pdf',
        name: 'notes.pdf',
        objectKey: 'users/user-1/file.pdf',
      },
    ]);

    const dataUrlMessages = await hydrateChatAttachmentDataUrls({
      messages: [messageWithSignedFile()],
      userId: 'user-1',
    });
    const part = dataUrlMessages[0].parts[0] as FileUIPart;

    expect(storageMock.getChatAttachmentPayloads).toHaveBeenCalledWith({
      fileIds: ['file-1'],
      fileRefs: [{ courseId: undefined, fileId: 'file-1' }],
      userId: 'user-1',
    });
    expect(part).toMatchObject({
      filename: 'notes.pdf',
      mediaType: 'application/pdf',
      type: 'file',
      url: 'data:application/pdf;base64,AQID',
    });
    expect(getFileMetadata(part)).toMatchObject({
      fileId: 'file-1',
      objectKey: 'users/user-1/file.pdf',
    });

    const sanitized = sanitizeChatAttachmentUrls(dataUrlMessages);
    const sanitizedPart = sanitized[0].parts[0] as FileUIPart;
    expect(sanitizedPart.url).toBe('users/user-1/file.pdf');
    expect(getFileMetadata(sanitizedPart)).toMatchObject({
      objectKey: 'users/user-1/file.pdf',
    });
  });
});
