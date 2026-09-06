'use client';

import { ArrowLeftIcon, ArrowRightIcon, Globe } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { useCallback, useEffect, useState } from 'react';
import {
  InlineCitation,
  InlineCitationCard,
  InlineCitationCardBody,
  InlineCitationCarouselHeader,
} from '@/components/ai-elements/inline-citation';
import { Badge } from '@/components/ui/badge';
import {
  Carousel,
  type CarouselApi,
  CarouselContent,
  CarouselItem,
} from '@/components/ui/carousel';
import { HoverCardTrigger } from '@/components/ui/hover-card';
import {
  type ChatCitationSource,
  getCitationSourceGroup,
} from '@/utils/chat-citations';
import { getHostname } from '@/utils/url-helper';

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
  if (!href) return [];
  if (!href.startsWith('#citation-')) return [];

  const text = getTextContent(children).trim();
  if (!/^\[\d+(?:,\s*\d+)*\]$/.test(text)) return [];

  const sources = getCitationSourceGroup(text, citationSources);
  return sources;
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
  const displayName = getHostname(firstSource.url) ?? firstSource.title;

  return (
    <HoverCardTrigger asChild>
      <Badge
        className="ml-1 rounded-md border-border bg-muted px-1.5 font-mono font-normal text-[10px] text-muted-foreground leading-none hover:bg-muted/80"
        variant="secondary"
      >
        {displayName} {sources.length > 1 && `+${sources.length - 1}`}
      </Badge>
    </HoverCardTrigger>
  );
};

const ChatCitationSourceLogo = ({
  imageLink,
}: {
  imageLink: string | undefined;
}) => (
  <>
    {imageLink ? (
      <Image src={imageLink} alt="" width={12} height={12} unoptimized />
    ) : (
      <Globe />
    )}
  </>
);

const ChatCitationSourceDetails = ({
  source,
}: {
  source: ChatCitationSource;
}) => (
  <div className="flex flex-col gap-1.5">
    <div className="flex items-center gap-1.5 text-muted-foreground text-xs [&>svg]:size-3">
      <ChatCitationSourceLogo imageLink={source.favicon} />
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

const ChatCitationCarousel = ({
  sources,
}: {
  sources: ChatCitationSource[];
}) => {
  const [api, setApi] = useState<CarouselApi>();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const selectedSource = sources[selectedIndex] ?? sources[0];

  const syncSelectedIndex = useCallback(() => {
    if (!api) return;

    setSelectedIndex(api.selectedScrollSnap());
  }, [api]);

  useEffect(() => {
    if (!api) return;

    syncSelectedIndex();
    api.on('select', syncSelectedIndex);
    api.on('reInit', syncSelectedIndex);

    return () => {
      api.off('select', syncSelectedIndex);
      api.off('reInit', syncSelectedIndex);
    };
  }, [api, syncSelectedIndex]);

  const handlePrevious = useCallback(() => {
    setSelectedIndex((currentIndex) => Math.max(currentIndex - 1, 0));
    api?.scrollPrev();
  }, [api]);

  const handleNext = useCallback(() => {
    setSelectedIndex((currentIndex) =>
      Math.min(currentIndex + 1, sources.length - 1)
    );
    api?.scrollNext();
  }, [api, sources.length]);

  return (
    <Carousel className="w-full" setApi={setApi}>
      {sources.length > 1 && (
        <InlineCitationCarouselHeader className="rounded-none border-b bg-popover px-3 py-2">
          <div className="flex items-center gap-1">
            <button
              aria-label="Previous"
              className="inline-flex size-6 items-center justify-center rounded-md transition-colors hover:bg-muted hover:text-foreground [&>svg]:size-3.5"
              onClick={handlePrevious}
              type="button"
            >
              <ArrowLeftIcon className="size-4 text-muted-foreground" />
            </button>
            <div className="flex-none px-1 text-muted-foreground text-xs tabular-nums">
              {selectedIndex + 1}/{sources.length}
            </div>
            <button
              aria-label="Next"
              className="inline-flex size-6 items-center justify-center rounded-md transition-colors hover:bg-muted hover:text-foreground [&>svg]:size-3.5"
              onClick={handleNext}
              type="button"
            >
              <ArrowRightIcon className="size-4 text-muted-foreground" />
            </button>
          </div>
          <div
            className="flex size-5 items-center justify-center rounded-full border bg-background [&>svg]:size-3"
            data-testid="chat-citation-header-logo"
          >
            <ChatCitationSourceLogo imageLink={selectedSource?.favicon} />
          </div>
        </InlineCitationCarouselHeader>
      )}
      <CarouselContent>
        {sources.map((source) => (
          <CarouselItem
            className="flex flex-col gap-2 space-y-0 p-4 pl-8"
            key={source.url}
          >
            <Link
              className="-m-2 block rounded-lg p-2 outline-none hover:bg-muted/60"
              href={source.url}
              rel="noopener noreferrer"
              target="_blank"
            >
              <ChatCitationSourceDetails source={source} />
            </Link>
          </CarouselItem>
        ))}
      </CarouselContent>
    </Carousel>
  );
};

const ChatCitation = ({ sources }: { sources: ChatCitationSource[] }) => (
  <InlineCitation>
    <InlineCitationCard>
      <ChatCitationTrigger sources={sources} />
      <InlineCitationCardBody className="overflow-hidden rounded-xl border bg-popover shadow-lg">
        <ChatCitationCarousel sources={sources} />
      </InlineCitationCardBody>
    </InlineCitationCard>
  </InlineCitation>
);

export const createChatCitationComponents = (
  citationSources: ChatCitationSource[] = []
) => ({
  a: ({ href, children, ...props }: any) => {
    const sources = getCitationSourcesByLink(href, children, citationSources);
    if (sources.length > 0) {
      return <ChatCitation sources={sources} />;
    }

    if (href) {
      const videoId = getYouTubeVideoId(href);

      if (videoId) {
        return (
          <span className="my-4 block aspect-video rounded-xl">
            <iframe
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="h-full w-full"
              src={`https://www.youtube.com/embed/${videoId}`}
              title="YouTube video player"
            />
          </span>
        );
      }
    }

    return (
      <Link
        className="font-medium text-primary underline underline-offset-4"
        href={href}
        rel="noopener noreferrer"
        target="_blank"
        {...props}
      >
        {children}
      </Link>
    );
  },
});
