interface LessonContentViewProps {
  title: string;
  contentText: string;
}

/**
 * Read-only view of a lesson — renders the title and parsed content text.
 * Extracted from the lesson detail page to keep the page component lean.
 */
export function LessonContentView({
  title,
  contentText,
}: LessonContentViewProps) {
  return (
    <div className="space-y-8 flex-1">
      <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
      <div className="prose prose-sm md:prose-base dark:prose-invert max-w-none min-h-[400px]">
        {contentText ? (
          <div className="whitespace-pre-wrap">{contentText}</div>
        ) : (
          <p className="text-muted-foreground italic">
            No content has been added to this lesson yet.
          </p>
        )}
      </div>
    </div>
  );
}
