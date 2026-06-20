import { Globe } from 'lucide-react';
import Image from 'next/image';
import type { ReactNode } from 'react';
import {
  InlineCitation,
  InlineCitationCard,
  InlineCitationCardBody,
  InlineCitationCarousel,
  InlineCitationCarouselContent,
  InlineCitationCarouselHeader,
  InlineCitationCarouselIndex,
  InlineCitationCarouselItem,
  InlineCitationCarouselNext,
  InlineCitationCarouselPrev,
} from '@/components/ai-elements/inline-citation';
import { Badge } from '@/components/ui/badge';
import { HoverCardTrigger } from '@/components/ui/hover-card';
import {
  type ChatCitationSource,
  getCitationSourceGroup,
} from '@/utils/chat-citations';

type ChatMarkdownLabels = {
  sourceCount: (count: number) => string;
};

const getTextContent = (children: ReactNode): string => {
  if (typeof children === 'string' || typeof children === 'number') {
    return String(children);
  }

  if (Array.isArray(children)) {
    return children.map(getTextContent).join('');
  }

  return '';
};

const getCitationSourcesByLink = (
  href: string | undefined,
  children: ReactNode,
  citationSources: ChatCitationSource[]
) => {
  if (!href) return undefined;
  if (!href.startsWith('#citation-')) return undefined;

  const text = getTextContent(children).trim();
  if (!/^\[\d+(?:,\s*\d+)*\]$/.test(text)) return undefined;

  const sources = getCitationSourceGroup(text, citationSources);
  return sources.length > 0 ? sources : undefined;
};

const getHostname = (url?: string) => {
  if (!url) return undefined;

  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
};

const getCitationLabel = (source: ChatCitationSource | undefined) => {
  if (!source) return 'unknown';

  try {
    return new URL(source.url).hostname.replace(/^www\./, '');
  } catch {
    const segments = source.url.replace(/^\//, '').split('/');
    return segments.slice(0, 2).join('/');
  }
};

const getYouTubeVideoId = (href: string) => {
  if (href.includes('youtu.be/')) {
    return href.split('youtu.be/')[1]?.split(/[?#]/)[0];
  }

  if (!href.includes('youtube.com/watch')) {
    return '';
  }

  try {
    return new URL(href).searchParams.get('v') || '';
  } catch {
    return '';
  }
};

const ChatCitationTrigger = ({
  sources,
}: {
  sources: ChatCitationSource[];
}) => {
  const firstSource = sources[0];
  const label = getCitationLabel(firstSource);

  return (
    <HoverCardTrigger asChild>
      <Badge
        className="ml-1 rounded-md border-border bg-muted px-1.5 font-mono font-normal text-[10px] text-muted-foreground leading-none hover:bg-muted/80"
        variant="secondary"
      >
        {firstSource ? (
          <>
            {label} {sources.length > 1 && `+${sources.length - 1}`}
          </>
        ) : (
          'unknown'
        )}
      </Badge>
    </HoverCardTrigger>
  );
};

const CitationSourceLogo = ({ source }: { source: ChatCitationSource }) => (
  <span className="flex size-5 items-center justify-center rounded-full border bg-background [&>svg]:size-3">
    {source.favicon ? (
      <Image
        alt=""
        className="size-3 rounded-sm"
        height={12}
        src={source.favicon}
        unoptimized
        width={12}
      />
    ) : (
      <Globe />
    )}
  </span>
);

const ChatCitationSourceDetails = ({
  source,
}: {
  source: ChatCitationSource;
}) => (
  <div className="flex flex-col gap-1.5">
    <div className="flex items-center gap-1.5 text-muted-foreground text-xs [&>svg]:size-3">
      {source.favicon ? (
        <Image
          alt=""
          className="size-3 rounded-sm"
          height={12}
          src={source.favicon}
          unoptimized
          width={12}
        />
      ) : (
        <Globe />
      )}
      <span className="truncate">{getHostname(source.url)}</span>
    </div>
    {source.title && (
      <h4 className="line-clamp-2 font-medium text-foreground text-sm leading-snug">
        {source.title}
      </h4>
    )}
    {source.description && (
      <p className="line-clamp-3 text-muted-foreground text-sm leading-relaxed">
        {source.description}
      </p>
    )}
  </div>
);

const ChatCitation = ({
  labels,
  sources,
}: {
  labels?: ChatMarkdownLabels;
  sources: ChatCitationSource[];
}) => (
  <InlineCitation>
    <InlineCitationCard>
      <ChatCitationTrigger sources={sources} />
      <InlineCitationCardBody className="overflow-hidden rounded-xl border bg-popover shadow-lg">
        <InlineCitationCarousel>
          {sources.length > 1 && (
            <InlineCitationCarouselHeader className="rounded-none border-b bg-popover px-3 py-2">
              <div className="flex items-center gap-1">
                <InlineCitationCarouselPrev className="inline-flex size-6 items-center justify-center rounded-md transition-colors hover:bg-muted hover:text-foreground [&>svg]:size-3.5" />
                <InlineCitationCarouselIndex className="flex-none px-1 tabular-nums" />
                <InlineCitationCarouselNext className="inline-flex size-6 items-center justify-center rounded-md transition-colors hover:bg-muted hover:text-foreground [&>svg]:size-3.5" />
              </div>
              <div className="flex items-center gap-2 text-muted-foreground text-xs">
                <CitationSourceLogo source={sources[0]} />
                <span>
                  {labels?.sourceCount(sources.length) ??
                    String(sources.length)}
                </span>
              </div>
            </InlineCitationCarouselHeader>
          )}
          <InlineCitationCarouselContent>
            {sources.map((source) => (
              <InlineCitationCarouselItem
                className="flex flex-col gap-2 space-y-0"
                key={source.url}
              >
                <a
                  className="-m-2 block rounded-lg p-2 outline-none hover:bg-muted/60"
                  href={source.url}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  <ChatCitationSourceDetails source={source} />
                </a>
              </InlineCitationCarouselItem>
            ))}
          </InlineCitationCarouselContent>
        </InlineCitationCarousel>
      </InlineCitationCardBody>
    </InlineCitationCard>
  </InlineCitation>
);

export const createChatCitationComponents = (
  citationSources: ChatCitationSource[] = [],
  labels?: ChatMarkdownLabels
) => ({
  a: ({ href, children, ...props }: any) => {
    const sources = getCitationSourcesByLink(href, children, citationSources);
    if (sources) {
      return <ChatCitation labels={labels} sources={sources} />;
    }

    if (href) {
      const videoId = getYouTubeVideoId(href);

      if (videoId) {
        return (
          <div className="my-4 aspect-video w-full overflow-hidden rounded-xl border bg-muted shadow-sm">
            <iframe
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="h-full w-full border-0"
              src={`https://www.youtube.com/embed/${videoId}`}
              title="YouTube video player"
            />
          </div>
        );
      }
    }

    return (
      <a
        className="font-medium text-primary underline underline-offset-4"
        href={href}
        rel="noopener noreferrer"
        target="_blank"
        {...props}
      >
        {children}
      </a>
    );
  },
});
