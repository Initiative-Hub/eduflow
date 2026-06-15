// This file runs once before each test file.
// It imports the jest-dom library which adds custom matchers to vitest's
// expect function, e.g.: expect(element).toBeInTheDocument()
import '@testing-library/jest-dom';

if (!document.elementFromPoint) {
  Object.defineProperty(document, 'elementFromPoint', {
    configurable: true,
    value: () => document.body,
  });
}
