import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  sanitizeInteractiveContentDocument,
  sanitizeLessonAiHtml,
  sanitizeSvgMarkup,
} from '@/lib/html-sanitizer';

function getSourceFiles(directory: string): string[] {
  if (!existsSync(directory)) return [];

  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    const stats = statSync(path);

    if (stats.isDirectory()) {
      if (entry === '__tests__') return [];
      return getSourceFiles(path);
    }

    return /\.(ts|tsx|js|jsx)$/.test(entry) ? [path] : [];
  });
}

describe('html sanitizer', () => {
  it('keeps first-party source from importing DOMPurify directly', () => {
    const firstPartySource = getSourceFiles(join(process.cwd(), 'src'));
    const directImports = firstPartySource.filter((file) =>
      /from\s+['"]dompurify['"]/.test(readFileSync(file, 'utf8'))
    );

    expect(directImports).toEqual([]);
  });

  it('sanitizes lesson AI fragments with the editor allowlist', () => {
    const sanitized = sanitizeLessonAiHtml(`
      <p onclick="alert(1)">Keep <strong>formatting</strong></p>
      <iframe src="https://evil.test/embed"></iframe>
      <iframe src="https://www.youtube.com/embed/video-id" data-youtube-video></iframe>
      <script>alert(1)</script>
    `);

    expect(sanitized).toContain('<strong>formatting</strong>');
    expect(sanitized).not.toContain('onclick');
    expect(sanitized).not.toContain('<script');
    expect(sanitized).not.toContain('https://evil.test');
    expect(sanitized).toContain('https://www.youtube.com/embed/video-id');
  });

  it('sanitizes sandboxed study documents while preserving inline activity scripts', () => {
    const sanitized = sanitizeInteractiveContentDocument(`
      <!doctype html>
      <html>
        <head>
          <meta http-equiv="Content-Security-Policy" content="default-src *">
          <base href="https://evil.test">
          <link rel="stylesheet" href="https://evil.test/style.css">
          <style>@import "https://evil.test/a.css"; body { background: url(https://evil.test/bg.png); color: red; }</style>
        </head>
        <body>
          <main onclick="alert(1)">
            Activity
            <a href="javascript:alert(1)">bad link</a>
            <img src="https://evil.test/image.png">
            <iframe src="https://evil.test/frame"></iframe>
            <object data="https://evil.test/app"></object>
            <embed src="https://evil.test/app">
            <script src="https://evil.test/app.js">window.bad = true;</script>
            <script>window.good = true;</script>
          </main>
        </body>
      </html>
    `);

    expect(sanitized).toContain('<!doctype html>');
    expect(sanitized).toContain('Content-Security-Policy');
    expect(sanitized.match(/Content-Security-Policy/g)).toHaveLength(1);
    expect(sanitized).toContain('window.good = true;');
    expect(sanitized).toContain('window.bad = true;');
    expect(sanitized).not.toContain('<base');
    expect(sanitized).not.toContain('<link');
    expect(sanitized).not.toContain('<iframe');
    expect(sanitized).not.toContain('<object');
    expect(sanitized).not.toContain('<embed');
    expect(sanitized).not.toContain('onclick');
    expect(sanitized).not.toContain('javascript:');
    expect(sanitized).not.toContain('src="https://evil.test');
    expect(sanitized).not.toContain('@import');
    expect(sanitized).not.toContain('url(https://evil.test');
  });

  it('wraps study fragments as secure documents', () => {
    const sanitized = sanitizeInteractiveContentDocument(
      '```html\n<main><script>init()</script>Practice</main>\n```'
    );

    expect(sanitized).toContain('<html lang="en">');
    expect(sanitized).toContain('<head>');
    expect(sanitized).toContain('<body>');
    expect(sanitized).toContain('<script>init()</script>');
    expect(sanitized).toContain('id="eduflow-responsive-guard"');
  });

  it('sanitizes SVG previews and normalizes root sizing', () => {
    const sanitized = sanitizeSvgMarkup(`
      <svg width="320" height="180" viewBox="0 0 320 180" onload="alert(1)">
        <script>alert(1)</script>
        <foreignObject><div>Bad</div></foreignObject>
        <defs><linearGradient id="grad"><stop offset="0%" stop-color="#fff" /></linearGradient></defs>
        <image href="https://evil.test/image.png" />
        <text fill="url(#grad)">Concept</text>
      </svg>
    `);

    expect(sanitized).toContain('<svg');
    expect(sanitized).toContain('width="100%"');
    expect(sanitized).toContain('height="100%"');
    expect(sanitized).toContain('viewBox="0 0 320 180"');
    expect(sanitized).toContain('Concept');
    expect(sanitized).not.toContain('onload');
    expect(sanitized).not.toContain('<script');
    expect(sanitized).not.toContain('foreignObject');
    expect(sanitized).not.toContain('https://evil.test');
  });
});
