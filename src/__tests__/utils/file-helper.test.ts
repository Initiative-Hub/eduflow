import { describe, expect, it } from 'vitest';
import {
  ALLOWED_CONTENT_TYPES,
  extensionFromFileName,
  extensionFromMimeType,
  normalizeExtension,
} from '@/utils/file-helper';

describe('file-helper', () => {
  describe('ALLOWED_CONTENT_TYPES', () => {
    it('exposes the supported image content types in the expected order', () => {
      expect(ALLOWED_CONTENT_TYPES).toEqual([
        'image/png',
        'image/jpeg',
        'image/jpg',
        'image/webp',
      ]);
    });
  });

  describe('normalizeExtension', () => {
    it('trims whitespace and lowercases the extension', () => {
      expect(normalizeExtension('  PNG  ')).toBe('png');
    });

    it('converts jpeg to jpg', () => {
      expect(normalizeExtension('jpeg')).toBe('jpg');
    });

    it('strips unsupported characters from the extension', () => {
      expect(normalizeExtension('jp*g!')).toBe('jpg');
    });

    it('falls back to jpg for an empty extension', () => {
      expect(normalizeExtension('   ')).toBe('jpg');
    });

    it('falls back to jpg when the sanitized value becomes empty', () => {
      expect(normalizeExtension('***')).toBe('jpg');
    });
  });

  describe('extensionFromMimeType', () => {
    it('maps PNG to png', () => {
      expect(extensionFromMimeType('image/png')).toBe('png');
    });

    it('maps WEBP to webp', () => {
      expect(extensionFromMimeType('image/webp')).toBe('webp');
    });

    it('falls back to jpg for JPEG variants', () => {
      expect(extensionFromMimeType('image/jpeg')).toBe('jpg');
      expect(extensionFromMimeType('image/jpg')).toBe('jpg');
    });
  });

  describe('extensionFromFileName', () => {
    it('returns null when the file name has no extension', () => {
      expect(extensionFromFileName('avatar')).toBeNull();
    });

    it('uses the last extension segment for multi-dot file names', () => {
      expect(extensionFromFileName('archive.tar.GZ')).toBe('gz');
    });

    it('normalizes the extracted extension', () => {
      expect(extensionFromFileName('profile.JPEG')).toBe('jpg');
    });

    it('falls back to jpg when the file name ends with a dot', () => {
      expect(extensionFromFileName('avatar.')).toBe('jpg');
    });

    it('handles hidden dotfiles by treating the suffix as the extension', () => {
      expect(extensionFromFileName('.env')).toBe('env');
    });
  });
});
