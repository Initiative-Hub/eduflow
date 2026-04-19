import { useTranslations } from 'next-intl';

interface LessonContentViewProps {
  title: string;
  contentText: string;
}

export function LessonContentView({
  title,
  contentText,
}: LessonContentViewProps) {
  const t = useTranslations('Courses.LessonView');

  return (
    <div className="space-y-8 flex-1">
      <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
      <div className="prose prose-sm md:prose-base dark:prose-invert max-w-none min-h-[400px]">
        {contentText ? (
          <div className="whitespace-pre-wrap">{contentText}</div>
        ) : (
          <p className="text-muted-foreground italic">{t('empty')}</p>
        )}
      </div>
    </div>
  );
}
