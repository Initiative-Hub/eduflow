import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

const sourceRoot = join(process.cwd(), 'src');
const legacyServicePath = 'services/GoogleDriveIntegrationService.ts';

function getSourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) {
      return getSourceFiles(path);
    }
    return path.endsWith('.ts') || path.endsWith('.tsx') ? [path] : [];
  });
}

describe('Google Drive service boundary', () => {
  it('routes all Drive integration code through the unified google-drive services', () => {
    const legacyImports = getSourceFiles(sourceRoot)
      .filter((path) => !relative(sourceRoot, path).startsWith('__tests__/'))
      .filter((path) => relative(sourceRoot, path) !== legacyServicePath)
      .filter((path) =>
        readFileSync(path, 'utf8').includes(
          '@/services/GoogleDriveIntegrationService'
        )
      )
      .map((path) => relative(sourceRoot, path));

    expect(legacyImports).toEqual([]);
  });
});
