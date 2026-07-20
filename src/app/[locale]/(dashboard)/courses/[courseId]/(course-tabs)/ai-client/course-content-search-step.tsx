import { SkipForward } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import type { CourseContentPipelineStatus } from '@/lib/course-content/pipeline-state';
import type { CourseContentSearchSourcesState } from '@/lib/course-content/search-source-state';
import { SearchSourcesPreview } from './search-sources-preview';

type CourseContentSearchStepProps = {
  sources: CourseContentSearchSourcesState;
  status: CourseContentPipelineStatus;
  isSearching: boolean;
  failureMessage?: string | null;
  isSkipAvailable: boolean;
  isSkipRequested: boolean;
  skipError?: string | null;
  onSkip?: () => Promise<void>;
};

export function CourseContentSearchStep({
  sources,
  status,
  isSearching,
  failureMessage,
  isSkipAvailable,
  isSkipRequested,
  skipError,
  onSkip,
}: CourseContentSearchStepProps) {
  const t = useTranslations('Courses.CourseModules.CourseContentGeneration');

  return (
    <div className="space-y-3">
      <SearchSourcesPreview
        sources={sources}
        isSearching={isSearching}
        labels={{
          title: t('sourcePreview.title'),
          web: t('sourcePreview.web'),
          youtube: t('sourcePreview.youtube'),
          webDescription: t('sourcePreview.webDescription'),
          youtubeDescription: t('sourcePreview.youtubeDescription'),
          searching: t('sourcePreview.searching'),
          empty: t('sourcePreview.empty'),
          foundCount: (count) => t('sourcePreview.foundCount', { count }),
        }}
      />
      {status === 'failed' && (
        <p
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-destructive text-sm"
        >
          {failureMessage ?? t('webSearchFailed')}
        </p>
      )}
      {isSearching && isSkipAvailable && (
        <div className="flex justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="min-h-11 gap-2"
            disabled={isSkipRequested}
            onClick={onSkip}
          >
            <SkipForward className="h-4 w-4" />
            {t('skipWebSearch')}
          </Button>
        </div>
      )}
      {skipError && (
        <p role="alert" className="text-destructive text-sm">
          {t('skipWebSearchFailed')}
        </p>
      )}
    </div>
  );
}
