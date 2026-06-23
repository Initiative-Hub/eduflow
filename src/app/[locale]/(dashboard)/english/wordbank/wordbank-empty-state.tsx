'use client';

import { BookMarked, LibraryBig } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';

export function WordbankEmptyState({
  hasSavedWords,
}: {
  hasSavedWords: boolean;
}) {
  const t = useTranslations('WordbankPage');

  return (
    <Empty className="min-h-80 border bg-background/70">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <LibraryBig />
        </EmptyMedia>
        <EmptyTitle>
          {hasSavedWords ? t('emptyFilterTitle') : t('emptyTitle')}
        </EmptyTitle>
        <EmptyDescription>
          {hasSavedWords ? t('emptyFilterDescription') : t('emptyDescription')}
        </EmptyDescription>
      </EmptyHeader>
      {hasSavedWords ? null : (
        <EmptyContent>
          <Button asChild>
            <Link href="/english">
              <BookMarked data-icon="inline-start" />
              {t('openEnglishAssistant')}
            </Link>
          </Button>
        </EmptyContent>
      )}
    </Empty>
  );
}
