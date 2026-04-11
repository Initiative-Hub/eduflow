import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const repoRoot = process.cwd();

function readRepoFile(relativePath: string) {
  return readFileSync(join(repoRoot, relativePath), 'utf8');
}

describe('AI SDK integration', () => {
  it('declares the SDK packages used by the chat client and route', () => {
    const packageJson = JSON.parse(readRepoFile('package.json')) as {
      dependencies?: Record<string, string>;
    };

    expect(packageJson.dependencies).toMatchObject({
      '@ai-sdk/google': expect.any(String),
      '@ai-sdk/react': expect.any(String),
      ai: expect.any(String),
    });
  });

  it('uses the AI SDK v6 chat API contracts', () => {
    const aiClientSource = readRepoFile(
      'src/app/[locale]/(dashboard)/_components/ai-client.tsx'
    );
    const chatRouteSource = readRepoFile('src/app/api/chat/route.ts');

    expect(aiClientSource).toContain("from '@ai-sdk/react'");
    expect(aiClientSource).toContain('sendMessage');
    expect(chatRouteSource).toContain('convertToModelMessages');
    expect(chatRouteSource).toContain('toUIMessageStreamResponse');
  });
});
