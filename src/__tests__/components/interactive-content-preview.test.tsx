// @vitest-environment node

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import InteractiveContentPreview from '@/app/[locale]/(dashboard)/(ai)/study/_components/interactive-content-preview';
import { createInteractiveContentInventoryFile } from '@/utils/study-interactive-content-document';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

const renderPreviewMarkup = (
  props: Partial<React.ComponentProps<typeof InteractiveContentPreview>> = {}
) => {
  const queryClient = new QueryClient();

  return renderToStaticMarkup(
    <QueryClientProvider client={queryClient}>
      <InteractiveContentPreview
        description="Arrange the stages"
        html="<main>Water cycle activity</main>"
        title="Water cycle"
        {...props}
      />
    </QueryClientProvider>
  );
};

describe('interactive content preview', () => {
  it('groups preview actions with a semantic fieldset and legend', () => {
    const markup = renderPreviewMarkup();

    expect(markup).toContain('<fieldset');
    expect(markup).toContain('<legend class="sr-only">actionsLabel</legend>');
    expect(markup).not.toContain('role="group"');
  });

  it('renders an action for saving the generated activity to inventory', () => {
    const markup = renderPreviewMarkup();

    expect(markup).toContain('saveToInventory');
  });

  it('renders compact icon actions with accessible labels', () => {
    const markup = renderPreviewMarkup({
      share: {
        chatId: 'chat-1',
        contentIndex: 0,
        messageId: 'message-1',
      },
    });

    expect(markup).toContain('aria-label="reset"');
    expect(markup).toContain('aria-label="fullscreen"');
    expect(markup).toContain('aria-label="download"');
    expect(markup).toContain('aria-label="share"');
    expect(markup).toContain('aria-label="saveToInventory"');
    expect(markup.match(/cursor-pointer/g)).toHaveLength(5);
    expect(markup).toContain(
      'class="inline-flex size-9 shrink-0 cursor-pointer'
    );
    expect(markup).not.toContain('size-4 cursor-pointer');
    expect(markup).toContain('<span class="sr-only">share</span>');
    expect(markup).not.toContain('<span>share</span>');
  });

  it('prepares the generated activity as an HTML inventory file', async () => {
    const file = createInteractiveContentInventoryFile({
      html: '<main>Water cycle activity</main>',
      title: 'Water cycle',
    });

    expect(file.name).toBe('water-cycle.html');
    expect(file.type).toBe('text/html;charset=utf-8');
    expect(await file.text()).toContain('Water cycle activity');
  });
});
