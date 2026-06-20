import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { render, screen } from '@testing-library/react';
import type React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { createChatCitationComponents } from '@/app/[locale]/(dashboard)/_components/chat-citations';

vi.mock('next/image', () => ({
  default: ({ alt, ...props }: React.ImgHTMLAttributes<HTMLImageElement>) => (
    // biome-ignore lint/performance/noImgElement: We want to test that the inline citation component does not use next/image, so we mock it with a simple img element.
    <img alt={alt} {...props} />
  ),
}));

describe('chat citations', () => {
  it('keeps the reusable inline citation component free of app-specific favicon rendering', () => {
    const source = readFileSync(
      join(process.cwd(), 'src/components/ai-elements/inline-citation.tsx'),
      'utf8'
    );

    expect(source).not.toContain("from 'next/image'");
    expect(source).not.toContain('favicon?:');
  });

  it('renders grouped citation triggers from chat markdown source metadata', () => {
    const components = createChatCitationComponents(
      [
        {
          favicon: 'https://example.edu/favicon.ico',
          index: 1,
          title: 'Research Primer',
          url: 'https://example.edu/research',
        },
        {
          index: 2,
          title: 'Learning Science Review',
          url: 'https://journal.example/review',
        },
      ],
      {
        sourceCount: (count) => `${count} sources`,
      }
    );
    const Anchor = components.a;

    render(<Anchor href="#citation-1-2">[1, 2]</Anchor>);

    expect(screen.getByText(/example\.edu/)).toBeInTheDocument();
    expect(
      screen.getByText((content) => content.includes('+1'))
    ).toBeInTheDocument();
  });
});
