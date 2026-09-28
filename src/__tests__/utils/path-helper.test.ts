import { describe, expect, it } from 'vitest';
import { PUBLIC_PATHS } from '@/constants/common';
import { isPathMatched } from '../../utils/path-helper';

describe('isPathMatched', () => {
  describe('when paths array INCLUDES the root path "/"', () => {
    it('returns true when pathname is exactly "/"', () => {
      expect(isPathMatched('/', ['/', '/api'])).toBe(true);
    });

    it('returns true when pathname matches a path exactly', () => {
      expect(isPathMatched('/api', ['/', '/api'])).toBe(true);
    });

    it('returns true when pathname starts with another path in the array', () => {
      expect(isPathMatched('/api/users', ['/', '/api'])).toBe(true);
    });

    it('returns false when pathname does not match other paths, even if array has "/"', () => {
      expect(isPathMatched('/about', ['/', '/api'])).toBe(false);
    });
  });

  describe('when paths array DOES NOT INCLUDE the root path "/"', () => {
    it('returns false when pathname is "/" but array does not contain "/"', () => {
      expect(isPathMatched('/', ['/dashboard'])).toBe(false);
    });

    it('returns true when pathname matches a path exactly', () => {
      expect(isPathMatched('/dashboard', ['/dashboard'])).toBe(true);
    });

    it('returns true when pathname contains a prefix from the array', () => {
      expect(isPathMatched('/dashboard/settings', ['/dashboard'])).toBe(true);
    });

    it('returns false when pathname does not start with any path in the array', () => {
      expect(isPathMatched('/about', ['/dashboard'])).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('returns false when paths array is empty', () => {
      expect(isPathMatched('/api', [])).toBe(false);
    });

    it('returns false for natural false-positive behavior of startsWith', () => {
      expect(isPathMatched('/api-docs', ['/api'])).toBe(false);
    });
  });

  describe('public application paths', () => {
    it('allows localized guest join and play without exposing dashboard games', () => {
      expect(isPathMatched('/vi', PUBLIC_PATHS)).toBe(true);
      expect(isPathMatched('/games/join', PUBLIC_PATHS)).toBe(true);
      expect(isPathMatched('/vi/games/live/play', PUBLIC_PATHS)).toBe(true);
      expect(isPathMatched('/games/create', PUBLIC_PATHS)).toBe(false);
      expect(isPathMatched('/vi/games/quiz-id/report', PUBLIC_PATHS)).toBe(
        false
      );
    });
    it('treats shared study activity links as public paths', () => {
      expect(
        isPathMatched(
          '/share/study/interactive/132bddea-0927-4b00-992a-e95bab8c53e2',
          PUBLIC_PATHS
        )
      ).toBe(true);
    });
  });
});
