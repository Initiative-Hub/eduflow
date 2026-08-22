// This file runs once before each test file.
// It imports the jest-dom library which adds custom matchers to vitest's
// expect function, e.g.: expect(element).toBeInTheDocument()
import '@testing-library/jest-dom';

if (
  typeof window !== 'undefined' &&
  typeof window.ResizeObserver === 'undefined'
) {
  class ResizeObserverMock {
    observe() {}
    unobserve() {}
    disconnect() {}
  }

  window.ResizeObserver = ResizeObserverMock as typeof window.ResizeObserver;
}

if (typeof document !== 'undefined' && !document.elementFromPoint) {
  Object.defineProperty(document, 'elementFromPoint', {
    configurable: true,
    value: () => document.body,
  });
}

const localStorageDescriptor =
  typeof window !== 'undefined'
    ? Object.getOwnPropertyDescriptor(window, 'localStorage')
    : undefined;

if (
  typeof window !== 'undefined' &&
  (!localStorageDescriptor || localStorageDescriptor.get)
) {
  const storage = new Map<string, string>();

  Object.defineProperty(window, 'localStorage', {
    configurable: true,
    value: {
      clear: () => storage.clear(),
      getItem: (key: string) => storage.get(key) ?? null,
      key: (index: number) => Array.from(storage.keys())[index] ?? null,
      removeItem: (key: string) => storage.delete(key),
      setItem: (key: string, value: string) => storage.set(key, String(value)),
      get length() {
        return storage.size;
      },
    },
  });
}
