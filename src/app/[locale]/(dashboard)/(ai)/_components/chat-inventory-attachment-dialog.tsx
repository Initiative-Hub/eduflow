'use client';

import { keepPreviousData, useMutation, useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  BookOpen,
  FileIcon,
  FolderOpen,
  Loader2,
  Search,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useDeferredValue, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from '@/components/ui/empty';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { apiClient } from '@/lib/api';
import { cn } from '@/lib/utils';
import type { ChatFileUIPart } from '@/types/chat-attachments';
import { courseFilesService } from '../../courses/[courseId]/(course-tabs)/files/course-files.service';
import { inventoryService } from '../../inventory/inventory.service';
import {
  type InventoryEntry,
  STORAGE_PAGE_SIZE,
} from '../../inventory/inventory.types';
import {
  formatFileSize,
  getEntryTypeLabel,
} from '../../inventory/inventory.utils';

type AttachmentSource = 'personal' | 'course';

type PickerCourse = {
  id: string;
  title: string;
  description: string | null;
  _count?: {
    enrollments?: number;
    modules?: number;
  };
};

type BreadcrumbItem = {
  id: string;
  name: string;
};

type ChatInventoryAttachmentDialogProps = {
  disabledFileIds?: string[];
  maxSelectable: number;
  onAttach: (files: ChatFileUIPart[]) => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  source: AttachmentSource;
};

const DEFAULT_MEDIA_TYPE = 'application/octet-stream';

function toChatFilePart({
  courseId,
  entry,
  signedUrl,
  source,
}: {
  courseId?: string;
  entry: InventoryEntry;
  signedUrl?: string;
  source: AttachmentSource;
}): ChatFileUIPart {
  return {
    bucket: entry.bucket,
    courseId: courseId ?? null,
    fileId: entry.id,
    fileSize: entry.fileSize,
    filename: entry.name,
    mediaType: entry.mimeType ?? DEFAULT_MEDIA_TYPE,
    objectKey: entry.objectKey,
    source,
    type: 'file',
    url: signedUrl ?? entry.objectKey ?? '',
  };
}

function GridSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: 8 }).map((_, index) => (
        <Skeleton key={index} className="aspect-4/3 rounded-lg" />
      ))}
    </div>
  );
}

function PickerTile({
  checked,
  disabled,
  entry,
  isAlreadyAttached,
  onNavigate,
  onToggle,
}: {
  checked: boolean;
  disabled: boolean;
  entry: InventoryEntry;
  isAlreadyAttached: boolean;
  onNavigate: (entry: InventoryEntry) => void;
  onToggle: (entry: InventoryEntry) => void;
}) {
  const t = useTranslations('AIChat.attachmentPicker');
  const isFolder = entry.isFolder;
  const isReadyFile = !entry.isFolder && entry.status === 'READY';

  return (
    <div
      className={cn(
        'group relative min-w-0 rounded-lg border bg-background transition-colors',
        checked && 'border-primary bg-primary/5',
        isReadyFile && !disabled && 'hover:bg-muted/50',
        disabled && !isFolder && 'opacity-60'
      )}
    >
      {!isFolder && (
        <Checkbox
          aria-label={t('selectFile', { name: entry.name })}
          checked={checked}
          className="absolute top-2 right-2 z-10"
          disabled={disabled}
          onCheckedChange={() => onToggle(entry)}
        />
      )}
      <Button
        variant="ghost"
        className="flex aspect-4/3 h-full w-full cursor-pointer flex-col items-start justify-between gap-3 p-3 text-left"
        disabled={!isFolder && disabled}
        onClick={() => {
          if (isFolder) {
            onNavigate(entry);
            return;
          }
          onToggle(entry);
        }}
      >
        <div className="flex size-10 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          {isFolder ? <FolderOpen /> : <FileIcon />}
        </div>
        <div className="w-full space-y-1">
          <div className="line-clamp-2 whitespace-normal font-medium text-sm">
            {entry.name}
          </div>
          <div className="flex flex-wrap items-center gap-1.5 text-muted-foreground text-xs">
            <span>{isFolder ? t('folder') : getEntryTypeLabel(entry)}</span>
            {!isFolder && <span>{formatFileSize(entry.fileSize)}</span>}
          </div>
          {isAlreadyAttached ? (
            <div className="text-muted-foreground text-xs">
              {t('alreadyAttached')}
            </div>
          ) : !isFolder && entry.status !== 'READY' ? (
            <div className="text-muted-foreground text-xs">
              {t('processing')}
            </div>
          ) : null}
        </div>
      </Button>
    </div>
  );
}

function CourseTile({
  course,
  onSelect,
}: {
  course: PickerCourse;
  onSelect: (course: PickerCourse) => void;
}) {
  return (
    <Button
      variant="ghost"
      className="flex aspect-4/3 h-full w-full cursor-pointer flex-col items-start justify-start gap-1 bg-background p-3 text-left"
      onClick={() => onSelect(course)}
    >
      <div className="flex size-10 items-center justify-center rounded-lg bg-muted text-muted-foreground">
        <BookOpen />
      </div>
      <div className="flex flex-1 flex-col justify-between gap-1">
        <div className="line-clamp-2 whitespace-normal font-medium text-sm">
          {course.title}
        </div>
        {course.description ? (
          <div className="line-clamp-2 whitespace-normal text-muted-foreground text-xs">
            {course.description}
          </div>
        ) : null}
      </div>
    </Button>
  );
}

