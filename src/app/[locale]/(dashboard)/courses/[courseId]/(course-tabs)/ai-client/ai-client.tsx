'use client';

import { useQuery } from '@tanstack/react-query';
import {
  BookOpen,
  Check,
  ChevronLeft,
  FileText,
  Loader2,
  Sparkles,
  Upload,
  User,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';
import { DialogTemplate } from '@/components/custom/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { inventoryService } from '../../../../inventory/inventory.service';
import type { InventoryEntry } from '../../../../inventory/inventory.types';
import { formatFileSize } from '../../../../inventory/inventory.utils';
import { useInventory } from '../../../../inventory/use-inventory';

interface AiClientDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AiClientDialog({ isOpen, onOpenChange }: AiClientDialogProps) {
  const t = useTranslations('Courses.CourseModules.AiDialog');
  const invT = useTranslations('InventoryPage');
  const [activeTab, setActiveTab] = useState('personal');
  const [currentParentId, setCurrentParentId] = useState<string | null>(null);
  const [pathHistory, setPathHistory] = useState<
    { id: string | null; name: string }[]
  >([]);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);

  const { analytics } = useInventory({ maxFileSizeBytes: 100 * 1024 * 1024 });

  const totalUsed = analytics?.totalSizeBytes ?? 0;
  const totalLimit = 2 * 1024 * 1024 * 1024;
  const usagePercentage = Math.min((totalUsed / totalLimit) * 100, 100);

  const { data: personalFiles, isLoading: isLoadingPersonal } = useQuery({
    queryKey: ['ai-assistant', 'personal-files', currentParentId],
    queryFn: () =>
      inventoryService.list({
        parentId: currentParentId,
        limit: 100,
        offset: 0,
      }),
    enabled: isOpen && activeTab === 'personal',
  });

  const handleEntryClick = (entry: InventoryEntry) => {
    if (entry.isFolder) {
      setPathHistory((prev) => [
        ...prev,
        { id: currentParentId, name: entry.name },
      ]);
      setCurrentParentId(entry.id);
    } else if (entry.mimeType === 'application/pdf') {
      setSelectedFileId((prev) => (prev === entry.id ? null : entry.id));
    }
  };

  const handleBack = () => {
    const lastPath = pathHistory[pathHistory.length - 1];
    if (lastPath) {
      setCurrentParentId(lastPath.id);
      setPathHistory((prev) => prev.slice(0, -1));
    } else if (currentParentId !== null) {
      setCurrentParentId(null);
    }
  };

  const currentPathName = useMemo(() => {
    if (pathHistory.length === 0) return t('tabs.personal');
    return pathHistory[pathHistory.length - 1].name;
  }, [pathHistory, t]);

  return (
    <DialogTemplate
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      className="sm:max-w-5xl"
      title={
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <span>{t('title')}</span>
        </div>
      }
      description={t('description')}
      footer={
        <div className="flex w-full items-center justify-between px-1">
          <div className="flex items-center gap-4">
            <div className="flex flex-col gap-1">
              <span className="font-medium text-[10px] text-muted-foreground uppercase tracking-wider">
                {invT('storage.label')}
              </span>
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-32 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full bg-primary transition-all duration-500"
                    style={{ width: `${usagePercentage}%` }}
                  />
                </div>
                <span className="font-medium text-xs">
                  {invT('storage.usage', {
                    used: formatFileSize(totalUsed),
                    total: formatFileSize(totalLimit),
                  })}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-[10px] text-muted-foreground italic">
              {t('comingSoonTitle')}
            </div>
            <Button disabled={!selectedFileId} size="sm">
              <Check className="mr-2 h-4 w-4" />
              {t('useSelected')}
            </Button>
          </div>
        </div>
      }
    >
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="personal" className="gap-2">
            <User className="h-4 w-4" />
            {t('tabs.personal')}
          </TabsTrigger>
          <TabsTrigger value="course" className="gap-2">
            <BookOpen className="h-4 w-4" />
            {t('tabs.course')}
          </TabsTrigger>
          <TabsTrigger value="upload" className="gap-2">
            <Upload className="h-4 w-4" />
            {t('tabs.upload')}
          </TabsTrigger>
        </TabsList>

        <div className="mt-6 min-h-[450px] overflow-hidden rounded-xl border border-dashed bg-muted/30">
          <TabsContent
            value="personal"
            className="mt-0 flex h-[450px] flex-col outline-none"
          >
            <div className="flex items-center justify-between border-b bg-muted/20 px-4 py-2">
              <div className="flex items-center gap-2">
                {(pathHistory.length > 0 || currentParentId !== null) && (
                  <Button variant="ghost" size="icon-sm" onClick={handleBack}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                )}
                <span className="font-medium text-muted-foreground text-sm">
                  {currentPathName}
                </span>
              </div>
              {selectedFileId && (
                <span className="flex items-center gap-1 font-medium text-primary text-xs">
                  <Check className="h-3 w-3" />1 PDF selected
                </span>
              )}
            </div>

            <div className="flex-1 overflow-y-auto">
              {isLoadingPersonal ? (
                <div className="flex h-[380px] flex-col items-center justify-center gap-2 text-muted-foreground">
                  <Loader2 className="h-8 w-8 animate-spin" />
                  <p className="text-sm">Loading your files...</p>
                </div>
              ) : personalFiles?.data.length ? (
                <div className="grid grid-cols-2 gap-4 p-4 lg:grid-cols-3">
                  {personalFiles.data.map((file) => {
                    const isPdf = file.mimeType === 'application/pdf';
                    const isSelected = selectedFileId === file.id;
                    const canClick = file.isFolder || isPdf;

                    return (
                      <div
                        key={file.id}
                        onClick={() => canClick && handleEntryClick(file)}
                        className={cn(
                          'group relative flex items-center gap-3 rounded-lg border bg-background p-3 transition-all',
                          canClick
                            ? 'cursor-pointer hover:border-primary/50 hover:shadow-sm'
                            : 'cursor-not-allowed opacity-50 grayscale',
                          isSelected && 'border-primary ring-1 ring-primary'
                        )}
                      >
                        <div
                          className={cn(
                            'flex h-10 w-10 shrink-0 items-center justify-center rounded bg-primary/5 text-primary transition-colors',
                            canClick &&
                              'group-hover:bg-primary group-hover:text-white',
                            isSelected && 'bg-primary text-white'
                          )}
                        >
                          {file.isFolder ? (
                            <BookOpen className="h-5 w-5" />
                          ) : (
                            <FileText className="h-5 w-5" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1 overflow-hidden">
                          <p className="truncate font-medium text-sm">
                            {file.name}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {file.isFolder
                              ? 'Folder'
                              : formatFileSize(file.fileSize ?? 0)}
                          </p>
                        </div>
                        {isSelected && (
                          <div className="absolute top-2 right-2 rounded-full bg-primary p-0.5 text-white">
                            <Check className="h-3 w-3" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center space-y-4 py-24 text-center">
                  <div className="rounded-full bg-background p-6 shadow-sm ring-1 ring-border/50">
                    <User className="h-10 w-10 text-primary/60" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-semibold text-xl">
                      {t('tabs.personal')}
                    </h3>
                    <p className="mx-auto max-w-[320px] text-muted-foreground text-sm">
                      {t('personalDescription')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 pt-6">
                    <Sparkles className="h-4 w-4 animate-pulse text-primary" />
                    <span className="font-bold text-primary text-xs uppercase tracking-widest">
                      {t('comingSoonTitle')}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="course" className="mt-0 outline-none">
            <div className="flex flex-col items-center justify-center space-y-4 py-24 text-center">
              <div className="rounded-full bg-background p-6 shadow-sm ring-1 ring-border/50">
                <BookOpen className="h-10 w-10 text-primary/60" />
              </div>
              <div className="space-y-1">
                <h3 className="font-semibold text-xl">{t('tabs.course')}</h3>
                <p className="mx-auto max-w-[320px] text-muted-foreground text-sm">
                  {t('courseDescription')}
                </p>
              </div>
              <div className="flex items-center gap-2 pt-6">
                <Sparkles className="h-4 w-4 animate-pulse text-primary" />
                <span className="font-bold text-primary text-xs uppercase tracking-widest">
                  {t('comingSoonTitle')}
                </span>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="upload" className="mt-0 outline-none">
            <div className="flex flex-col items-center justify-center space-y-4 py-24 text-center">
              <div className="rounded-full bg-background p-6 shadow-sm ring-1 ring-border/50">
                <Upload className="h-10 w-10 text-primary/60" />
              </div>
              <div className="space-y-1">
                <h3 className="font-semibold text-xl">{t('tabs.upload')}</h3>
                <p className="mx-auto max-w-[320px] text-muted-foreground text-sm">
                  {t('uploadDescription')}
                </p>
              </div>
              <div className="flex items-center gap-2 pt-6">
                <Sparkles className="h-4 w-4 animate-pulse text-primary" />
                <span className="font-bold text-primary text-xs uppercase tracking-widest">
                  {t('comingSoonTitle')}
                </span>
              </div>
            </div>
          </TabsContent>
        </div>
      </Tabs>
    </DialogTemplate>
  );
}
