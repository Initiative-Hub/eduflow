import type { UIMessage } from 'ai';
import { Globe } from 'lucide-react';

export const ChatMarkdownComponents = {
  a: ({ href, children, ...props }: any) => {
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
};

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
