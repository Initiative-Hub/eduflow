import { Layers } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import type { ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';

// Illustrative samples: the preview labels are not application controls.
export async function PreviewFrame({
  children,
  title,
}: {
  children: ReactNode;
  title: string;
}) {
  const t = await getTranslations('LandingPage.features.preview');
  return (
    <figure className="overflow-hidden rounded-2xl border bg-card shadow-lg shadow-primary/10">
      <figcaption className="flex flex-wrap items-center justify-between gap-2 border-b bg-background/70 px-4 py-3">
        <span className="flex items-center gap-2 font-medium text-foreground text-xs">
          <Layers className="size-3.5 text-primary" aria-hidden="true" />
          {title}
        </span>
        <Badge variant="outline">{t('sample')}</Badge>
      </figcaption>
      <div className="flex min-h-80 flex-col justify-center p-4 sm:min-h-88 sm:p-6">
        {children}
      </div>
    </figure>
  );
}
