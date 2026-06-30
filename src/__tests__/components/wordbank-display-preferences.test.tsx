import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { useWordbankDisplayPreferences } from '@/app/[locale]/(dashboard)/english/wordbank/use-wordbank-display-preferences';

const storageKey = 'eduflow:wordbank-display:v1';

function PreferenceProbe() {
  const { preferences } = useWordbankDisplayPreferences();

  return (
    <output>
      {preferences.view}:{String(preferences.practiceMode)}
    </output>
  );
}

describe('useWordbankDisplayPreferences', () => {
  it('uses SSR-safe defaults during render instead of browser storage', () => {
    if (typeof window !== 'undefined' && !window.localStorage) {
      const store = new Map<string, string>();
      Object.defineProperty(window, 'localStorage', {
        value: {
          getItem: (key: string) => store.get(key) ?? null,
          setItem: (key: string, value: string) => store.set(key, value),
          removeItem: (key: string) => store.delete(key),
          clear: () => store.clear(),
        },
        writable: true,
      });
    }

    window.localStorage?.setItem(
      storageKey,
      JSON.stringify({ view: 'list', practiceMode: true })
    );

    const markup = renderToString(<PreferenceProbe />).replace(
      /<!--.*?-->/g,
      ''
    );

    expect(markup).toContain('grid:false');
  });
});
