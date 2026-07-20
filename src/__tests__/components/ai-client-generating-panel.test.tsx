import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { AiClientGeneratingPanel } from '@/app/[locale]/(dashboard)/courses/[courseId]/(course-tabs)/ai-client/ai-client-generating-panel';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string, values?: { count?: number }) =>
    key === 'sourcePreview.foundCount' && values?.count !== undefined
      ? `${values.count} sources`
      : key,
}));

const searchSources = {
  web: [
    {
      title: 'Reliable source',
      url: 'https://www.example.edu/reference',
      summary: 'A useful source summary.',
    },
  ],
  youtube: [],
  completed: {
    web: true,
    youtube: true,
  },
};

function renderPanel(
  props: Partial<React.ComponentProps<typeof AiClientGeneratingPanel>> = {}
) {
  return render(
    <AiClientGeneratingPanel
      generationStep="generate"
      lastStartedStep="generate"
      generationError={null}
      courseContentDraft={{
        modules: [
          {
            title: 'AI Fundamentals',
            lessons: [{ lessonTitle: 'Introduction' }],
          },
        ],
      }}
      searchSources={searchSources}
      lastSelection={null}
      onDismiss={vi.fn()}
      {...props}
    />
  );
}

describe('AiClientGeneratingPanel', () => {
  it('lets users review completed search results while content generation continues', async () => {
    const user = userEvent.setup();
    renderPanel();

    const searchStep = screen.getByRole('button', {
      name: 'pipeline.search',
    });
    const generateStep = screen.getByRole('button', {
      name: 'pipeline.generate',
    });

    expect(searchStep).toBeEnabled();
    expect(generateStep).toHaveAttribute('aria-current', 'step');
    expect(screen.getByText(/AI Fundamentals/)).toBeInTheDocument();

    await user.click(searchStep);

    expect(searchStep).toHaveAttribute('aria-current', 'step');
    expect(screen.getByText('Reliable source')).toBeInTheDocument();
    expect(screen.queryByText('viewingStep')).not.toBeInTheDocument();
    expect(generateStep.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('keeps future steps disabled and preserves the viewed step as progress advances', async () => {
    const user = userEvent.setup();
    const view = renderPanel();

    const searchStep = screen.getByRole('button', {
      name: 'pipeline.search',
    });
    const saveStep = screen.getByRole('button', { name: 'pipeline.save' });

    expect(saveStep).toBeDisabled();
    await user.click(searchStep);

    view.rerender(
      <AiClientGeneratingPanel
        generationStep="save"
        lastStartedStep="save"
        generationError={null}
        courseContentDraft={{ modules: [] }}
        searchSources={searchSources}
        lastSelection={null}
        onDismiss={vi.fn()}
      />
    );

    expect(searchStep).toHaveAttribute('aria-current', 'step');
    expect(screen.getByText('Reliable source')).toBeInTheDocument();
    expect(saveStep).toBeEnabled();
  });

  it('returns the viewed step to the live pipeline step after a new run starts', () => {
    const view = renderPanel({
      generationStep: 'search',
      lastStartedStep: 'search',
    });

    expect(
      screen.getByRole('button', { name: 'pipeline.search' })
    ).toHaveAttribute('aria-current', 'step');

    view.rerender(
      <AiClientGeneratingPanel
        generationStep="idle"
        lastStartedStep={null}
        generationError={null}
        courseContentDraft={null}
        searchSources={searchSources}
        lastSelection={null}
        onDismiss={vi.fn()}
      />
    );
    view.rerender(
      <AiClientGeneratingPanel
        generationStep="extract"
        lastStartedStep="extract"
        generationError={null}
        courseContentDraft={null}
        searchSources={searchSources}
        lastSelection={null}
        onDismiss={vi.fn()}
      />
    );

    expect(
      screen.getByRole('button', { name: 'pipeline.extract' })
    ).toHaveAttribute('aria-current', 'step');
  });
});
