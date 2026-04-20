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
    <div className="flex-1 space-y-8">
      <h1 className="font-bold text-3xl tracking-tight">{title}</h1>
      <div className="prose prose-sm md:prose-base dark:prose-invert min-h-100 max-w-none">
        {contentText ? (
          <div className="whitespace-pre-wrap">{contentText}</div>
        ) : (
          <p className="text-muted-foreground italic">{t('empty')}</p>
        )}
      </div>
    </div>
  );
}
