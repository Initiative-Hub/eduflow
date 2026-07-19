import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const routeFilePath = path.join(
  process.cwd(),
  'src/app/api/v1/slides/render-slide/route.ts'
);

describe('slides render route wrapper', () => {
  it('defines route segment config locally instead of re-exporting it', () => {
    const source = readFileSync(routeFilePath, 'utf8');

    expect(source).toMatch(/export const dynamic = ['"]force-dynamic['"];/);
    expect(source).toMatch(/export const maxDuration = 60;/);
    expect(source).not.toMatch(/export\s*\{[^}]*\bdynamic\b[^}]*\}\s*from/);
    expect(source).not.toMatch(/export\s*\{[^}]*\bmaxDuration\b[^}]*\}\s*from/);
  });
});
