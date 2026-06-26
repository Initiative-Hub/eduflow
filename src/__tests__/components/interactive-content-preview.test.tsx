// @vitest-environment node

import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import InteractiveContentPreview from '@/app/[locale]/(dashboard)/study/_components/interactive-content-preview';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

describe('interactive content preview', () => {
  it('groups preview actions with a semantic fieldset and legend', () => {
    const markup = renderToStaticMarkup(
      <InteractiveContentPreview
        description="Arrange the stages"
        html="<main>Water cycle activity</main>"
        title="Water cycle"
      />
    );

    expect(markup).toContain('<fieldset');
    expect(markup).toContain('<legend class="sr-only">actionsLabel</legend>');
    expect(markup).not.toContain('role="group"');
  });
});
