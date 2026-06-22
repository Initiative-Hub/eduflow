import type { UIMessage } from 'ai';
import { BookOpen, Globe, Search } from 'lucide-react';

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
      {toolParts.map((tool) => {
        const isDone = tool.state === 'output-available';

        if (tool.type === 'tool-getEnrolledCourses') {
          const count =
            isDone && Array.isArray(tool.output?.courses)
              ? tool.output.courses.length
              : 0;
          return (
            <div
              className="flex w-fit items-center gap-2 rounded-lg border bg-muted/50 px-3 py-2 text-muted-foreground text-sm"
              key={tool.toolCallId}
            >
              <BookOpen
                className={`h-4 w-4 ${isDone ? '' : 'animate-pulse'}`}
              />
              {isDone ? (
                <span>{`Loaded ${count} ${count === 1 ? 'course' : 'courses'}`}</span>
              ) : (
                <span>Loading your enrolled courses...</span>
              )}
            </div>
          );
        }

        if (tool.type === 'tool-searchLessonContent') {
          const count =
            isDone && Array.isArray(tool.output?.results)
              ? tool.output.results.length
              : 0;
          const query =
            (tool.state === 'input-available' ||
              tool.state === 'output-available') &&
            tool.input?.query
              ? tool.input.query
              : 'lesson content';
          return (
            <div
              className="flex w-fit items-center gap-2 rounded-lg border bg-muted/50 px-3 py-2 text-muted-foreground text-sm"
              key={tool.toolCallId}
            >
              <Search className={`h-4 w-4 ${isDone ? '' : 'animate-pulse'}`} />
              {isDone ? (
                <span>{`Found ${count} relevant ${count === 1 ? 'section' : 'sections'} for "${query}"`}</span>
              ) : (
                <span>{`Searching lesson content for "${query}"...`}</span>
              )}
            </div>
          );
        }

        return (
          <div
            className="flex w-fit items-center gap-2 rounded-lg border bg-muted/50 px-3 py-2 text-muted-foreground text-sm"
            key={tool.toolCallId}
          >
            <Globe className="h-4 w-4 animate-pulse" />
            {isDone ? (
              <span>
                Searched the web for: "{tool.input?.query || 'resources'}"
              </span>
            ) : (
              <span>
                Searching the web for: "{tool.input?.query || 'resources'}"...
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
};
