'use client';

import { BookOpen, Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { useDialog } from '@/components/custom/dialog/use-dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { useSession } from '@/lib/auth-client';
import type { CourseListSort } from '../use-courses';
import { useCourses } from '../use-courses';
import { CourseCard } from './course-card';
import { CourseListPagination } from './course-list-pagination';
import { CourseListToolbar } from './course-list-toolbar';
import { CoursesGridSkeleton } from './courses-grid-skeleton';
import { CreateCourseDialog } from './create-course-dialog';

const PAGE_SIZE = 12;
const SEARCH_DEBOUNCE_MS = 300;

export function CoursesPageClient() {
  const t = useTranslations('Courses');
  const { data: sessionData } = useSession();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [ownedOnly, setOwnedOnly] = useState(false);
  const [publicOnly, setPublicOnly] = useState(false);
  const [sort, setSort] = useState<CourseListSort>('updated-desc');
  const [page, setPage] = useState(1);
  const activeFilterCount = Number(ownedOnly) + Number(publicOnly);
  const isFilteredEmpty = Boolean(debouncedSearch || activeFilterCount);
  const {
    courses,
    courseList,
    isLoading,
    isError,
    isCreating,
    handleCreateCourse,
    handleTogglePublish,
  } = useCourses(undefined, {
    listParams: {
      ownedOnly,
      page,
      pageSize: PAGE_SIZE,
      publicOnly,
      search: debouncedSearch,
      sort,
    },
  });
  const dialog = useDialog();

  const canCreateCourses =
    sessionData?.user.role === 'ADMIN' || sessionData?.user.role === 'TEACHER';
  const total = courseList?.total ?? 0;
  const totalPages = Math.max(1, courseList?.totalPages ?? 1);
  const visibleStart = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const visibleEnd = Math.min(page * PAGE_SIZE, total);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);

    return () => window.clearTimeout(timeout);
  }, [search]);

  const handleOwnedOnlyChange = (value: boolean) => {
    setOwnedOnly(value);
    setPage(1);
  };

  const handlePublicOnlyChange = (value: boolean) => {
    setPublicOnly(value);
    setPage(1);
  };

  const handleSortChange = (value: CourseListSort) => {
    setSort(value);
    setPage(1);
  };

  const handleResetFilters = () => {
    setOwnedOnly(false);
    setPublicOnly(false);
    setPage(1);
  };

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-bold text-3xl tracking-tight">{t('title')}</h1>
          <p className="mt-1 text-muted-foreground">{t('description')}</p>
        </div>
        {canCreateCourses ? (
          <Button onClick={() => dialog.open()} className="cursor-pointer">
            <Plus data-icon="inline-start" />
            {t('newCourse')}
          </Button>
        ) : null}
      </div>

      {canCreateCourses ? (
        <CreateCourseDialog
          isOpen={dialog.isOpen}
          onOpenChange={dialog.setIsOpen}
          onSubmit={(data) =>
            handleCreateCourse(data, { onSuccess: () => dialog.close() })
          }
          isLoading={isCreating}
        />
      ) : null}

      <CourseListToolbar
        activeFilterCount={activeFilterCount}
        onOwnedOnlyChange={handleOwnedOnlyChange}
        onPublicOnlyChange={handlePublicOnlyChange}
        onResetFilters={handleResetFilters}
        onSearchChange={setSearch}
        onSortChange={handleSortChange}
        ownedOnly={ownedOnly}
        publicOnly={publicOnly}
        search={search}
        sort={sort}
      />

      {isError ? (
        <Alert variant="destructive">
          <AlertTitle>{t('errors.title')}</AlertTitle>
          <AlertDescription>{t('errors.description')}</AlertDescription>
        </Alert>
      ) : isLoading ? (
        <CoursesGridSkeleton />
      ) : courses.length === 0 ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <BookOpen />
            </EmptyMedia>
            <EmptyTitle>
              {isFilteredEmpty ? t('emptySearch.title') : t('noCourses')}
            </EmptyTitle>
            <EmptyDescription>
              {isFilteredEmpty
                ? t('emptySearch.description')
                : t('noCoursesDescription')}
            </EmptyDescription>
          </EmptyHeader>
          {canCreateCourses && !isFilteredEmpty ? (
            <EmptyContent>
              <Button onClick={() => dialog.open()}>
                {t('createFirstCourse')}
              </Button>
            </EmptyContent>
          ) : null}
        </Empty>
      ) : (
        <>
          <p className="text-muted-foreground text-sm">
            {t('pagination.range', {
              start: visibleStart,
              end: visibleEnd,
              total,
            })}
          </p>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {courses.map((course) => (
              <CourseCard
                key={course.id}
                id={course.id}
                title={course.title}
                description={course.description}
                isPublished={course.isPublished}
                isOwner={Boolean(course.isOwner)}
                modulesCount={course._count?.modules || 0}
                enrollmentsCount={course._count?.enrollments || 0}
                onTogglePublish={handleTogglePublish}
              />
            ))}
          </div>
          <CourseListPagination
            onPageChange={setPage}
            page={page}
            totalPages={totalPages}
          />
        </>
      )}
    </div>
  );
}
