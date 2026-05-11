import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';
import {
  AIPreferencesCard,
  type AIPreferencesData,
} from '@/app/[locale]/(dashboard)/profile/ai-preferences-card';

vi.mock('next-intl', () => ({
  useLocale: () => 'en',
  useTranslations: () => (key: string) => key,
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    refresh: vi.fn(),
  }),
}));

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

vi.stubGlobal('ResizeObserver', ResizeObserverMock);

function renderCard(preferences: AIPreferencesData, onChange = vi.fn()) {
  const queryClient = new QueryClient();
  return {
    queryClient,
    ...render(
      <QueryClientProvider client={queryClient}>
        <AIPreferencesCard preferences={preferences} onChange={onChange} />
      </QueryClientProvider>
    ),
  };
}

function renderWithClient(
  queryClient: QueryClient,
  preferences: AIPreferencesData,
  onChange = vi.fn()
) {
  return (
    <QueryClientProvider client={queryClient}>
      <AIPreferencesCard preferences={preferences} onChange={onChange} />
    </QueryClientProvider>
  );
}

describe('AIPreferencesCard', () => {
  it('syncs local state when preferences prop changes', () => {
    const initialPreferences: AIPreferencesData = {
      interactionStyle: 'friendly',
      responseTone: 'balanced',
      primaryLanguage: 'en',
      quizScoreAlerts: true,
      insightFeedback: false,
    };
    const updatedPreferences: AIPreferencesData = {
      interactionStyle: 'technical',
      responseTone: 'direct',
      primaryLanguage: 'vi',
      quizScoreAlerts: false,
      insightFeedback: true,
    };

    const { queryClient, rerender } = renderCard(initialPreferences);

    expect(
      screen.getByRole('button', { name: 'interactionStyle.friendly' })
    ).toHaveClass('border-primary');

    rerender(renderWithClient(queryClient, updatedPreferences));

    expect(
      screen.getByRole('button', { name: 'interactionStyle.technical' })
    ).toHaveClass('border-primary');
  });
});
