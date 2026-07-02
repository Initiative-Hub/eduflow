import type { FileUIPart } from 'ai';
import { describe, expect, it } from 'vitest';
import { promptFilePartsToFiles } from '@/utils/chat-prompt-input-files';

describe('prompt input file helpers', () => {
  it('converts AI Elements data URL file parts back to browser Files', () => {
    const parts: FileUIPart[] = [
      {
        filename: 'notes.txt',
        mediaType: 'text/plain',
        type: 'file',
        url: 'data:text/plain;base64,SGVsbG8=',
      },
    ];

    const files = promptFilePartsToFiles(parts);

    expect(files).toHaveLength(1);
    expect(files[0]).toBeInstanceOf(File);
    expect(files[0].name).toBe('notes.txt');
    expect(files[0].type).toBe('text/plain');
    expect(files[0].size).toBe(5);
  });
});
