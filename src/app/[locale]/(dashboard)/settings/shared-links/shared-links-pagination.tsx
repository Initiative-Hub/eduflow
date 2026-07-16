'use client';

import { useTranslations } from 'next-intl';
import { Badge } from '@/components/ui/badge';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { cn } from '@/lib/utils';

type SharedLinksPaginationProps = {
  isPending: boolean;
  onPageChange: (page: number) => void;
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export function SharedLinksPagination({
  isPending,
  onPageChange,
  page,
  pageSize,
  total,
  totalPages,
}: SharedLinksPaginationProps) {
  const t = useTranslations('AiShareLinks');

  if (totalPages <= 1) return null;

  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);
  const canGoPrevious = page > 1 && !isPending;
  const canGoNext = page < totalPages && !isPending;

  return (
    <div className="flex flex-col gap-3 border-border/60 border-t px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-muted-foreground text-sm">
        {t('pagination.range', { end, start, total })}
      </p>
      <Pagination className="mx-0 w-auto sm:ml-auto">
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              aria-disabled={!canGoPrevious}
              className={cn(!canGoPrevious && 'pointer-events-none opacity-50')}
              href="#"
              text={t('pagination.previous')}
              onClick={(event) => {
                event.preventDefault();
                onPageChange(page - 1);
              }}
            />
          </PaginationItem>
          <PaginationItem>
            <Badge className="h-8 px-3" variant="outline">
              {t('pagination.page', { page, total: totalPages })}
            </Badge>
          </PaginationItem>
          <PaginationItem>
            <PaginationNext
              aria-disabled={!canGoNext}
              className={cn(!canGoNext && 'pointer-events-none opacity-50')}
              href="#"
              text={t('pagination.next')}
              onClick={(event) => {
                event.preventDefault();
                onPageChange(page + 1);
              }}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  );
}
