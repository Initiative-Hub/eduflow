interface LessonContentViewProps {
  title: string;
  contentText: string;
}

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
