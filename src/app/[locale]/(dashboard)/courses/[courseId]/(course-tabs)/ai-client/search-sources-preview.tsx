import { Check, CirclePlay, ExternalLink, Globe } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Spinner } from '@/components/ui/spinner';
import type { CourseContentSearchSourcesState } from '@/lib/course-content/search-source-state';
import { cn } from '@/lib/utils';
import type { CourseContentSearchSourcePreview } from '@/types/course-content-stream-event';
import { getHostname } from '@/utils/url-helper';

export type SearchSourcesPreviewLabels = {
  title: string;
  web: string;
  youtube: string;
  webDescription: string;
  youtubeDescription: string;
  searching: string;
  empty: string;
  foundCount: (count: number) => string;
};

type SearchSourcesPreviewProps = {
  sources: CourseContentSearchSourcesState;
  isSearching: boolean;
  labels: SearchSourcesPreviewLabels;
};

export function SearchSourcesPreview({
  sources,
  isSearching,
  labels,
}: SearchSourcesPreviewProps) {
  const columns = [
    {
      kind: 'web' as const,
      title: labels.web,
      description: labels.webDescription,
      icon: Globe,
      items: sources.web,
      completed: sources.completed.web,
    },
    {
      kind: 'youtube' as const,
      title: labels.youtube,
      description: labels.youtubeDescription,
      icon: CirclePlay,
      items: sources.youtube,
      completed: sources.completed.youtube,
    },
  ];

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <p className="font-medium text-sm">{labels.title}</p>
        <Badge variant="secondary">
          {labels.foundCount(sources.web.length + sources.youtube.length)}
        </Badge>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {columns.map((column) => (
          <SourceColumn
            key={column.kind}
            title={column.title}
            description={column.description}
            icon={column.icon}
            sources={column.items}
            completed={column.completed}
            isSearching={isSearching}
            labels={labels}
          />
        ))}
      </div>
    </div>
  );
}

type SourceColumnProps = {
  title: string;
  description: string;
  icon: typeof Globe;
  sources: CourseContentSearchSourcePreview[];
  completed: boolean;
  isSearching: boolean;
  labels: SearchSourcesPreviewLabels;
};

function SourceColumn({
  title,
  description,
  icon: Icon,
  sources,
  completed,
  isSearching,
  labels,
}: SourceColumnProps) {
  const showSearching = isSearching && !completed;

  return (
    <section className="flex min-h-64 flex-col overflow-hidden rounded-lg border bg-muted/20">
      <div className="flex items-center justify-between gap-3 border-b bg-background/70 px-3 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Icon className="size-4" />
          </div>
          <div className="min-w-0">
            <p className="truncate font-medium text-sm">{title}</p>
            <p className="truncate text-muted-foreground text-xs">
              {description}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Badge variant={completed ? 'secondary' : 'outline'}>
            {labels.foundCount(sources.length)}
          </Badge>
          {showSearching ? (
            <Spinner className="text-primary" />
          ) : completed ? (
            <Check className="size-4 text-primary" />
          ) : null}
        </div>
      </div>
      <ScrollArea className="h-52">
        <div className="flex flex-col gap-2 p-3">
          {sources.length > 0 ? (
            sources.map((source) => (
              <SourceCard key={source.url} source={source} />
            ))
          ) : (
            <div
              className={cn(
                'flex h-36 items-center justify-center rounded-md border border-dashed px-4 text-center text-muted-foreground text-sm',
                showSearching && 'text-foreground'
              )}
            >
              {showSearching ? labels.searching : labels.empty}
            </div>
          )}
        </div>
      </ScrollArea>
    </section>
  );
}

function SourceCard({ source }: { source: CourseContentSearchSourcePreview }) {
  const hostname = getHostname(source.url);

  return (
    <Card size="sm" className="gap-2 py-3">
      <CardHeader className="px-3">
        <CardTitle className="line-clamp-2 text-sm">
          <a
            href={source.url}
            target="_blank"
            rel="noreferrer"
            className="outline-none transition-colors hover:text-primary focus-visible:text-primary"
          >
            {source.title}
          </a>
        </CardTitle>
        <CardDescription className="flex min-w-0 items-center gap-1 text-xs">
          <ExternalLink className="size-3 shrink-0" />
          <span className="truncate">{hostname}</span>
        </CardDescription>
      </CardHeader>
      <CardContent className="px-3">
        <p className="text-muted-foreground text-xs leading-relaxed">
          {source.summary}
        </p>
      </CardContent>
    </Card>
  );
}
