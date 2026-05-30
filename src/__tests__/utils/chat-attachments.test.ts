import type { UIMessage } from 'ai';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { StorageService } from '@/services/StorageService';
import type { ChatFileUIPart } from '@/types/chat-attachments';
import {
  hydrateChatAttachmentDataUrls,
  hydrateChatAttachmentUrls,
  sanitizeChatAttachmentUrls,
} from '@/utils/chat-attachments';

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

const messageWithSignedFile = (): UIMessage => ({
  id: 'msg-1',
  role: 'user',
  parts: [
    {
      bucket: 'eduflow-inventory',
      fileId: 'file-1',
      filename: 'notes.pdf',
      mediaType: 'application/pdf',
      objectKey: 'users/user-1/file.pdf',
      type: 'file',
      url: 'https://s3.local/eduflow-inventory/users/user-1/file.pdf?X-Amz-Signature=secret',
    } as ChatFileUIPart,
    { type: 'text', text: 'Summarize this.' },
  ],
});

describe('chat attachment helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('replaces temporary signed URLs with stable object keys before persistence', () => {
    const sanitized = sanitizeChatAttachmentUrls([messageWithSignedFile()]);
    const serialized = JSON.stringify(sanitized);

    expect(sanitized[0].parts[0]).toMatchObject({
      bucket: 'eduflow-inventory',
      fileId: 'file-1',
      objectKey: 'users/user-1/file.pdf',
      type: 'file',
      url: 'users/user-1/file.pdf',
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

    expect(storageMock.createChatAttachmentUrls).toHaveBeenCalledWith({
      fileIds: ['file-1'],
      userId: 'user-1',
    });
    expect(hydrated[0].parts[0]).toMatchObject({
      bucket: 'eduflow-inventory',
      fileId: 'file-1',
      filename: 'notes.pdf',
      mediaType: 'application/pdf',
      objectKey: 'users/user-1/file.pdf',
      type: 'file',
      url: 'https://s3.local/signed/file-1?X-Amz-Signature=fresh',
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

    expect(storageMock.getChatAttachmentPayloads).toHaveBeenCalledWith({
      fileIds: ['file-1'],
      userId: 'user-1',
    });
    expect(dataUrlMessages[0].parts[0]).toMatchObject({
      fileId: 'file-1',
      filename: 'notes.pdf',
      mediaType: 'application/pdf',
      objectKey: 'users/user-1/file.pdf',
      type: 'file',
      url: 'data:application/pdf;base64,AQID',
    });

    const sanitized = sanitizeChatAttachmentUrls(dataUrlMessages);
    expect(sanitized[0].parts[0]).toMatchObject({
      objectKey: 'users/user-1/file.pdf',
      url: 'users/user-1/file.pdf',
    });
  });
});
