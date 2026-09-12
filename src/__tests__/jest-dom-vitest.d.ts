import type { TestingLibraryMatchers } from '@testing-library/jest-dom/matchers';
import type { ExpectStatic } from 'vitest';

// Temporary Vitest 5 bridge. Remove it after this upstream issue is resolved:
// https://github.com/testing-library/jest-dom/issues/738
type AsymmetricMatcher = ReturnType<ExpectStatic['stringContaining']>;

declare module 'vitest' {
  interface Matchers<R, T>
    extends TestingLibraryMatchers<AsymmetricMatcher, R> {}

  interface AsymmetricMatchersContaining
    extends TestingLibraryMatchers<AsymmetricMatcher, any> {}
}
