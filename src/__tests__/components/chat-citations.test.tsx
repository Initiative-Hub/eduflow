import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { createChatCitationComponents } from '@/app/[locale]/(dashboard)/_components/chat-citations';

vi.mock('next/image', () => ({
  default: ({
    alt,
    unoptimized: _unoptimized,
    ...props
  }: React.ImgHTMLAttributes<HTMLImageElement> & {
    unoptimized?: boolean;
  }) => (
    // biome-ignore lint/performance/noImgElement: We want to test that the inline citation component does not use next/image, so we mock it with a simple img element.
    <img alt={alt} {...props} />
  ),
}));

vi.mock('@/components/ui/carousel', async () => {
  const React = await import('react');

  return {
    Carousel: ({ children, setApi, ...props }: any) => {
      React.useEffect(() => {
        setApi?.({
          off: () => undefined,
          on: () => undefined,
          scrollNext: () => undefined,
          scrollPrev: () => undefined,
          scrollSnapList: () => [],
          selectedScrollSnap: () => 0,
        });
      }, [setApi]);

      return <div {...props}>{children}</div>;
    },
    CarouselContent: (props: any) => <div {...props} />,
    CarouselItem: (props: any) => <div {...props} />,
  };
});

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
    const components = createChatCitationComponents([
      {
        favicon: 'https://example.edu/favicon.ico',
        index: 1,
        title: 'Research Primer',
        url: 'https://www.example.edu/research',
      },
      {
        index: 2,
        title: 'Learning Science Review',
        url: 'https://journal.example/review',
      },
    ]);
    const Anchor = components.a;

    render(<Anchor href="#citation-1-2">[1, 2]</Anchor>);

    expect(
      screen.getByText((content) => content.includes('example.edu'))
    ).toBeInTheDocument();
    expect(
      screen.getByText((content) => content.includes('+1'))
    ).toBeInTheDocument();
    expect(screen.queryByText('Research Primer +1')).not.toBeInTheDocument();
  });

  it('renders citation labels from source URL hostnames', () => {
    const components = createChatCitationComponents([
      {
        index: 1,
        title: 'Thuyết tương đối - Wikipedia tiếng Việt',
        url: 'https://vi.wikipedia.org/wiki/Thuy%E1%BA%BFt_t%C6%B0%C6%A1ng_%C4%91%E1%BB%91i',
      },
    ]);
    const Anchor = components.a;

    render(<Anchor href="#citation-1">[1]</Anchor>);

    expect(screen.getByText('vi.wikipedia.org')).toBeInTheDocument();
  });

  it('updates the carousel header favicon when navigating citation sources', async () => {
    const user = userEvent.setup();
    const components = createChatCitationComponents([
      {
        favicon: 'https://example.edu/favicon.ico',
        index: 1,
        title: 'Research Primer',
        url: 'https://example.edu/research',
      },
      {
        favicon: 'https://journal.example/favicon.ico',
        index: 2,
        title: 'Learning Science Review',
        url: 'https://journal.example/review',
      },
    ]);
    const Anchor = components.a;

    render(<Anchor href="#citation-1-2">[1, 2]</Anchor>);

    await user.hover(
      screen.getByText((content) => content.includes('example.edu'))
    );

    const headerLogo = await screen.findByTestId('chat-citation-header-logo');
    expect(headerLogo.querySelector('img')).toHaveAttribute(
      'src',
      'https://example.edu/favicon.ico'
    );

    await user.click(screen.getByRole('button', { name: 'Next' }));

    await waitFor(() => {
      expect(headerLogo.querySelector('img')).toHaveAttribute(
        'src',
        'https://journal.example/favicon.ico'
      );
    });
  });
});