export function ChatInventoryAttachmentDialog({
  disabledFileIds = [],
  maxSelectable,
  onAttach,
  onOpenChange,
  open,
  source,
}: ChatInventoryAttachmentDialogProps) {
  const t = useTranslations('AIChat.attachmentPicker');
  const [search, setSearch] = useState('');
  const [pageIndex, setPageIndex] = useState(0);
  const [folderTrail, setFolderTrail] = useState<BreadcrumbItem[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<PickerCourse | null>(
    null
  );
  const [selectedEntries, setSelectedEntries] = useState<
    Record<string, InventoryEntry>
  >({});
  const deferredSearch = useDeferredValue(search.trim());
  const disabledFileIdSet = useMemo(
    () => new Set(disabledFileIds),
    [disabledFileIds]
  );
  const currentFolderId = folderTrail.at(-1)?.id ?? null;
  const selectedCount = Object.keys(selectedEntries).length;
  const isCourseSource = source === 'course';
  const canBrowseFiles = !isCourseSource || Boolean(selectedCourse);

  const coursesQuery = useQuery({
    queryKey: ['chat-attachment-picker', 'joined-courses'],
    queryFn: () => apiClient.get<PickerCourse[]>('v1/courses/joined'),
    enabled: open && isCourseSource && !selectedCourse,
  });

  const listQuery = useQuery({
    queryKey: [
      'chat-attachment-picker',
      source,
      selectedCourse?.id ?? 'personal',
      currentFolderId ?? 'root',
      deferredSearch,
      pageIndex,
    ],
    queryFn: () =>
      isCourseSource
        ? courseFilesService.list({
            courseId: selectedCourse?.id ?? '',
            parentId: currentFolderId,
            search: deferredSearch || undefined,
            limit: STORAGE_PAGE_SIZE,
            offset: pageIndex * STORAGE_PAGE_SIZE,
          })
        : inventoryService.list({
            parentId: currentFolderId,
            search: deferredSearch || undefined,
            limit: STORAGE_PAGE_SIZE,
            offset: pageIndex * STORAGE_PAGE_SIZE,
          }),
    enabled: open && canBrowseFiles,
    placeholderData: keepPreviousData,
  });

  const entries = listQuery.data?.data ?? [];
  const totalItems = listQuery.data?.pagination.total ?? 0;
  const totalPages = Math.max(
    1,
    Math.ceil(
      totalItems / (listQuery.data?.pagination.limit ?? STORAGE_PAGE_SIZE)
    )
  );
  const breadcrumbItems = [
    {
      id: 'root',
      name: selectedCourse?.title ?? t('root'),
    },
    ...folderTrail,
  ];

  const shareMutation = useMutation({
    mutationFn: async () => {
      const files = Object.values(selectedEntries).filter(
        (entry) => !entry.isFolder
      );
      const fileIds = files.map((entry) => entry.id);
      const response =
        source === 'course'
          ? await courseFilesService.shareEntries(selectedCourse?.id ?? '', {
              fileIds,
            })
          : await inventoryService.shareEntries({ fileIds });
      const signedUrlById = new Map(
        response.data.map((item) => [item.fileId, item.signedUrl])
      );

      return files.map((entry) =>
        toChatFilePart({
          courseId: selectedCourse?.id,
          entry,
          signedUrl: signedUrlById.get(entry.id),
          source,
        })
      );
    },
    onError: () => {
      toast.error(t('attachError'));
    },
    onSuccess: (files) => {
      onAttach(files);
      setSelectedEntries({});
      onOpenChange(false);
    },
  });

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setSelectedEntries({});
    }
    onOpenChange(nextOpen);
  };

  const handleNavigate = (entry: InventoryEntry) => {
    if (!entry.isFolder) return;
    setFolderTrail((current) => [
      ...current,
      { id: entry.id, name: entry.name },
    ]);
    setSearch('');
    setPageIndex(0);
  };

  const handleBreadcrumb = (index: number) => {
    setFolderTrail(index <= 0 ? [] : folderTrail.slice(0, index));
    setSearch('');
    setPageIndex(0);
  };

  const handleToggle = (entry: InventoryEntry) => {
    if (entry.isFolder || entry.status !== 'READY') return;
    if (disabledFileIdSet.has(entry.id)) return;

    setSelectedEntries((current) => {
      if (current[entry.id]) {
        const next = { ...current };
        delete next[entry.id];
        return next;
      }

      if (Object.keys(current).length >= maxSelectable) {
        toast.error(t('tooMany'));
        return current;
      }

      return { ...current, [entry.id]: entry };
    });
  };

  const handleSelectCourse = (course: PickerCourse) => {
    setSelectedCourse(course);
    setFolderTrail([]);
    setSearch('');
    setPageIndex(0);
  };

  const handleBackToCourses = () => {
    setSelectedCourse(null);
    setFolderTrail([]);
    setSearch('');
    setPageIndex(0);
    setSelectedEntries({});
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[min(760px,calc(100vh-2rem))] overflow-hidden sm:max-w-4xl">
        <DialogHeader className="border-b px-5 py-4">
          <DialogTitle>
            {source === 'course' ? t('courseTitle') : t('personalTitle')}
          </DialogTitle>
          <DialogDescription>
            {source === 'course'
              ? t('courseDescription')
              : t('personalDescription')}
          </DialogDescription>
        </DialogHeader>

        <div className="flex min-h-0 flex-col gap-3 px-5">
          {isCourseSource && !selectedCourse ? (
            <div className="py-3">
              <div className="mb-3 text-muted-foreground text-sm">
                {t('courseSelectionDescription')}
              </div>
              {coursesQuery.isLoading ? (
                <GridSkeleton />
              ) : coursesQuery.data?.length ? (
                <ScrollArea className="h-105 pr-3">
                  <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
                    {coursesQuery.data.map((course) => (
                      <CourseTile
                        key={course.id}
                        course={course}
                        onSelect={handleSelectCourse}
                      />
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <Empty>
                  <EmptyHeader>
                    <EmptyTitle>{t('emptyCoursesTitle')}</EmptyTitle>
                    <EmptyDescription>
                      {t('emptyCoursesDescription')}
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              )}
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-3 pt-3 md:flex-row md:items-center">
                {isCourseSource ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleBackToCourses}
                  >
                    <ArrowLeft data-icon="inline-start" />
                    {t('backToCourses')}
                  </Button>
                ) : null}
                <div className="relative min-w-0 flex-1">
                  <Search className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(event) => {
                      setSearch(event.target.value);
                      setPageIndex(0);
                    }}
                    placeholder={t('searchPlaceholder')}
                    className="pl-8"
                  />
                </div>
                <Badge variant="secondary">
                  {t('selectedCount', {
                    count: selectedCount,
                    max: maxSelectable,
                  })}
                </Badge>
              </div>

              <div className="flex min-w-0 flex-wrap items-center gap-1 text-muted-foreground text-sm">
                {breadcrumbItems.map((item, index) => {
                  const isLast = index === breadcrumbItems.length - 1;
                  return (
                    <span
                      key={item.id}
                      className="flex min-w-0 items-center gap-1"
                    >
                      {index > 0 ? <span>/</span> : null}
                      {isLast ? (
                        <span className="max-w-44 truncate text-foreground">
                          {item.name}
                        </span>
                      ) : (
                        <button
                          type="button"
                          className="max-w-44 truncate hover:text-foreground"
                          onClick={() => handleBreadcrumb(index)}
                        >
                          {item.name}
                        </button>
                      )}
                    </span>
                  );
                })}
              </div>

              <ScrollArea className="h-105 pr-3">
                {listQuery.isLoading ? (
                  <GridSkeleton />
                ) : entries.length > 0 ? (
                  <div className="grid grid-cols-2 gap-3 pb-2 md:grid-cols-3 lg:grid-cols-4">
                    {entries.map((entry) => (
                      <PickerTile
                        key={entry.id}
                        checked={Boolean(selectedEntries[entry.id])}
                        disabled={
                          (!entry.isFolder &&
                            (entry.status !== 'READY' ||
                              disabledFileIdSet.has(entry.id))) ||
                          (!selectedEntries[entry.id] &&
                            selectedCount >= maxSelectable)
                        }
                        entry={entry}
                        isAlreadyAttached={disabledFileIdSet.has(entry.id)}
                        onNavigate={handleNavigate}
                        onToggle={handleToggle}
                      />
                    ))}
                  </div>
                ) : (
                  <Empty>
                    <EmptyHeader>
                      <EmptyTitle>{t('emptyTitle')}</EmptyTitle>
                      <EmptyDescription>
                        {t('emptyDescription')}
                      </EmptyDescription>
                    </EmptyHeader>
                  </Empty>
                )}
              </ScrollArea>

              {totalPages > 1 ? (
                <div className="flex items-center justify-between border-t py-3 text-sm">
                  <div className="text-muted-foreground">
                    {t('pageInfo', {
                      page: pageIndex + 1,
                      total: totalPages,
                    })}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={pageIndex === 0}
                      onClick={() => setPageIndex((current) => current - 1)}
                    >
                      {t('previous')}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={pageIndex >= totalPages - 1}
                      onClick={() => setPageIndex((current) => current + 1)}
                    >
                      {t('next')}
                    </Button>
                  </div>
                </div>
              ) : null}
            </>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
          >
            {t('cancel')}
          </Button>
          <Button
            type="button"
            disabled={
              selectedCount === 0 ||
              shareMutation.isPending ||
              (isCourseSource && !selectedCourse)
            }
            onClick={() => shareMutation.mutate()}
          >
            {shareMutation.isPending ? (
              <Loader2 data-icon="inline-start" className="animate-spin" />
            ) : null}
            {shareMutation.isPending
              ? t('attaching')
              : t('attach', { count: selectedCount })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
