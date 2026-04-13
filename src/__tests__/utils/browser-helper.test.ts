import { describe, expect, it } from 'vitest';
import { parseBrowser } from '../../utils/browser-helper';

describe('parseBrowser', () => {
  it('returns Microsoft Edge when the user agent contains Edg/', () => {
    expect(
      parseBrowser(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36 Edg/123.0.0.0'
      )
    ).toBe('Microsoft Edge');
  });

  it('returns Opera when the user agent contains OPR/', () => {
    expect(
      parseBrowser(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 OPR/109.0.0.0'
      )
    ).toBe('Opera');
  });

  it('returns Chrome when the user agent contains Chrome/ and not Chromium', () => {
    expect(
      parseBrowser(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
      )
    ).toBe('Chrome');
  });

  it('returns Firefox when the user agent contains Firefox/', () => {
    expect(
      parseBrowser(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:124.0) Gecko/20100101 Firefox/124.0'
      )
    ).toBe('Firefox');
  });

  it('returns Safari when the user agent contains Safari/ and not Chrome', () => {
    expect(
      parseBrowser(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_4) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15'
      )
    ).toBe('Safari');
  });

  it('returns Chromium when the user agent contains Chromium/', () => {
    expect(
      parseBrowser(
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chromium/123.0.0.0 Safari/537.36'
      )
    ).toBe('Chromium');
  });

  it.each([
    '',
    'UnknownBrowser/1.0',
  ])('returns "unknown" for unsupported input %s', (userAgent) => {
    expect(parseBrowser(userAgent)).toBe('unknown');
  });

  it('prefers Edge over Chrome when both tokens are present', () => {
    expect(
      parseBrowser(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36 Edg/123.0.0.0'
      )
    ).toBe('Microsoft Edge');
  });

  it('prefers Opera over Chrome when both tokens are present', () => {
    expect(
      parseBrowser(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 OPR/109.0.0.0'
      )
    ).toBe('Opera');
  });

  it('does not classify a Chrome user agent as Safari', () => {
    expect(
      parseBrowser(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
      )
    ).toBe('Chrome');
  });

  it('returns Chromium instead of Chrome when Chromium is present', () => {
    expect(
      parseBrowser(
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Chromium/123.0.0.0 Safari/537.36'
      )
    ).toBe('Chromium');
  });
});
