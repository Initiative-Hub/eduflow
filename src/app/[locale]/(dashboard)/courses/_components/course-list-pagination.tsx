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

type CourseListPaginationProps = {
  onPageChange: (page: number) => void;
  page: number;
  totalPages: number;
};

export function CourseListPagination({
  onPageChange,
  page,
  totalPages,
}: CourseListPaginationProps) {
  const t = useTranslations('Courses');

  if (totalPages <= 1) {
    return null;
  }

  return (
    <Pagination>
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious
            aria-disabled={page <= 1}
            className={cn(page <= 1 && 'pointer-events-none opacity-50')}
            href="#"
            text={t('pagination.previous')}
            onClick={(event) => {
              event.preventDefault();
              onPageChange(Math.max(1, page - 1));
            }}
          />
        </PaginationItem>
        <PaginationItem>
          <Badge variant="outline" className="h-8 px-3">
            {t('pagination.page', { page, total: totalPages })}
          </Badge>
        </PaginationItem>
        <PaginationItem>
          <PaginationNext
            aria-disabled={page >= totalPages}
            className={cn(
              page >= totalPages && 'pointer-events-none opacity-50'
            )}
            href="#"
            text={t('pagination.next')}
            onClick={(event) => {
              event.preventDefault();
              onPageChange(Math.min(totalPages, page + 1));
            }}
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}
