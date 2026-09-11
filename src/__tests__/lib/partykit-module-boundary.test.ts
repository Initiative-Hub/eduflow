import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const partyDirectory = path.join(process.cwd(), 'party');
const forbiddenImport = /from\s+['\"][^'\"]*(?:\.\.\/src\/|@\/)/;

describe('PartyKit module boundary', () => {
  it('does not import Next.js application modules', async () => {
    const files = (await readdir(partyDirectory)).filter((file) =>
      file.endsWith('.ts')
    );
    const sources = await Promise.all(
      files.map(async (file) => ({
        file,
        source: await readFile(path.join(partyDirectory, file), 'utf8'),
      }))
    );

    expect(
      sources.filter(({ source }) => forbiddenImport.test(source))
    ).toEqual([]);
  });
});
