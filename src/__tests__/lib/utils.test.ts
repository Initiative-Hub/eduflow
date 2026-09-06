import { describe, expect, it } from 'vitest';
import { cn } from '@/lib/utils';

describe('utils', () => {
  describe('cn', () => {
    it('should merge tailwind classes correctly', () => {
      const result = cn('bg-blue-500', 'text-white', { 'font-bold': true });
      expect(result).toBe('bg-blue-500 text-white font-bold');
    });

    it('should handle undefined or null values', () => {
      const result = cn('bg-blue-500', null, undefined, 'text-center');
      expect(result).toBe('bg-blue-500 text-center');
    });
  });
});
