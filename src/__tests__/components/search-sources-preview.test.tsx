import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SearchSourcesPreview } from '@/app/[locale]/(dashboard)/courses/[courseId]/(course-tabs)/ai-client/search-sources-preview';
import type { CourseContentSearchSourcesState } from '@/lib/course-content/search-source-state';

const labels = {
  title: 'Found sources',
  web: 'Web',
  youtube: 'YouTube',
  webDescription: 'Current references',
  youtubeDescription: 'Video options',
  searching: 'Searching for sources...',
  empty: 'No sources found yet',
  foundCount: (count: number) =>
    count === 1 ? '1 source' : `${count} sources`,
};

describe('SearchSourcesPreview', () => {
  it('renders two source columns with discovered source cards', () => {
    const sources: CourseContentSearchSourcesState = {
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
        youtube: false,
      },
    };

    render(
      <SearchSourcesPreview
        sources={sources}
        isSearching={false}
        labels={labels}
      />
    );

    expect(screen.getByText('Found sources')).toBeInTheDocument();
    expect(screen.getByText('Web')).toBeInTheDocument();
    expect(screen.getByText('YouTube')).toBeInTheDocument();
    expect(screen.getByText('Reliable source')).toBeInTheDocument();
    expect(screen.getByText('example.edu')).toBeInTheDocument();
  });
});
