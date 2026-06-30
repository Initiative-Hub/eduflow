// @vitest-environment node

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import InteractiveContentPreview, {
  createInteractiveContentInventoryFile,
} from '@/app/[locale]/(dashboard)/study/_components/interactive-content-preview';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

const renderPreviewMarkup = () => {
  const queryClient = new QueryClient();

  return renderToStaticMarkup(
    <QueryClientProvider client={queryClient}>
      <InteractiveContentPreview
        description="Arrange the stages"
        html="<main>Water cycle activity</main>"
        title="Water cycle"
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
