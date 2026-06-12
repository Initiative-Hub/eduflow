import type { UIMessage } from 'ai';
import { Globe } from 'lucide-react';
import Image from 'next/image';
import type { ReactNode } from 'react';
import {
  InlineCitation,
  InlineCitationCard,
  InlineCitationCardBody,
  InlineCitationCardTrigger,
  InlineCitationCarousel,
  InlineCitationCarouselContent,
  InlineCitationCarouselHeader,
  InlineCitationCarouselIndex,
  InlineCitationCarouselItem,
  InlineCitationCarouselNext,
  InlineCitationCarouselPrev,
  InlineCitationSource,
} from '@/components/ai-elements/inline-citation';
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

export const createChatMarkdownComponents = (
  citationSources: ChatCitationSource[] = [],
  labels?: ChatMarkdownLabels
) => ({
  a: ({ href, children, ...props }: any) => {
    const sources = getCitationSourcesByLink(href, children, citationSources);
    if (sources) {
      return (
        <InlineCitation>
          <InlineCitationCard>
            <InlineCitationCardTrigger
              sources={sources.map((source) => source.url)}
            />
            <InlineCitationCardBody>
              <InlineCitationCarousel>
                {sources.length > 1 && (
                  <InlineCitationCarouselHeader>
                    <div className="flex items-center gap-1">
                      <InlineCitationCarouselPrev />
                      <InlineCitationCarouselIndex />
                      <InlineCitationCarouselNext />
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
                    <InlineCitationCarouselItem key={source.url}>
                      <a
                        className="-m-2 block rounded-lg p-2 outline-none hover:bg-muted/60"
                        href={source.url}
                        rel="noopener noreferrer"
                        target="_blank"
                      >
                        <InlineCitationSource
                          description={source.description}
                          favicon={source.favicon}
                          title={source.title}
                          url={source.url}
                        />
                      </a>
                    </InlineCitationCarouselItem>
                  ))}
                </InlineCitationCarouselContent>
              </InlineCitationCarousel>
            </InlineCitationCardBody>
          </InlineCitationCard>
        </InlineCitation>
      );
    }

    if (
      href &&
      (href.includes('youtube.com/watch') || href.includes('youtu.be/'))
    ) {
      let videoId = '';
      if (href.includes('youtu.be/')) {
        videoId = href.split('youtu.be/')[1]?.split(/[?#]/)[0];
      } else {
        try {
          videoId = new URL(href).searchParams.get('v') || '';
        } catch {
          videoId = '';
        }
      }

      if (videoId) {
        return (
          <div className="my-4 aspect-video w-full overflow-hidden rounded-xl border bg-muted shadow-sm">
            <iframe
              src={`https://www.youtube.com/embed/${videoId}`}
              title="YouTube video player"
              className="h-full w-full border-0"
              allowFullScreen
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            />
          </div>
        );
      }
    }
    return (
      <a
        href={href}
        {...props}
        target="_blank"
        rel="noopener noreferrer"
        className="font-medium text-primary underline underline-offset-4"
      >
        {children}
      </a>
    );
  },
});

export const ChatToolInvocations = ({
  parts,
}: {
  parts: UIMessage['parts'];
}) => {
  if (!parts) return null;
  const toolParts = parts.filter((part): part is any =>
    part.type.startsWith('tool-')
  );
  if (toolParts.length === 0) return null;

  return (
    <div className="mb-4 flex flex-col gap-2">
      {toolParts.map((tool) => (
        <div
          key={tool.toolCallId}
          className="flex w-fit items-center gap-2 rounded-lg border bg-muted/50 px-3 py-2 text-muted-foreground text-sm"
        >
          <Globe className="h-4 w-4 animate-pulse" />
          {tool.state === 'output-available' ? (
            <span>
              Searched the web for: "{tool.input?.query || 'resources'}"
            </span>
          ) : (
            <span>
              Searching the web for: "{tool.input?.query || 'resources'}"...
            </span>
          )}
        </div>
      ))}
    </div>
  );
};
